import { supabaseAdmin } from "../_shared/deps.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = "claude-haiku-3-5-20241022"; // Fast model for voice latency

/**
 * Twilio ConversationRelay WebSocket handler (Edge Function fallback).
 * Receives transcribed speech, sends to Claude, returns text for TTS.
 *
 * NOTE: Supabase Edge Functions have a ~150s timeout. For longer calls,
 * the Cloud Run relay is preferred. This serves as a fallback.
 */
Deno.serve((req) => {
  const { socket, response } = Deno.upgradeWebSocket(req);

  let callerNumber = "";
  let callSid = "";
  let systemPrompt = "";
  let messages: { role: string; content: string }[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let startTime = Date.now();
  let maxCallMs = 6 * 60 * 1000;
  let ended = false;

  socket.onopen = () => {
    console.log("ConversationRelay WebSocket opened");
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "setup": {
          const params = data.customParameters ?? {};
          let ctx: any = {};
          try {
            ctx = typeof params.context === "string" ? JSON.parse(params.context) : params;
          } catch {
            ctx = params;
          }

          callerNumber = data.from ?? ctx.callerNumber ?? "";
          callSid = data.callSid ?? ctx.callSid ?? "";
          startTime = Date.now();

          console.log("Setup:", { callerNumber, callSid });

          // Load Envosta config from platform_settings
          const sb = supabaseAdmin();
          const { data: row } = await sb
            .from("platform_settings")
            .select("value")
            .eq("key", "envosta_phone")
            .maybeSingle();

          const config = (row?.value as any) ?? {};
          maxCallMs = (config.max_call_minutes ?? 6) * 60 * 1000;
          systemPrompt = buildSystemPrompt(config);
          break;
        }

        case "prompt": {
          const utterance = data.voicePrompt ?? "";
          if (!utterance.trim()) break;

          if (Date.now() - startTime > maxCallMs) {
            sendText(socket, "I appreciate the conversation, but I need to let you go. Feel free to call back anytime. Goodbye!");
            sendEnd(socket);
            break;
          }

          messages.push({ role: "user", content: utterance });

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
          const digit = data.digit ?? "";
          if (digit === "0") {
            sendText(socket, "Let me connect you with someone. One moment please.");
          }
          break;
        }

        case "interrupt":
          break;

        case "error":
          console.error("ConversationRelay error:", data);
          break;
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
      const totalTokens = totalInputTokens + totalOutputTokens;

      const transcript = messages.map((m, i) => ({
        speaker: m.role === "user" ? "caller" : "ai",
        text: m.content,
        index: i,
      }));

      // Log as envosta.call (admin phone tab reads these)
      await sb.from("logs").insert({
        user_id: null,
        action: "envosta.call",
        details: `Call from ${callerNumber}: ${durationMinutes}min`,
        level: "info",
        metadata: {
          call_sid: callSid,
          caller: callerNumber,
          duration_seconds: durationSeconds,
          duration_minutes: durationMinutes,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          total_tokens: totalTokens,
          credits_charged: 0,
          transcript,
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

function buildSystemPrompt(config: any): string {
  const businessName = config.business_name || "Envosta";
  const parts = [
    `You are a friendly, professional AI receptionist for ${businessName}.`,
    `You answer phone calls on behalf of the business. Be warm, concise, and helpful.`,
    `Keep responses under 3 sentences — you're speaking on a phone call, not writing an essay.`,
    `Never fabricate specific information like prices, availability, or staff names unless provided below.`,
    `If you don't know something, offer to take a message or suggest the caller visit the website.`,
  ];

  if (config.website) parts.push(`Website: ${config.website}`);
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
      text: data?.content?.[0]?.text ?? "",
      input_tokens: data?.usage?.input_tokens ?? 0,
      output_tokens: data?.usage?.output_tokens ?? 0,
    };
  } catch (e) {
    console.error("Claude call error:", e);
    return null;
  }
}
