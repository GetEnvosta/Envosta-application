import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  try {
    // Fetch ALL Stripe products (active only — deleted/archived won't appear)
    const stripeProducts: Stripe.Product[] = [];
    for await (const product of stripe.products.list({ active: true, limit: 100 })) {
      stripeProducts.push(product);
    }
    const stripeProductIds = new Set(stripeProducts.map(p => p.id));

    // Fetch all active Stripe prices
    const stripePrices: Stripe.Price[] = [];
    for await (const price of stripe.prices.list({ active: true, limit: 100 })) {
      stripePrices.push(price);
    }
    const priceById = new Map<string, Stripe.Price>();
    for (const p of stripePrices) priceById.set(p.id, p);

    // Fetch ALL DB products
    const { data: allDbProducts } = await supabase
      .from('products')
      .select('id, stripe_product_id, stripe_price_id, price_usd, price_cad');

    // ── Auto-cleanup: clear stale Stripe IDs from DB ──
    // If a DB product has a stripe_product_id that no longer exists in Stripe, clear it
    let staleCleared = 0;
    for (const dbp of allDbProducts ?? []) {
      if (dbp.stripe_product_id && !stripeProductIds.has(dbp.stripe_product_id)) {
        await supabase.from('products').update({
          stripe_product_id: null,
          stripe_price_id: null,
        }).eq('id', dbp.id);
        dbp.stripe_product_id = null;
        dbp.stripe_price_id = null;
        staleCleared++;
      }
    }

    // Build sets for matching
    const dbStripeIds = new Set<string>();
    const allDbIds = new Set<string>();
    for (const p of allDbProducts ?? []) {
      allDbIds.add(p.id);
      if (p.stripe_product_id) dbStripeIds.add(p.stripe_product_id);
    }

    // ── Auto-link: match Stripe products to DB by metadata ──
    for (const sp of stripeProducts) {
      const envId = sp.metadata?.envosta_product_id;
      if (envId && allDbIds.has(envId) && !dbStripeIds.has(sp.id)) {
        const dbp = (allDbProducts ?? []).find(p => p.id === envId);
        if (dbp && !dbp.stripe_product_id) {
          await supabase.from('products').update({ stripe_product_id: sp.id }).eq('id', envId);
          dbp.stripe_product_id = sp.id;
          dbStripeIds.add(sp.id);
        }
      }
    }

    // Stripe products not linked to any DB product
    const stripeOnly = stripeProducts
      .filter(sp => {
        if (dbStripeIds.has(sp.id)) return false;
        if (sp.metadata?.envosta_product_id && allDbIds.has(sp.metadata.envosta_product_id)) return false;
        return true;
      })
      .map(p => ({
        stripe_id: p.id,
        name: p.name,
        description: p.description,
        active: p.active,
        metadata: p.metadata,
        created: p.created,
      }));

    // Build verification map
    const verification: Record<string, {
      stripeProductExists: boolean;
      stripePriceId: string | null;
      stripePriceAmount: number | null;
      dbPriceUsd: number;
      priceMatches: boolean;
    }> = {};

    for (const dbp of allDbProducts ?? []) {
      if (!dbp.stripe_product_id) continue;
      const stripeProduct = stripeProducts.find(sp => sp.id === dbp.stripe_product_id);
      const stripePrice = dbp.stripe_price_id ? priceById.get(dbp.stripe_price_id) : null;
      const dbPrice = dbp.price_usd || dbp.price_cad || 0;

      verification[dbp.id] = {
        stripeProductExists: !!stripeProduct,
        stripePriceId: stripePrice?.id ?? null,
        stripePriceAmount: stripePrice?.unit_amount ?? null,
        dbPriceUsd: dbPrice,
        priceMatches: stripePrice ? stripePrice.unit_amount === dbPrice : false,
      };
    }

    return NextResponse.json({ stripeOnly, verification, staleCleared });
  } catch (e: any) {
    console.error('Stripe products fetch error:', e);
    return NextResponse.json({ error: e.message ?? 'Failed to fetch' }, { status: 500 });
  }
}
