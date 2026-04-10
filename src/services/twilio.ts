import { createClient } from '@/lib/supabase-server';

function getAuth() {
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  return { sid, token, basic: Buffer.from(`${sid}:${token}`).toString('base64') };
}

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

// ── Search Available Numbers ───────────────────────────────

export async function searchAvailableNumbers(areaCode: string, country = 'CA') {
  const { sid, basic } = getAuth();
  const params = new URLSearchParams({ AreaCode: areaCode, VoiceEnabled: 'true', SmsEnabled: 'true' });

  const res = await fetch(
    `${TWILIO_BASE}/Accounts/${sid}/AvailablePhoneNumbers/${country}/Local.json?${params}`,
    { headers: { Authorization: `Basic ${basic}` } },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Failed to search numbers');

  return (data.available_phone_numbers ?? []).map((n: any) => ({
    phoneNumber: n.phone_number,
    friendlyName: n.friendly_name,
    locality: n.locality,
    region: n.region,
  }));
}

// ── Purchase Phone Number ──────────────────────────────────

export async function purchasePhoneNumber(phoneNumber: string, siteId: string) {
  const { sid, basic } = getAuth();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // Buy number from Twilio with webhook URL pointing to our edge function
  const params = new URLSearchParams({
    PhoneNumber: phoneNumber,
    VoiceUrl: `${supabaseUrl}/functions/v1/twilio-voice`,
    VoiceMethod: 'POST',
    StatusCallback: `${supabaseUrl}/functions/v1/twilio-voice`,
    StatusCallbackMethod: 'POST',
  });

  const res = await fetch(
    `${TWILIO_BASE}/Accounts/${sid}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Failed to purchase number');

  // Update site with the new number
  const supabase = await createClient();
  await supabase
    .from('sites')
    .update({
      twilio_phone_number: phoneNumber,
      receptionist_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);

  return { phoneNumber, twilioSid: data.sid };
}

// ── Release Phone Number ───────────────────────────────────

export async function releasePhoneNumber(siteId: string) {
  const supabase = await createClient();

  const { data: site } = await supabase
    .from('sites')
    .select('twilio_phone_number')
    .eq('id', siteId)
    .single();

  if (!site?.twilio_phone_number) throw new Error('No phone number assigned');

  const { sid, basic } = getAuth();

  // Look up the Twilio SID for this number
  const searchRes = await fetch(
    `${TWILIO_BASE}/Accounts/${sid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(site.twilio_phone_number)}`,
    { headers: { Authorization: `Basic ${basic}` } },
  );
  const searchData = await searchRes.json();
  const numberSid = searchData.incoming_phone_numbers?.[0]?.sid;

  if (numberSid) {
    await fetch(
      `${TWILIO_BASE}/Accounts/${sid}/IncomingPhoneNumbers/${numberSid}.json`,
      { method: 'DELETE', headers: { Authorization: `Basic ${basic}` } },
    );
  }

  // Clear from site
  await supabase
    .from('sites')
    .update({
      twilio_phone_number: null,
      receptionist_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId);

  return { released: true };
}
