import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { phoneNumberId } = await req.json();
  if (!phoneNumberId) return NextResponse.json({ error: 'phoneNumberId required' }, { status: 400 });

  // Get phone number record
  const { data: phoneRecord } = await supabase
    .from('phone_numbers')
    .select('id, phone_number, user_id, site_id, twilio_sid')
    .eq('id', phoneNumberId)
    .single();
  if (!phoneRecord) return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });

  // Release from Twilio
  try {
    if (phoneRecord.twilio_sid) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${phoneRecord.twilio_sid}.json`;
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      await fetch(twilioUrl, { method: 'DELETE', headers: { Authorization: `Basic ${auth}` } });
    } else {
      // Try to find SID by number
      const lookupUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneRecord.phone_number)}`;
      const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
      const lookupRes = await fetch(lookupUrl, { headers: { Authorization: `Basic ${auth}` } });
      if (lookupRes.ok) {
        const lookupData = await lookupRes.json();
        const sid = lookupData?.incoming_phone_numbers?.[0]?.sid;
        if (sid) {
          const deleteUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${sid}.json`;
          await fetch(deleteUrl, { method: 'DELETE', headers: { Authorization: `Basic ${auth}` } });
        }
      }
    }

    // If linked to a site, clear the site's denormalized column
    if (phoneRecord.site_id) {
      await supabase.from('sites').update({
        twilio_phone_number: null,
        receptionist_enabled: false,
      }).eq('id', phoneRecord.site_id);
    }

    // Delete the phone_numbers record
    await supabase.from('phone_numbers').delete().eq('id', phoneNumberId);

    // Log
    await supabase.from('logs').insert({
      user_id: user.id,
      action: 'admin.number_released',
      details: `Admin released ${phoneRecord.phone_number}`,
      level: 'info',
      metadata: { phone_number: phoneRecord.phone_number, target_user: phoneRecord.user_id },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
