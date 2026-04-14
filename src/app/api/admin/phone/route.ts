import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

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

// GET — load Envosta phone config + recent calls
export async function GET() {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { supabase } = auth;

  // Load config from platform_settings
  const { data: row } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'envosta_phone')
    .maybeSingle();

  const config = row?.value ?? null;

  // Load recent call logs
  const { data: callLogs } = await supabase
    .from('logs')
    .select('id, metadata, created_at')
    .eq('action', 'envosta.call')
    .order('created_at', { ascending: false })
    .limit(50);

  const calls = (callLogs ?? []).map((log: any) => ({
    id: log.id,
    caller: log.metadata?.caller ?? 'Unknown',
    duration_minutes: log.metadata?.duration_minutes ?? 0,
    credits_charged: log.metadata?.credits_charged ?? 0,
    transcript: log.metadata?.transcript ?? [],
    created_at: log.created_at,
  }));

  return NextResponse.json({ config, calls });
}

// PUT — save Envosta phone config
export async function PUT(req: Request) {
  const auth = await verifyAdmin();
  if (!auth) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { supabase } = auth;
  const body = await req.json();

  // Upsert into platform_settings
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key: 'envosta_phone', value: body }, { onConflict: 'key' });

  if (error) {
    console.error('Save phone config error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
