import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!['admin', 'staff'].includes(profile?.role)) return NextResponse.json([], { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  if (!q) return NextResponse.json([]);

  const { data } = await supabase
    .from('sites')
    .select('id, label, status, user_id, users(full_name, email)')
    .ilike('label', `%${q}%`)
    .eq('status', 'active')
    .order('label')
    .limit(20);

  return NextResponse.json(
    (data ?? []).map((s: any) => ({
      id: s.id,
      label: s.label,
      status: s.status,
      user_id: s.user_id,
      user_name: s.users?.full_name ?? '',
      user_email: s.users?.email ?? '',
    })),
  );
}
