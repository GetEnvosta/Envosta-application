import { supabaseAdmin, TWILIO_AUTH_TOKEN, SUPABASE_URL, cors } from "../_shared/deps.ts";

// Cloud Run relay for long-running WebSocket connections
const TWILIO_RELAY_URL = Deno.env.get("TWILIO_RELAY_URL") ?? "";

/**
 * Twilio Voice Webhook — handles incoming calls to Envosta's phone number.
 * Looks up config from platform_settings, returns TwiML to start ConversationRelay.
 * This is admin/internal only — NOT for customers.
 */

async function validateTwilioSignature(url: string, params: Record<string, string>, signature: string): Promise<boolean> {
  if (!TWILIO_AUTH_TOKEN || !signature) return false;

  let data = url;
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(TWILIO_AUTH_TOKEN),
    { name: "HMAC", hash: "SHA-1" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return computed === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = String(value);
    }

    const to = params.To ?? "";
    const from = params.From ?? "";
    const callSid = params.CallSid ?? "";
    const callStatus = params.CallStatus ?? "";

    // Status callbacks — just acknowledge
    if (callStatus === "completed" || callStatus === "busy" || callStatus === "no-answer" || callStatus === "failed") {
      return new Response("<Response/>", { headers: { "Content-Type": "text/xml" } });
    }

    // Validate Twilio signature
    const signature = req.headers.get("X-Twilio-Signature") ?? "";
    const requestUrl = `${SUPABASE_URL}/functions/v1/twilio-voice`;
    const isValid = await validateTwilioSignature(requestUrl, params, signature);

    if (!isValid && TWILIO_AUTH_TOKEN) {
      console.error("Invalid Twilio signature");
      return new Response("<Response><Say>Invalid request.</Say></Response>", {
        status: 403,
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Load Envosta phone config from platform_settings
    const sb = supabaseAdmin();
    const { data: row } = await sb
      .from("platform_settings")
      .select("value")
      .eq("key", "envosta_phone")
      .maybeSingle();

    const config = (row?.value as any) ?? {};

    // Verify this is Envosta's number
    if (!config.phone_number || config.phone_number !== to) {
      console.log("Call to unconfigured number:", to);
      return new Response(
        `<Response><Say>Sorry, this number is not configured. Goodbye.</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    if (!config.enabled) {
      return new Response(
        `<Response><Say>This service is currently unavailable. Please try again later. Goodbye.</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    const greeting = config.greeting_message || `Thanks for calling ${config.business_name || "Envosta"}! How can I help you today?`;
    const voice = config.voice || "Google.en-US-Journey-F";
    const wsUrl = TWILIO_RELAY_URL || `${SUPABASE_URL.replace("https://", "wss://")}/functions/v1/twilio-voice-ws`;

    const customParams = JSON.stringify({
      callerNumber: from,
      callSid: callSid,
    });

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      voice="${voice}"
      transcriptionProvider="deepgram"
      ttsProvider="google"
      dtmfDetection="true"
      interruptible="true"
      welcomeGreeting="${greeting.replace(/"/g, '&quot;')}"
      welcomeGreetingInterruptible="true"
    >
      <Parameter name="context" value='${customParams.replace(/'/g, "&#39;")}' />
    </ConversationRelay>
  </Connect>
</Response>`;

    console.log("Envosta call routed:", { callSid, from, to });

    return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
  } catch (e) {
    console.error("Twilio voice webhook error:", e);
    return new Response(
      `<Response><Say>An error occurred. Please try again later.</Say></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }
});
