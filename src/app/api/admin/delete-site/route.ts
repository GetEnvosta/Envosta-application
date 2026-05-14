import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  const isAdmin = ['admin', 'staff'].includes(profile?.role);

  const { siteId, action } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  // Only admins can hard-delete
  if (action === 'hard-delete-site' && !isAdmin) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  // Non-admins can only soft-delete their own sites
  if (!isAdmin) {
    const { data: site } = await sb.from('sites').select('user_id').eq('id', siteId).single();
    if (!site || site.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Forward to the Vercel internal route (calls wp.cloud directly from
  // Vercel static IPs).
  const origin = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    : new URL(req.url).origin;
  const res = await fetch(`${origin}/api/internal/wpcloud/site-info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
    },
    body: JSON.stringify({ action: action ?? 'delete-site', siteId, actorId: user.id }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
