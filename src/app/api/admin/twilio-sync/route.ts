import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? { supabase, userId: user.id } : null;
}

/**
 * POST: Check — compare Twilio numbers vs phone_numbers table
 */
export async function POST(req: Request) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { supabase: sb } = auth;
  const body = await req.json().catch(() => ({}));
  const action = body.action ?? 'check';

  try {
    // Fetch all numbers from Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json?PageSize=100`;
    const twilioAuth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const twilioRes = await fetch(twilioUrl, {
      headers: { Authorization: `Basic ${twilioAuth}` },
    });

    if (!twilioRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Twilio API' }, { status: 502 });
    }

    const twilioData = await twilioRes.json();
    const twilioNumbers = (twilioData.incoming_phone_numbers ?? []).map((n: any) => ({
      sid: n.sid,
      phoneNumber: n.phone_number,
      friendlyName: n.friendly_name,
      voiceUrl: n.voice_url,
      dateCreated: n.date_created,
    }));

    // Fetch all numbers from phone_numbers table
    const { data: dbNumbers } = await sb.from('phone_numbers').select('id, phone_number, user_id, site_id, twilio_sid');

    // Also check legacy sites.twilio_phone_number
    const { data: legacySites } = await sb
      .from('sites')
      .select('id, twilio_phone_number, user_id')
      .not('twilio_phone_number', 'is', null);

    const dbPhoneSet = new Set((dbNumbers ?? []).map((n: any) => n.phone_number));
    const legacyPhoneSet = new Set((legacySites ?? []).map((s: any) => s.twilio_phone_number));

    // Numbers in Twilio but NOT in our database
    const inTwilioNotDb = twilioNumbers.filter(
      (n: any) => !dbPhoneSet.has(n.phoneNumber) && !legacyPhoneSet.has(n.phoneNumber)
    );

    // Numbers in our DB but NOT in Twilio
    const twilioPhoneSet = new Set(twilioNumbers.map((n: any) => n.phoneNumber));
    const inDbNotTwilio = (dbNumbers ?? []).filter((n: any) => !twilioPhoneSet.has(n.phone_number));

    if (action === 'check') {
      return NextResponse.json({
        twilio: {
          total: twilioNumbers.length,
          inTwilioNotDb: inTwilioNotDb.map((n: any) => ({
            phoneNumber: n.phoneNumber,
            friendlyName: n.friendlyName,
            sid: n.sid,
            dateCreated: n.dateCreated,
          })),
          inDbNotTwilio: inDbNotTwilio.map((n: any) => ({
            phoneNumber: n.phone_number,
            id: n.id,
            userId: n.user_id,
          })),
          matched: twilioNumbers.length - inTwilioNotDb.length,
        },
        db: {
          total: (dbNumbers ?? []).length,
          legacy: (legacySites ?? []).length,
        },
      });
    }

    // action === 'sync' — import missing numbers from Twilio into phone_numbers
    if (action === 'sync' && inTwilioNotDb.length > 0) {
      let imported = 0;
      for (const num of inTwilioNotDb) {
        // Try to find a matching legacy site entry
        const legacySite = (legacySites ?? []).find((s: any) => s.twilio_phone_number === num.phoneNumber);

        // Insert into phone_numbers (unassigned if no legacy match)
        const { error: insertErr } = await sb.from('phone_numbers').insert({
          user_id: legacySite?.user_id ?? auth.userId, // assign to admin if no user found
          site_id: legacySite?.id ?? null,
          phone_number: num.phoneNumber,
          twilio_sid: num.sid,
          enabled: true,
          config: {},
        });

        if (!insertErr) imported++;
      }

      // Log the sync
      await sb.from('logs').insert({
        user_id: auth.userId,
        action: 'admin.twilio_sync',
        details: `Synced ${imported} phone numbers from Twilio`,
        level: 'info',
        metadata: { imported, total_twilio: twilioNumbers.length, total_db: (dbNumbers ?? []).length },
      });

      return NextResponse.json({ success: true, imported, total: inTwilioNotDb.length });
    }

    return NextResponse.json({ success: true, message: 'Nothing to sync' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
