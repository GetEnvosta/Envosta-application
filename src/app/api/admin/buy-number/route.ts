import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

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

  const { phoneNumber, userId } = await req.json();
  if (!phoneNumber || !userId) return NextResponse.json({ error: 'phoneNumber and userId required' }, { status: 400 });

  // Verify user exists
  const { data: targetUser } = await supabase.from('users').select('id, full_name, email').eq('id', userId).single();
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Check number isn't already owned
  const { data: existing } = await supabase.from('phone_numbers').select('id').eq('phone_number', phoneNumber).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Number already owned' }, { status: 409 });

  // Buy from Twilio
  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const voiceUrl = `${SUPABASE_URL}/functions/v1/twilio-voice`;

    const body = new URLSearchParams({
      PhoneNumber: phoneNumber,
      VoiceUrl: voiceUrl,
      VoiceMethod: 'POST',
      StatusCallback: voiceUrl,
      StatusCallbackMethod: 'POST',
    });

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!twilioRes.ok) {
      const err = await twilioRes.json();
      return NextResponse.json({ error: err.message || 'Twilio purchase failed' }, { status: 500 });
    }

    const twilioData = await twilioRes.json();

    // Insert into phone_numbers table (not linked to any site yet)
    const { data: phoneRecord, error: insertErr } = await supabase.from('phone_numbers').insert({
      user_id: userId,
      phone_number: phoneNumber,
      enabled: true,
      twilio_sid: twilioData.sid ?? null,
      config: {},
    }).select('id').single();

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    // Log
    await supabase.from('logs').insert({
      user_id: user.id,
      action: 'admin.number_purchased',
      details: `Admin purchased ${phoneNumber} for ${targetUser.full_name || targetUser.email}`,
      level: 'info',
      metadata: { phone_number: phoneNumber, target_user: userId, phone_number_id: phoneRecord.id },
    });

    return NextResponse.json({ success: true, phoneNumber, id: phoneRecord.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
