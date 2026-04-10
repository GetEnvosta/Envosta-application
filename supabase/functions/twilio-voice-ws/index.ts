import { supabaseAdmin, TWILIO_AUTH_TOKEN } from "../_shared/deps.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-haiku-3-5-20241022"; // Fast model for voice latency

/**
 * Twilio ConversationRelay WebSocket handler.
 * Receives transcribed speech, sends to Claude, returns text for TTS.
 */
Deno.serve((req) => {
  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(req);

  // Call state
  let siteId = "";
  let userId = "";
  let callerNumber = "";
  let callSid = "";
  let systemPrompt = "";
  let messages: { role: string; content: string }[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let startTime = Date.now();
  let maxCallMs = 6 * 60 * 1000; // 6 min default
  let ended = false;

  socket.onopen = () => {
    console.log("ConversationRelay WebSocket opened");
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "setup": {
          // First message — extract context
          const params = data.customParameters ?? {};
          // Try parsing from the 'context' parameter
          let ctx: any = {};
          try {
            ctx = typeof params.context === "string" ? JSON.parse(params.context) : params;
          } catch {
            ctx = params;
          }

          siteId = ctx.siteId ?? "";
          userId = ctx.userId ?? "";
          callerNumber = data.from ?? ctx.callerNumber ?? "";
          callSid = data.callSid ?? ctx.callSid ?? "";
          startTime = Date.now();

          console.log("Setup:", { siteId, userId, callerNumber, callSid });

          // Load site config and build system prompt
          const sb = supabaseAdmin();
          const { data: site } = await sb
            .from("sites")
            .select("label, domain_name, receptionist_config")
            .eq("id", siteId)
            .single();

          const config = (site?.receptionist_config as any) ?? {};
          maxCallMs = (config.max_call_minutes ?? 6) * 60 * 1000;

          systemPrompt = buildSystemPrompt(config, site?.label, site?.domain_name);
          break;
        }

        case "prompt": {
          // Caller said something — process with Claude
          const utterance = data.voicePrompt ?? "";
          if (!utterance.trim()) break;

          // Check call duration limit
          if (Date.now() - startTime > maxCallMs) {
            sendText(socket, "I appreciate the conversation, but I need to let you go. Feel free to call back anytime. Goodbye!");
            sendEnd(socket);
            break;
          }

          messages.push({ role: "user", content: utterance });

          // Call Claude
          const response = await callClaudeForVoice(systemPrompt, messages);
          if (response) {
            messages.push({ role: "assistant", content: response.text });
            totalInputTokens += response.input_tokens;
            totalOutputTokens += response.output_tokens;
            sendText(socket, response.text);
          }
          break;
        }

        case "dtmf": {
          // Keypad press — could route based on digit
          const digit = data.digit ?? "";
          if (digit === "0") {
            sendText(socket, "Let me connect you with someone. One moment please.");
            // Could implement call transfer here
          }
          break;
        }

        case "interrupt": {
          // Caller interrupted — Claude response was cut off. That's fine.
          break;
        }

        case "error": {
          console.error("ConversationRelay error:", data);
          break;
        }
      }
    } catch (e) {
      console.error("WebSocket message error:", e);
    }
  };

  socket.onclose = async () => {
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
      for (const r of rates ?? []) {
        const m = (r.metadata as any) ?? {};
        if (m.metric === "per_minute" && m.service_type === "twilio_receptionist") perMinuteRate = Number(m.credits_per_unit);
        if (m.metric === "per_1k_tokens") aiTokenRate = Number(m.credits_per_unit);
      }

      const totalTokens = totalInputTokens + totalOutputTokens;
      const callCredits = Math.ceil(durationMinutes * perMinuteRate);
      const aiCredits = Math.ceil((totalTokens / 1000) * aiTokenRate);
      const totalCredits = callCredits + aiCredits;

      // Deduct credits (split if over 50)
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
          // Split into chunks of 50
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

      // Build transcript from messages
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
  };

  socket.onerror = (e) => {
    console.error("WebSocket error:", e);
  };

  return response;
});

// ── Helpers ──────────────────────────────────────────────────

function sendText(socket: WebSocket, text: string) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "text", token: text }));
  }
}

function sendEnd(socket: WebSocket) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "end" }));
  }
}

function buildSystemPrompt(config: any, siteLabel?: string, domain?: string): string {
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

async function callClaudeForVoice(
  systemPrompt: string,
  messages: { role: string; content: string }[],
): Promise<{ text: string; input_tokens: number; output_tokens: number } | null> {
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
        max_tokens: 150, // Keep responses short for voice
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
      text: data?.content?.[0]?.text ?? "",
      input_tokens: data?.usage?.input_tokens ?? 0,
      output_tokens: data?.usage?.output_tokens ?? 0,
    };
  } catch (e) {
    console.error("Claude call error:", e);
    return null;
  }
}
