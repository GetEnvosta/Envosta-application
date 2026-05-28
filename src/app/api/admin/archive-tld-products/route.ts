import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Archive legacy TLD products in Stripe.
 *
 * Domain checkouts use inline `price_data` and there are no Stripe
 * Products for TLDs. Older Stripe accounts may still have persistent
 * TLD products (.com, .ca, etc.) sitting around as dead weight from
 * earlier checkout designs.
 *
 * This route:
 *   - Lists every active Stripe Product
 *   - Identifies TLD products by name pattern (".com", ".ca", "tld-*",
 *     starts with a dot, or metadata flagged as domain_tld)
 *   - In dry-run mode (default): returns the list of what WOULD be archived
 *   - In confirm mode (?confirm=true): archives them all (sets active=false)
 *
 * Stripe Products can't be hard-deleted — only archived. The Sync Engine
 * will then mirror the archive state into stripe.products.
 *
 * Admin-only. POST returns the preview; POST with ?confirm=true performs
 * the archive.
 */
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  // ─── Authn / Authz ─────────────────────────────────────
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(profile?.role)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  const url = new URL(req.url);
  const confirm = url.searchParams.get('confirm') === 'true';

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any,
  });

  // ─── Enumerate Stripe products ─────────────────────────
  const allActive: Stripe.Product[] = [];
  try {
    for await (const product of stripe.products.list({ active: true, limit: 100 })) {
      allActive.push(product);
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to list Stripe products: ${e?.message ?? String(e)}` },
      { status: 502 },
    );
  }

  // ─── Identify TLD-shaped products ──────────────────────
  // Match heuristics (any one triggers a match):
  //   1. metadata.type === 'domain_tld'
  //   2. name matches `.<tld>` (e.g. ".com", ".ca")
  //   3. name or id matches `tld-<tld>` (e.g. "tld-com")
  //   4. name contains "domain" AND "renewal" (legacy renewal products)
  function isTldProduct(p: Stripe.Product): boolean {
    const meta = (p.metadata ?? {}) as Record<string, string>;
    if (meta.type === 'domain_tld') return true;

    const name = (p.name ?? '').trim().toLowerCase();
    if (/^\.[a-z]{2,}$/.test(name)) return true;
    if (/^tld-[a-z]{2,}$/.test(name)) return true;
    if (name.includes('domain') && name.includes('renewal')) return true;

    const id = p.id.toLowerCase();
    if (/^prod_tld_/.test(id)) return true;

    return false;
  }

  const tldProducts = allActive.filter(isTldProduct);

  // ─── Dry-run: return preview ───────────────────────────
  if (!confirm) {
    return NextResponse.json({
      mode: 'preview',
      total_active_products: allActive.length,
      tld_matches: tldProducts.length,
      products: tldProducts.map(p => ({
        id: p.id,
        name: p.name,
        metadata: p.metadata,
        created: p.created,
      })),
      next_step: 'POST again with ?confirm=true to archive these.',
    });
  }

  // ─── Confirm: archive each one ─────────────────────────
  const results: Array<{ id: string; name: string; status: 'archived' | 'failed'; error?: string }> = [];
  for (const p of tldProducts) {
    try {
      await stripe.products.update(p.id, { active: false });
      results.push({ id: p.id, name: p.name ?? '', status: 'archived' });
    } catch (e: any) {
      results.push({
        id: p.id,
        name: p.name ?? '',
        status: 'failed',
        error: e?.message ?? String(e),
      });
    }
  }

  return NextResponse.json({
    mode: 'confirmed',
    total_active_products_before: allActive.length,
    tld_matches: tldProducts.length,
    archived: results.filter(r => r.status === 'archived').length,
    failed: results.filter(r => r.status === 'failed').length,
    results,
  });
}
