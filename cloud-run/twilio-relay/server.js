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

          if (phoneNumberId) {
            const { data: phoneRec } = await sb
              .from("phone_numbers")
              .select("config, sites(label, domain_name, receptionist_config)")
              .eq("id", phoneNumberId)
              .single();

            const phoneConfig = phoneRec?.config || {};
            const linkedSite = phoneRec?.sites || null;
            const siteConfig = linkedSite?.receptionist_config || {};
            config = { ...siteConfig, ...phoneConfig }; // phone overrides site
            siteLabel = linkedSite?.label || "";
            siteDomain = linkedSite?.domain_name || "";
          } else if (siteId) {
            // Legacy fallback: load from sites table
            const { data: site } = await sb
              .from("sites")
              .select("label, domain_name, receptionist_config")
              .eq("id", siteId)
              .single();
            config = site?.receptionist_config || {};
            siteLabel = site?.label || "";
            siteDomain = site?.domain_name || "";
          }

          maxCallMs = (config.max_call_minutes || 6) * 60 * 1000;
          systemPrompt = buildSystemPrompt(config, siteLabel, siteDomain);
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

function buildSystemPrompt(config, siteLabel, domain) {
  const businessName = config.business_name || siteLabel || "our business";
  const parts = [
    `You are a friendly, professional AI receptionist for ${businessName}.`,
    `You answer phone calls on behalf of the business. Be warm, concise, and helpful.`,
    `Keep responses under 3 sentences — you're speaking on a phone call, not writing an essay.`,
    `Never fabricate specific information like prices, availability, or staff names unless provided below.`,
    `If you don't know something, offer to take a message or suggest the caller visit the website.`,
  ];

  if (domain) parts.push(`Website: ${domain}`);
  if (config.business_hours) parts.push(`Business hours: ${config.business_hours}`);
  if (config.services_offered) parts.push(`Services offered: ${config.services_offered}`);
  if (config.booking_instructions) parts.push(`Booking instructions: ${config.booking_instructions}`);
  if (config.custom_prompt) parts.push(`Additional instructions: ${config.custom_prompt}`);

  parts.push(
    `If the caller wants to leave a message, collect their name, phone number, and a brief message.`,
    `Be conversational and natural — sound like a real person, not a robot.`,
    `If the caller says goodbye, respond warmly and end the conversation.`,
  );

  return parts.join("\n");
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
