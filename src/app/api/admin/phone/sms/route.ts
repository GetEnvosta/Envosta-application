import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { sendSms } from '@/services/twilio-admin';

export const dynamic = 'force-dynamic';

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

export async function POST(req: Request) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { supabase } = auth;
  const { to, body } = await req.json();

  if (!to?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Recipient and message required' }, { status: 400 });
  }

  // Get the Envosta phone number
  const { data: row } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'envosta_phone')
    .maybeSingle();

  const config = row?.value as any;
  if (!config?.phone_number) {
    return NextResponse.json({ error: 'No Envosta phone number configured' }, { status: 400 });
  }

  try {
    const result = await sendSms(config.phone_number, to.trim(), body.trim());

    // Log
    await supabase.from('logs').insert({
      user_id: auth.userId,
      action: 'admin.phone.sms',
      details: `SMS to ${to.trim()}: ${body.trim().slice(0, 80)}`,
      level: 'info',
      metadata: { to: to.trim(), body_length: body.trim().length, twilio_sid: result.sid },
    });

    return NextResponse.json({ ok: true, sid: result.sid });
  } catch (e: any) {
    console.error('Twilio SMS error:', e);
    return NextResponse.json({ error: e.message ?? 'Failed to send SMS' }, { status: 500 });
  }
}
