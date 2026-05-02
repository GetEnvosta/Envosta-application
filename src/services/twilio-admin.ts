/**
 * Twilio admin service. Thin wrapper around the Twilio Node SDK for
 * the phone-number provisioning flow used by partners/admins:
 *
 *   - searchAvailableNumbers   — local US/CA numbers by area code
 *   - purchasePhoneNumber      — buy + wire to our voice/SMS webhooks
 *   - releasePhoneNumber       — release back to Twilio
 *   - sendSms                  — outbound SMS from a provisioned number
 *
 * Credentials come from TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN env vars.
 * Webhook URLs come from TWILIO_VOICE_WEBHOOK_URL / TWILIO_SMS_WEBHOOK_URL
 * (left empty in dev — Twilio accepts the buy without webhooks set).
 *
 * Server-only — never import from client components.
 */
import twilio from 'twilio';

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set');
  return twilio(sid, token);
}

export async function searchAvailableNumbers(country: string, areaCode: string) {
  const client = getClient();
  const list = country === 'US'
    ? client.availablePhoneNumbers('US')
    : client.availablePhoneNumbers('CA');

  const numbers = await list.local.list({
    areaCode: parseInt(areaCode, 10),
    voiceEnabled: true,
    smsEnabled: true,
    limit: 10,
  });

  return numbers.map(n => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality,
    region: n.region,
  }));
}

export async function purchasePhoneNumber(phoneNumber: string) {
  const client = getClient();
  const incoming = await client.incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl: process.env.TWILIO_VOICE_WEBHOOK_URL || '',
    voiceMethod: 'POST',
    smsUrl: process.env.TWILIO_SMS_WEBHOOK_URL || '',
    smsMethod: 'POST',
  });
  return { sid: incoming.sid, phoneNumber: incoming.phoneNumber };
}

export async function releasePhoneNumber(twilioSid: string) {
  const client = getClient();
  await client.incomingPhoneNumbers(twilioSid).remove();
}

export async function sendSms(from: string, to: string, body: string) {
  const client = getClient();
  const message = await client.messages.create({ from, to, body });
  return { sid: message.sid, status: message.status };
}
