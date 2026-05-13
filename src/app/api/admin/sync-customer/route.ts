import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/sync-customer
 *
 * Historically this admin tool pulled a customer's Stripe data
 * (subscriptions + invoices + default payment method) and mirrored it
 * into the local `public.subscriptions` / `public.invoices` tables.
 *
 * Those tables have been dropped — the Supabase Stripe Sync Engine
 * mirrors every Stripe object into the `stripe` schema continuously,
 * so this manual sync is now redundant. The endpoint stays available so
 * legacy admin UI buttons / scripts don't 404, but it's a no-op aside
 * from refreshing the cached card metadata on the user row.
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

async function getAdminUser() {
  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll() } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const sb = getSupabaseAdmin();
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? user : null;
}

export async function POST(req: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

  return NextResponse.json({
    ok: true,
    message:
      'Sync Engine handles this automatically. Stripe subscriptions and invoices live in the `stripe` schema, kept in sync continuously — no manual mirror needed.',
  });
}
