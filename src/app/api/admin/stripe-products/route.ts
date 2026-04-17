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

  // Verify admin
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
    // Fetch all Stripe products (active + inactive)
    const stripeProducts: Stripe.Product[] = [];
    for await (const product of stripe.products.list({ active: true, limit: 100 })) {
      stripeProducts.push(product);
    }

    // Fetch all Stripe prices
    const stripePrices: Stripe.Price[] = [];
    for await (const price of stripe.prices.list({ active: true, limit: 100 })) {
      stripePrices.push(price);
    }

    // Build price lookup by ID
    const priceById = new Map<string, Stripe.Price>();
    for (const p of stripePrices) priceById.set(p.id, p);

    // Fetch all DB products
    const { data: dbProducts } = await supabase
      .from('products')
      .select('id, stripe_product_id, stripe_price_id, price_usd, price_cad')
      .not('stripe_product_id', 'is', null);

    const dbStripeIds = new Set((dbProducts ?? []).map((p: any) => p.stripe_product_id));

    // Find Stripe products not in our DB
    const stripeOnly = stripeProducts
      .filter(p => !dbStripeIds.has(p.id))
      .map(p => ({
        stripe_id: p.id,
        name: p.name,
        description: p.description,
        active: p.active,
        metadata: p.metadata,
        created: p.created,
      }));

    // Build verification map: productId → { stripe price amount, matches DB }
    const verification: Record<string, {
      stripeProductExists: boolean;
      stripePriceId: string | null;
      stripePriceAmount: number | null;
      dbPriceUsd: number;
      priceMatches: boolean;
    }> = {};

    for (const dbp of dbProducts ?? []) {
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

    return NextResponse.json({ stripeOnly, verification });
  } catch (e: any) {
    console.error('Stripe products fetch error:', e);
    return NextResponse.json({ error: e.message ?? 'Failed to fetch' }, { status: 500 });
  }
}
