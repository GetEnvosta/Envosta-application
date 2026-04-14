import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { purchasePhoneNumber } from '@/services/twilio-admin';

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

  const { phoneNumber } = await req.json();
  if (!phoneNumber) return NextResponse.json({ error: 'Phone number required' }, { status: 400 });

  try {
    const result = await purchasePhoneNumber(phoneNumber);

    // Save to platform_settings
    const { supabase } = auth;
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'envosta_phone')
      .maybeSingle();

    const config = existing?.value ?? {};
    await supabase.from('platform_settings').upsert({
      key: 'envosta_phone',
      value: { ...config, phone_number: result.phoneNumber, twilio_sid: result.sid, enabled: true },
    }, { onConflict: 'key' });

    // Log
    await supabase.from('logs').insert({
      user_id: auth.userId,
      action: 'admin.phone.buy',
      details: `Purchased number ${result.phoneNumber}`,
      level: 'info',
      metadata: { phone_number: result.phoneNumber, twilio_sid: result.sid },
    });

    return NextResponse.json({ twilio_sid: result.sid, phone_number: result.phoneNumber });
  } catch (e: any) {
    console.error('Twilio buy number error:', e);
    return NextResponse.json({ error: e.message ?? 'Failed to purchase number' }, { status: 500 });
  }
}
