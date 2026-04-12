import { supabaseAdmin, TWILIO_AUTH_TOKEN, SUPABASE_URL, cors, json, error } from "../_shared/deps.ts";

// Cloud Run relay for long-running WebSocket connections (6 min calls)
// Falls back to Supabase Edge Function WS if not set
const TWILIO_RELAY_URL = Deno.env.get("TWILIO_RELAY_URL") ?? "";

/**
 * Twilio Voice Webhook — handles incoming calls.
 * Looks up the site by phone number, returns TwiML to start ConversationRelay.
 */

// Validate Twilio signature (HMAC-SHA1)
async function validateTwilioSignature(url: string, params: Record<string, string>, signature: string): Promise<boolean> {
  if (!TWILIO_AUTH_TOKEN || !signature) return false;

  // Build the data string: URL + sorted params concatenated
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
    // Parse form-encoded body from Twilio
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = String(value);
    }

    const to = params.To ?? "";
    const from = params.From ?? "";
    const callSid = params.CallSid ?? "";
    const callStatus = params.CallStatus ?? "";

    // If this is a status callback (completed, etc.), just acknowledge
    if (callStatus === "completed" || callStatus === "busy" || callStatus === "no-answer" || callStatus === "failed") {
      return new Response("<Response/>", {
        headers: { "Content-Type": "text/xml" },
      });
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

    // Look up phone number from phone_numbers table, join site if linked
    const sb = supabaseAdmin();
    const { data: phoneRecord } = await sb
      .from("phone_numbers")
      .select("id, user_id, site_id, phone_number, enabled, config, sites(id, label, receptionist_config)")
      .eq("phone_number", to)
      .maybeSingle();

    if (!phoneRecord) {
      // Fallback: check sites table for legacy numbers not yet migrated
      const { data: legacySite } = await sb
        .from("sites")
        .select("id, user_id, label, receptionist_enabled, receptionist_config")
        .eq("twilio_phone_number", to)
        .maybeSingle();

      if (!legacySite) {
        console.log("No phone number found:", to);
        return new Response(
          `<Response><Say>Sorry, this number is not configured. Goodbye.</Say></Response>`,
          { headers: { "Content-Type": "text/xml" } },
        );
      }

      // Use legacy site data
      if (!legacySite.receptionist_enabled) {
        return new Response(
          `<Response><Say>This service is currently unavailable. Please try again later. Goodbye.</Say></Response>`,
          { headers: { "Content-Type": "text/xml" } },
        );
      }

      const legacyConfig = (legacySite.receptionist_config as any) ?? {};
      const legacyGreeting = legacyConfig.greeting_message || `Thanks for calling ${legacyConfig.business_name || legacySite.label || "us"}! How can I help you today?`;
      const legacyVoice = legacyConfig.voice || "Google.en-US-Journey-F";
      const wsUrl = TWILIO_RELAY_URL || `${SUPABASE_URL.replace("https://", "wss://")}/functions/v1/twilio-voice-ws`;

      const customParams = JSON.stringify({
        siteId: legacySite.id,
        userId: legacySite.user_id,
        callerNumber: from,
        callSid: callSid,
      });

      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      voice="${legacyVoice}"
      transcriptionProvider="deepgram"
      ttsProvider="google"
      dtmfDetection="true"
      interruptible="true"
      welcomeGreeting="${legacyGreeting.replace(/"/g, '&quot;')}"
      welcomeGreetingInterruptible="true"
    >
      <Parameter name="context" value='${customParams.replace(/'/g, "&#39;")}' />
    </ConversationRelay>
  </Connect>
</Response>`;

      console.log("Legacy call routed:", { callSid, from, to, siteId: legacySite.id });
      return new Response(twiml, { headers: { "Content-Type": "text/xml" } });
    }

    // ── New phone_numbers table path ──
    if (!phoneRecord.enabled) {
      return new Response(
        `<Response><Say>This service is currently unavailable. Please try again later. Goodbye.</Say></Response>`,
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    // Config comes from phone_numbers.config first, fallback to linked site's receptionist_config
    const site = (phoneRecord.sites as any) ?? null;
    const phoneConfig = (phoneRecord.config as any) ?? {};
    const siteConfig = (site?.receptionist_config as any) ?? {};
    const config = { ...siteConfig, ...phoneConfig }; // phone config overrides site config

    const greeting = config.greeting_message || `Thanks for calling ${config.business_name || site?.label || "us"}! How can I help you today?`;
    const voice = config.voice || "Google.en-US-Journey-F";
    // Use Cloud Run relay for reliable long-running WebSocket connections
    // Falls back to Supabase Edge Function (has ~150s timeout limit)
    const wsUrl = TWILIO_RELAY_URL || `${SUPABASE_URL.replace("https://", "wss://")}/functions/v1/twilio-voice-ws`;

    // Build custom parameters to pass to WebSocket handler
    const customParams = JSON.stringify({
      siteId: site?.id ?? "",
      userId: phoneRecord.user_id,
      callerNumber: from,
      callSid: callSid,
      phoneNumberId: phoneRecord.id,
    });

    // Return TwiML that starts ConversationRelay
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

    console.log("Call routed:", { callSid, from, to, userId: phoneRecord.user_id, siteId: site?.id ?? "none" });

    return new Response(twiml, {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (e) {
    console.error("Twilio voice webhook error:", e);
    return new Response(
      `<Response><Say>An error occurred. Please try again later.</Say></Response>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }
});
