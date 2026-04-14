import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { releasePhoneNumber } from '@/services/twilio-admin';

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

export async function POST() {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { supabase } = auth;

  // Get current config
  const { data: row } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'envosta_phone')
    .maybeSingle();

  const config = row?.value as any;
  if (!config?.twilio_sid) {
    return NextResponse.json({ error: 'No number to release' }, { status: 400 });
  }

  try {
    await releasePhoneNumber(config.twilio_sid);

    // Update config
    await supabase.from('platform_settings').upsert({
      key: 'envosta_phone',
      value: { ...config, phone_number: '', twilio_sid: '', enabled: false },
    }, { onConflict: 'key' });

    // Log
    await supabase.from('logs').insert({
      user_id: auth.userId,
      action: 'admin.phone.release',
      details: `Released number ${config.phone_number}`,
      level: 'info',
      metadata: { phone_number: config.phone_number, twilio_sid: config.twilio_sid },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Twilio release number error:', e);
    return NextResponse.json({ error: e.message ?? 'Failed to release number' }, { status: 500 });
  }
}
