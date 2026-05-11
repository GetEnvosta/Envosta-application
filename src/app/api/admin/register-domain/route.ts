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
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
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

  // Register via Edge Function (same as user-facing flow but with admin context)
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-domain`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          action: 'register',
          domain,
          period: period || 1,
          userId,
          adminOverride: true,
        }),
      },
    );

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
