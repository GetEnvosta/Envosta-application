/**
 * POST /api/admin/products/[id]/sync-stripe
 *
 * Single-product Stripe sync. Admin-only. Thin wrapper that forwards to
 * the bulk `/api/admin/sync-stripe` endpoint with `{ type: 'product', id }`
 * so the per-row "Sync to Stripe" button in the admin Settings tables
 * (Plans, Add-ons, Services) has its own clean URL and the bulk handler
 * stays the canonical sync implementation.
 *
 * Returns:
 *   { ok, stripe_product_id, stripe_price_id, stripe_price_id_yearly,
 *     stripe_price_id_cad, stripe_price_id_yearly_cad, error? }
 */
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: 'Product id required' }, { status: 400 });

  // ── Authn / authz ───────────────────────────────────
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const sbService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await sbService
    .from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Admin only' }, { status: 403 });
  }

  // ── Verify product exists ───────────────────────────
  const { data: product } = await sbService
    .from('products')
    .select('id, type')
    .eq('id', id)
    .maybeSingle();
  if (!product) return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
  if (product.type === 'domain_tld') {
    return NextResponse.json(
      { ok: false, error: 'TLDs do not sync to Stripe. Edit pricing in public.tlds.' },
      { status: 410 },
    );
  }

  // ── Forward to bulk sync endpoint (canonical implementation) ──
  const origin = new URL(req.url).origin;
  const cookieHeader = req.headers.get('cookie') ?? '';

  let res: Response;
  try {
    res = await fetch(`${origin}/api/admin/sync-stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: cookieHeader,
      },
      body: JSON.stringify({ type: 'product', id }),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Sync request failed' }, { status: 500 });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    return NextResponse.json(
      { ok: false, error: data?.error ?? data?.reason ?? `Sync failed (HTTP ${res.status})` },
      { status: res.status === 200 ? 500 : res.status },
    );
  }

  return NextResponse.json({
    ok: true,
    stripe_product_id: data.stripe_product_id ?? null,
    stripe_price_id: data.stripe_price_id ?? null,
    stripe_price_id_yearly: data.stripe_price_id_yearly ?? null,
    stripe_price_id_cad: data.stripe_price_id_cad ?? null,
    stripe_price_id_yearly_cad: data.stripe_price_id_yearly_cad ?? null,
  });
}
