import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { searchAvailableNumbers } from '@/services/twilio';

export const dynamic = 'force-dynamic';

/** GET /api/phone-numbers — list all phone numbers owned by the user */
export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('phone_numbers')
    .select('id, phone_number, enabled, config, site_id, twilio_sid, created_at, sites(id, label)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ numbers: data ?? [] });
}

/** POST /api/phone-numbers — buy a new phone number (user-level, site optional) */
export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { phoneNumber, siteId } = await req.json();
  if (!phoneNumber) return NextResponse.json({ error: 'phoneNumber is required' }, { status: 400 });

  const supabase = await createServerClient();

  // If siteId provided, verify user owns it and it doesn't already have a number
  if (siteId) {
    const { data: site } = await supabase
      .from('sites')
      .select('id, twilio_phone_number')
      .eq('id', siteId)
      .eq('user_id', userId)
      .single();

    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    if (site.twilio_phone_number) return NextResponse.json({ error: 'Site already has a phone number' }, { status: 409 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const twilioSid = process.env.TWILIO_ACCOUNT_SID!;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN!;
    const basic = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');

    // Buy number from Twilio
    const params = new URLSearchParams({
      PhoneNumber: phoneNumber,
      VoiceUrl: `${supabaseUrl}/functions/v1/twilio-voice`,
      VoiceMethod: 'POST',
      StatusCallback: `${supabaseUrl}/functions/v1/twilio-voice`,
      StatusCallbackMethod: 'POST',
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json`,
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

    // Insert into phone_numbers table
    const { data: inserted, error: insertErr } = await supabase
      .from('phone_numbers')
      .insert({
        user_id: userId,
        phone_number: phoneNumber,
        site_id: siteId || null,
        enabled: true,
        twilio_sid: data.sid,
        config: {},
      })
      .select('id, phone_number, enabled, site_id, twilio_sid, created_at')
      .single();

    if (insertErr) throw new Error(insertErr.message);

    // If linked to a site, update the site denormalized columns
    if (siteId) {
      await supabase.from('sites').update({
        twilio_phone_number: phoneNumber,
        receptionist_enabled: true,
        updated_at: new Date().toISOString(),
      }).eq('id', siteId);
    }

    // Log
    await supabase.from('logs').insert({
      user_id: userId,
      site_id: siteId || null,
      action: 'receptionist.number_purchased',
      details: `Phone number purchased: ${phoneNumber}`,
      level: 'info',
      metadata: { phone_number: phoneNumber, twilio_sid: data.sid },
    });

    return NextResponse.json(inserted);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/** DELETE /api/phone-numbers — release a phone number by id */
export async function DELETE(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const supabase = await createServerClient();

  const { data: record } = await supabase
    .from('phone_numbers')
    .select('id, phone_number, site_id, twilio_sid')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!record) return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });

  try {
    // Delete from Twilio
    if (record.twilio_sid) {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID!;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN!;
      const basic = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers/${record.twilio_sid}.json`,
        { method: 'DELETE', headers: { Authorization: `Basic ${basic}` } },
      );
    }

    // Clear site link if any
    if (record.site_id) {
      await supabase.from('sites').update({
        twilio_phone_number: null,
        receptionist_enabled: false,
        updated_at: new Date().toISOString(),
      }).eq('id', record.site_id);
    }

    // Delete from phone_numbers table
    await supabase.from('phone_numbers').delete().eq('id', id);

    // Log
    await supabase.from('logs').insert({
      user_id: userId,
      site_id: record.site_id || null,
      action: 'receptionist.number_released',
      details: `Phone number released: ${record.phone_number}`,
      level: 'info',
    });

    return NextResponse.json({ released: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
