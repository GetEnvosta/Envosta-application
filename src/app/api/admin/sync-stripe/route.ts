import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Create or update a Stripe product. */
async function upsertProduct(
  stripe: Stripe, productId: string | null, name: string,
  description: string, metadata: Record<string, string>, active = true,
): Promise<string> {
  if (!productId) {
    const product = await stripe.products.create({ name, description, metadata });
    return product.id;
  }
  await stripe.products.update(productId, { name, description, active, metadata });
  return productId;
}

/** Create or update a Stripe price. */
async function upsertPrice(
  stripe: Stripe, priceId: string | null, productId: string,
  amount: number, interval: 'month' | 'year' | null, metadata: Record<string, string> = {},
): Promise<string | null> {
  if (amount <= 0) return priceId;

  if (priceId) {
    const existing = await stripe.prices.retrieve(priceId);
    if (existing.unit_amount === amount) return priceId;
    await stripe.prices.update(priceId, { active: false });
  }

  const params: Stripe.PriceCreateParams = {
    product: productId, unit_amount: amount, currency: 'cad', metadata,
  };
  if (interval) params.recurring = { interval };

  const price = await stripe.prices.create(params);
  return price.id;
}

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const supabase = getSupabase();
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? user : null;
}

// ─── Route ───────────────────────────────────────────────

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const stripe = getStripe();
  const supabase = getSupabase();

  try {
    const { type, id } = await req.json();

    // ═══════════════════════════════════════════════════════
    // SYNC SINGLE PRODUCT (any type)
    // ═══════════════════════════════════════════════════════
    if (type === 'product' && id) {
      const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

      return NextResponse.json(await syncProduct(stripe, supabase, product));
    }

    // ═══════════════════════════════════════════════════════
    // SYNC ALL — bulk sync everything missing Stripe IDs
    // ═══════════════════════════════════════════════════════
    if (type === 'sync_all') {
      const { data: products } = await supabase.from('products').select('*').eq('is_active', true);
      const results: string[] = [];

      for (const product of products ?? []) {
        const needsSync = !product.stripe_product_id || !product.stripe_price_id
          || (product.billing === 'monthly' && product.price_yearly_cad && !product.stripe_price_id_yearly);

        if (needsSync) {
          try {
            await syncProduct(stripe, supabase, product);
            results.push(`${product.name} ✓`);
          } catch (e) {
            console.error(`Sync error for ${product.name}:`, e);
            results.push(`${product.name} ✗`);
          }
        }
      }

      return NextResponse.json({ success: true, results });
    }

    // Legacy type aliases for backwards compatibility with admin pages
    if (['plan', 'domain_tld', 'addon', 'one_time_service'].includes(type) && id) {
      const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json(await syncProduct(stripe, supabase, product));
    }

    return NextResponse.json({ error: 'Unknown sync type' }, { status: 400 });
  } catch (e: any) {
    console.error('Stripe sync error:', e);
    return NextResponse.json({ error: e.message ?? 'Sync failed' }, { status: 500 });
  }
}

// ─── Unified sync function ───────────────────────────────

async function syncProduct(stripe: Stripe, supabase: any, product: any) {
  const meta = product.metadata ?? {};

  // Build Stripe product metadata
  const stripeMeta: Record<string, string> = {
    envosta_product_id: product.id,
    envosta_type: product.type,
    envosta_slug: product.slug,
  };

  // Add type-specific metadata for Stripe
  if (product.type === 'hosting_plan') {
    stripeMeta.storage_gb = String(meta.storage_gb ?? '');
    stripeMeta.php_workers_default = String(meta.php_workers_default ?? '');
    stripeMeta.php_workers_included = String(meta.php_workers_included ?? '');
    stripeMeta.php_memory_mb = String(meta.php_memory_mb ?? '');
    stripeMeta.onboarding_type = meta.onboarding_type ?? '';
    stripeMeta.support_type = meta.support_type ?? '';
  } else if (product.type === 'domain_tld') {
    stripeMeta.tld = meta.tld ?? '';
  } else if (product.type === 'plan_addon') {
    stripeMeta.wpcloud_key = meta.wpcloud_key ?? '';
  }

  // Product name for Stripe
  const stripeName = product.type === 'hosting_plan'
    ? `${product.name} Plan`
    : product.type === 'domain_tld'
      ? `.${meta.tld ?? product.slug} Domain Registration`
      : product.name;

  // Create or update Stripe product
  const productId = await upsertProduct(
    stripe, product.stripe_product_id, stripeName,
    product.description || stripeName, stripeMeta, product.is_active,
  );

  // Create or update prices based on billing type
  let priceId = product.stripe_price_id;
  let yearlyPriceId = product.stripe_price_id_yearly;

  if (product.billing === 'monthly') {
    priceId = await upsertPrice(stripe, priceId, productId, product.price_cad, 'month', { envosta_product_id: product.id });
    if (product.price_yearly_cad && product.price_yearly_cad > 0) {
      yearlyPriceId = await upsertPrice(stripe, yearlyPriceId, productId, product.price_yearly_cad, 'year', { envosta_product_id: product.id });
    }
  } else if (product.billing === 'yearly') {
    priceId = await upsertPrice(stripe, priceId, productId, product.price_cad, 'year', { envosta_product_id: product.id });
  } else if (product.billing === 'one_time') {
    priceId = await upsertPrice(stripe, priceId, productId, product.price_cad, null, { envosta_product_id: product.id });
  }

  // Save Stripe IDs back to DB
  await supabase.from('products').update({
    stripe_product_id: productId,
    stripe_price_id: priceId,
    stripe_price_id_yearly: yearlyPriceId,
  }).eq('id', product.id);

  return {
    success: true,
    stripe_product_id: productId,
    stripe_price_id: priceId,
    stripe_price_id_yearly: yearlyPriceId,
  };
}
