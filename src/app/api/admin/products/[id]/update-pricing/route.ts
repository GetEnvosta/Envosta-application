/**
 * POST /api/admin/products/[id]/update-pricing
 *
 * Admin-only. Updates one or more price columns on a row of public.products.
 * Used by the inline-editable price cells in /admin/settings/plans.
 *
 * Stripe Price sync is NOT triggered here — Stripe Prices are immutable, so
 * pushing a new amount requires a separate "Sync to Stripe" action that
 * deactivates the old price and creates a new one. We keep the price edit
 * fast and local; the operator decides when to push to Stripe.
 *
 * Body (all optional, all in cents):
 *   { price_cad?, price_yearly_cad?, price_usd?, price_yearly_usd?, is_active? }
 */
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = new Set([
  'price_cad',
  'price_yearly_cad',
  'price_usd',
  'price_yearly_usd',
  'is_active',
]);

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'Product id required' }, { status: 400 });

  // ── Authn / authz ───────────────────────────────────
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  // ── Sanitise input ──────────────────────────────────
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) continue;
    const v = body[key];
    if (key === 'is_active') {
      updates[key] = Boolean(v);
    } else {
      const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: `${key} must be a non-negative integer (cents)` }, { status: 400 });
      }
      updates[key] = Math.round(n);
    }
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 });
  }

  // ── Service-role write ──────────────────────────────
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: updated, error } = await sb
    .from('products')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, product: updated });
}
