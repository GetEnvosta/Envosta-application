/**
 * Envosta Twilio Relay — Cloud Run WebSocket Server
 *
 * Handles Twilio ConversationRelay WebSocket connections for the AI Receptionist.
 * Receives transcribed speech from Twilio (via Deepgram), sends to Claude,
 * returns text for Twilio's TTS (Google) to speak back.
 *
 * Deployed on Cloud Run for long-running WebSocket support (up to 6 min calls).
 * The Supabase Edge Function `twilio-voice` points ConversationRelay here.
 *
 * Env vars (set in Cloud Run):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */

const http = require("http");
const { WebSocketServer } = require("ws");
const { createClient } = require("@supabase/supabase-js");

// ── Config ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "8080", 10);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const MODEL = "claude-haiku-3-5-20241022"; // Fast model for voice latency

function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ── HTTP Server + WebSocket ─────────────────────────────────
const server = http.createServer((req, res) => {
  // Health check for Cloud Run
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "envosta-twilio-relay" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket, req) => {
  console.log("ConversationRelay WebSocket connected from", req.socket.remoteAddress);

  // ── Per-call state ──
  let siteId = "";
  let userId = "";
  let callerNumber = "";
  let callSid = "";
  let systemPrompt = "";
  let messages = []; // { role, content }[]
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let startTime = Date.now();
  let maxCallMs = 6 * 60 * 1000; // 6 min default
  let ended = false;

  socket.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      switch (data.type) {
        case "setup": {
          const params = data.customParameters || {};
          let ctx = {};
          try {
            ctx = typeof params.context === "string" ? JSON.parse(params.context) : params;
          } catch {
            ctx = params;
          }

          siteId = ctx.siteId || "";
          userId = ctx.userId || "";
          callerNumber = data.from || ctx.callerNumber || "";
          callSid = data.callSid || ctx.callSid || "";
          const phoneNumberId = ctx.phoneNumberId || "";
          startTime = Date.now();

          console.log("Setup:", { siteId, userId, callerNumber, callSid, phoneNumberId });

          const sb = supabaseAdmin();

          // Load config: phone_numbers table first, then site as fallback
          let config = {};
          let siteLabel = "";
          let siteDomain = "";

          // Load user's business info as base defaults
          let businessDefaults = {};
          if (userId) {
            const { data: userRec } = await sb
              .from("users")
              .select("metadata")
              .eq("id", userId)
              .single();
            businessDefaults = userRec?.metadata?.business || {};
          }

          if (phoneNumberId) {
            const { data: phoneRec } = await sb
              .from("phone_numbers")
              .select("config, sites(label, domain_name, receptionist_config)")
              .eq("id", phoneNumberId)
              .single();

            const phoneConfig = phoneRec?.config || {};
            const linkedSite = phoneRec?.sites || null;
            const siteConfig = linkedSite?.receptionist_config || {};
            // business defaults < site config < phone config
            config = { ...businessDefaults, ...siteConfig, ...phoneConfig };
            siteLabel = linkedSite?.label || "";
            siteDomain = linkedSite?.domain_name || businessDefaults.website || "";
          } else if (siteId) {
            // Legacy fallback: load from sites table
            const { data: site } = await sb
              .from("sites")
              .select("label, domain_name, receptionist_config")
              .eq("id", siteId)
              .single();
            config = { ...businessDefaults, ...(site?.receptionist_config || {}) };
            siteLabel = site?.label || "";
            siteDomain = site?.domain_name || businessDefaults.website || "";
          } else {
            config = { ...businessDefaults };
          }

          maxCallMs = (config.max_call_minutes || 6) * 60 * 1000;

          // Load Google Calendar availability if connected
          let calendarContext = null;
          if (userId) {
            calendarContext = await getCalendarAvailability(sb, userId, config);
          }

          systemPrompt = buildSystemPrompt(config, siteLabel, siteDomain, calendarContext);
          break;
        }

        case "prompt": {
          const utterance = data.voicePrompt || "";
          if (!utterance.trim()) break;

          // Check call duration limit
          if (Date.now() - startTime > maxCallMs) {
            sendText(socket, "I appreciate the conversation, but I need to let you go. Feel free to call back anytime. Goodbye!");
            sendEnd(socket);
            break;
          }

          messages.push({ role: "user", content: utterance });

          const response = await callClaude(systemPrompt, messages);
          if (response) {
            messages.push({ role: "assistant", content: response.text });
            totalInputTokens += response.input_tokens;
            totalOutputTokens += response.output_tokens;
            sendText(socket, response.text);
          }
          break;
        }

        case "dtmf": {
          const digit = data.digit || "";
          if (digit === "0") {
            sendText(socket, "Let me connect you with someone. One moment please.");
          }
          break;
        }

        case "interrupt":
          // Caller interrupted — that's fine
          break;

        case "error":
          console.error("ConversationRelay error:", data);
          break;
      }
    } catch (e) {
      console.error("WebSocket message error:", e);
    }
  });

  socket.on("close", async () => {
    if (ended) return;
    ended = true;

    const durationMs = Date.now() - startTime;
    const durationSeconds = Math.ceil(durationMs / 1000);
    const durationMinutes = Math.ceil(durationMs / 60000);

    console.log("Call ended:", { callSid, durationSeconds, totalInputTokens, totalOutputTokens });

    try {
      const sb = supabaseAdmin();

      // Look up credit rates
      const { data: rates } = await sb
        .from("products")
        .select("metadata")
        .eq("type", "credit_rate")
        .in("slug", ["twilio_receptionist-per_minute", "ai_tokens-per_1k_tokens"]);

      let perMinuteRate = 2;
      let aiTokenRate = 0.5;
      for (const r of rates || []) {
        const m = r.metadata || {};
        if (m.metric === "per_minute" && m.service_type === "twilio_receptionist") perMinuteRate = Number(m.credits_per_unit);
        if (m.metric === "per_1k_tokens") aiTokenRate = Number(m.credits_per_unit);
      }

      const totalTokens = totalInputTokens + totalOutputTokens;
      const callCredits = Math.ceil(durationMinutes * perMinuteRate);
      const aiCredits = Math.ceil((totalTokens / 1000) * aiTokenRate);
      const totalCredits = callCredits + aiCredits;

      // Deduct credits
      if (userId && totalCredits > 0) {
        if (totalCredits <= 50) {
          await sb.rpc("fn_deduct_credits", {
            p_user_id: userId,
            p_amount: totalCredits,
            p_service_type: "twilio_receptionist",
            p_description: `AI receptionist call: ${durationMinutes}min, ${totalTokens} tokens`,
            p_reference_id: siteId || null,
          });
        } else {
          let remaining = totalCredits;
          let chunk = 1;
          while (remaining > 0) {
            const amount = Math.min(remaining, 50);
            await sb.rpc("fn_deduct_credits", {
              p_user_id: userId,
              p_amount: amount,
              p_service_type: "twilio_receptionist",
              p_description: `AI receptionist call (${chunk}): ${durationMinutes}min`,
              p_reference_id: siteId || null,
            });
            remaining -= amount;
            chunk++;
          }
        }
      }

      // Build transcript
      const transcript = messages.map((m, i) => ({
        speaker: m.role === "user" ? "caller" : "ai",
        text: m.content,
        index: i,
      }));

      // Log the call
      await sb.from("logs").insert({
        user_id: userId || null,
        site_id: siteId || null,
        action: "receptionist.call",
        details: `Call from ${callerNumber}: ${durationMinutes}min, ${totalCredits} credits`,
        level: "info",
        metadata: {
          call_sid: callSid,
          caller_number: callerNumber,
          duration_seconds: durationSeconds,
          duration_minutes: durationMinutes,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          total_tokens: totalTokens,
          call_credits: callCredits,
          ai_credits: aiCredits,
          credits_charged: totalCredits,
          transcript,
          model: MODEL,
        },
      });

      // Also log AI usage
      await sb.from("logs").insert({
        user_id: userId || null,
        site_id: siteId || null,
        action: "ai.usage",
        details: `receptionist_call: ${totalTokens} tokens`,
        level: "info",
        metadata: {
          ai_action: "receptionist_call",
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          total_tokens: totalTokens,
          credits_charged: aiCredits,
          model: MODEL,
        },
      });
    } catch (e) {
      console.error("Call end processing error:", e);
    }
  });

  socket.on("error", (e) => {
    console.error("WebSocket error:", e);
  });
});

// ── Helpers ─────────────────────────────────────────────────

function sendText(socket, text) {
  if (socket.readyState === 1) { // WebSocket.OPEN
    socket.send(JSON.stringify({ type: "text", token: text }));
  }
}

function sendEnd(socket) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({ type: "end" }));
  }
}

function buildSystemPrompt(config, siteLabel, domain, calendarContext) {
  // config.name = business profile field; config.business_name = receptionist_config field
  const businessName = config.business_name || config.name || siteLabel || "our business";
  const businessHours = config.business_hours;
  const services = config.services_offered || config.services;
  const address = [config.address, config.city, config.province].filter(Boolean).join(", ");

  const parts = [
    `You are a friendly, professional AI receptionist for ${businessName}.`,
    `You answer phone calls on behalf of the business. Be warm, concise, and helpful.`,
    `Keep responses under 3 sentences — you're speaking on a phone call, not writing an essay.`,
    `Never fabricate specific information like prices, availability, or staff names unless provided below.`,
    `If you don't know something, offer to take a message or suggest the caller visit the website.`,
  ];

  if (domain) parts.push(`Website: ${domain}`);
  if (businessHours) parts.push(`Business hours: ${businessHours}`);
  if (services) parts.push(`Services offered: ${services}`);
  if (address) parts.push(`Location: ${address}`);
  if (config.description) parts.push(`About the business: ${config.description}`);
  if (config.booking_instructions) parts.push(`Booking instructions: ${config.booking_instructions}`);
  if (config.custom_prompt) parts.push(`Additional instructions: ${config.custom_prompt}`);

  // Inject real-time calendar availability
  if (calendarContext) {
    parts.push(
      `\n--- LIVE CALENDAR AVAILABILITY ---`,
      calendarContext,
      `If the caller wants to book an appointment, offer them one of these available times.`,
      `Confirm the caller's name and phone number when booking.`,
      `--- END AVAILABILITY ---`,
    );
  } else {
    parts.push(`If the caller wants to book an appointment, let them know someone will follow up to confirm a time.`);
  }

  parts.push(
    `If the caller wants to leave a message, collect their name, phone number, and a brief message.`,
    `Be conversational and natural — sound like a real person, not a robot.`,
    `If the caller says goodbye, respond warmly and end the conversation.`,
  );

  return parts.join("\n");
}

/**
 * Fetch Google Calendar free/busy for the user and format for the AI.
 * Returns a human-readable availability string, or null if not connected.
 */
async function getCalendarAvailability(sb, userId, config) {
  try {
    // Check if user has an active Google Calendar integration
    const { data: integration } = await sb
      .from("user_integrations")
      .select("id, credentials_vault_id, expires_at, connection_config, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("enabled", true)
      .is("deleted_at", null)
      .maybeSingle(); // get first google_calendar integration

    if (!integration?.credentials_vault_id) return null;

    // Read credentials from Vault
    const { data: secretData, error: secretErr } = await sb.rpc("get_integration_secret", {
      p_id: integration.credentials_vault_id,
    });
    if (secretErr || !secretData) return null;

    let tokens;
    try { tokens = JSON.parse(secretData); } catch { return null; }

    // Refresh token if expired (with 60s buffer)
    let accessToken = tokens.access_token;
    if (tokens.expires_at && Date.now() > tokens.expires_at - 60000) {
      if (!tokens.refresh_token) return null;
      try {
        const refreshed = await refreshGoogleToken(tokens.refresh_token);
        accessToken = refreshed.access_token;
        const newTokens = { ...tokens, access_token: refreshed.access_token, expires_at: refreshed.expires_at };
        // Update vault + DB (fire and forget)
        sb.rpc("update_integration_secret", {
          p_id: integration.credentials_vault_id,
          p_secret: JSON.stringify(newTokens),
          p_name: `integration-${userId}-google_calendar`,
        }).catch(() => {});
        sb.from("user_integrations").update({
          expires_at: new Date(refreshed.expires_at).toISOString(),
          last_refresh_at: new Date().toISOString(),
          refresh_attempts: 0,
        }).eq("id", integration.id).catch(() => {});
      } catch (err) {
        console.error("Token refresh failed:", err.message);
        sb.from("user_integrations").update({
          status: "needs_reauth",
          last_error_code: "refresh_failed",
          last_error_at: new Date().toISOString(),
        }).eq("id", integration.id).catch(() => {});
        return null;
      }
    }

    const calendarId = integration.connection_config?.selected_calendar_id || "primary";

    // Fetch free/busy for next 7 days
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const fbRes = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: calendarId }],
      }),
    });

    if (!fbRes.ok) return null;
    const fbData = await fbRes.json();
    const busySlots = fbData.calendars?.[calendarId]?.busy ?? [];

    // Update last_used_at
    sb.from("user_integrations").update({ last_used_at: new Date().toISOString() })
      .eq("id", integration.id).catch(() => {});

    // Format availability
    return formatAvailability(busySlots, config);
  } catch (err) {
    console.error("getCalendarAvailability error:", err.message);
    return null;
  }
}

async function refreshGoogleToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error_description || data.error);
  return { access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
}

function formatAvailability(busySlots, config) {
  const hoursStart = config.availability_start_hour || 9;
  const hoursEnd = config.availability_end_hour || 17;
  const now = new Date();
  const days = {};

  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    const label = date.toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" });
    const slots = [];

    for (let h = hoursStart; h < hoursEnd; h++) {
      for (const min of [0, 30]) {
        const slotStart = new Date(date);
        slotStart.setHours(h, min, 0, 0);
        if (slotStart < now) continue;

        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
        const busy = busySlots.some(b => {
          const bs = new Date(b.start), be = new Date(b.end);
          return slotStart < be && slotEnd > bs;
        });
        if (!busy) {
          slots.push(slotStart.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", hour12: true }));
        }
      }
    }
    if (slots.length > 0) days[label] = slots;
  }

  const lines = Object.entries(days).slice(0, 4).map(([day, s]) => `${day}: ${s.join(", ")}`);
  if (lines.length === 0) return "No available appointment slots in the next week.";
  return `Available appointment slots:\n${lines.join("\n")}`;
}

async function callClaude(systemPrompt, messages) {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 150,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      console.error("Claude API error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return {
      text: data?.content?.[0]?.text || "",
      input_tokens: data?.usage?.input_tokens || 0,
      output_tokens: data?.usage?.output_tokens || 0,
    };
  } catch (e) {
    console.error("Claude call error:", e);
    return null;
  }
}

// ── Start ───────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Envosta Twilio Relay listening on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://0.0.0.0:${PORT}/ws`);
  console.log(`Health check: http://0.0.0.0:${PORT}/health`);
});
