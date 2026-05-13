import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Verify admin
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const { userId, domain, period } = await req.json();
  if (!userId || !domain) return NextResponse.json({ error: 'userId and domain required' }, { status: 400 });

  // Verify target user exists
  const { data: targetUser } = await supabase.from('users').select('id, full_name, email').eq('id', userId).single();
  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Register via Vercel internal route — calls OpenSRS directly from
  // Vercel static IPs (whitelisted at OpenSRS) instead of the legacy
  // Supabase edge-function path that routed through the Cloud Run proxy.
  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
      : new URL(req.url).origin;

    const res = await fetch(`${origin}/api/internal/opensrs/register-domain`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN!,
      },
      body: JSON.stringify({
        userId,
        domainName: domain,
        years: period || 1,
      }),
    });

    const data = await res.json();

    // Log admin action
    await supabase.from('logs').insert({
      user_id: user.id,
      action: 'admin.domain_registered',
      details: `Admin registered domain "${domain}" for ${targetUser.full_name || targetUser.email}`,
      level: 'info',
      metadata: { target_user: userId, domain, period, result: data },
    });

    if (res.ok) {
      return NextResponse.json({ success: true, ...data });
    } else {
      return NextResponse.json({ error: data.error || 'Registration failed' }, { status: res.status });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
