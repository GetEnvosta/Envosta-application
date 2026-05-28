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
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Create or update a Stripe product. Searches for existing product by metadata before creating. */
async function upsertProduct(
  stripe: Stripe, productId: string | null, name: string,
  description: string, metadata: Record<string, string>, active = true,
): Promise<string> {
  if (productId) {
    try {
      await stripe.products.update(productId, { name, description, active, metadata });
      return productId;
    } catch {
      // Product doesn't exist in Stripe anymore — fall through to search/create
    }
  }

  // Search for existing Stripe product by our envosta_product_id metadata
  if (metadata.envosta_product_id) {
    try {
      const existing = await stripe.products.search({
        query: `metadata["envosta_product_id"]:"${metadata.envosta_product_id}"`,
      });
      if (existing.data.length > 0) {
        const found = existing.data[0];
        await stripe.products.update(found.id, { name, description, active, metadata });
        return found.id;
      }
    } catch { /* search not available or failed, fall through */ }
  }

  const product = await stripe.products.create({ name, description, metadata, active });
  return product.id;
}

/**
 * Create or update a Stripe price.
 *
 * Stripe prices are immutable, so to "update" we deactivate the old one
 * and create a new one. To prevent duplicate prices when the DB is missing
 * the stripe_price_id but Stripe already has a matching price on the
 * product (common after a manual import or a DB row that lost its
 * stripe_price_id_*_cad), we always scan the product's active prices for
 * an exact match before falling back to create.
 *
 * Match criteria:
 *   - unit_amount equal
 *   - currency equal (lowercase)
 *   - interval + interval_count equal (or both null for one-time)
 *   - price is active
 */
async function upsertPrice(
  stripe: Stripe, priceId: string | null, productId: string,
  amount: number, interval: 'month' | 'year' | null, metadata: Record<string, string> = {},
  intervalCount = 1, currency: 'usd' | 'cad' = 'usd',
  knownPrices?: Stripe.Price[],
): Promise<string | null> {
  if (amount <= 0) return priceId;

  const matchesSpec = (p: Stripe.Price): boolean => {
    if (!p.active) return false;
    if (p.unit_amount !== amount) return false;
    if (p.currency !== currency) return false;
    if (interval) {
      return p.recurring?.interval === interval
        && (p.recurring?.interval_count ?? 1) === intervalCount;
    }
    return !p.recurring;
  };

  // 1. If the DB has a price ID, try it first.
  if (priceId) {
    try {
      const existing = await stripe.prices.retrieve(priceId);
      if (matchesSpec(existing)) return priceId;
      // Spec changed — deactivate the old price; we'll either find/create
      // a replacement below.
      if (existing.active) await stripe.prices.update(priceId, { active: false });
    } catch { /* price doesn't exist in Stripe, fall through */ }
  }

  // 2. Search the product's active prices for one already matching the spec.
  //    This is the duplicate-prevention layer.
  let pool = knownPrices;
  if (!pool) {
    pool = [];
    try {
      for await (const p of stripe.prices.list({ product: productId, active: true, limit: 100 })) {
        pool.push(p);
      }
    } catch { /* fall through to create */ }
  }
  const reuse = pool.find(matchesSpec);
  if (reuse) return reuse.id;

  // 3. No match anywhere — create a new price.
  const params: Stripe.PriceCreateParams = {
    product: productId, unit_amount: amount, currency, metadata,
  };
  if (interval) params.recurring = { interval, interval_count: intervalCount };

  const price = await stripe.prices.create(params);
  return price.id;
}

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const stripe = getStripe();
  const supabase = getSupabase();

  try {
    const { type, id, stripeProductId } = await req.json();

    // ═══ SYNC SINGLE PRODUCT (DB → Stripe) ═══
    if (type === 'product' && id) {
      const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json(await syncProduct(stripe, supabase, product));
    }

    // ═══ SYNC ALL — push every active product to Stripe ═══
    // TLDs live in `tlds` (not `products`) and never get synced to Stripe —
    // checkouts use inline price_data instead.
    if (type === 'sync_all') {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .neq('type', 'domain_tld')
        .eq('is_active', true);
      const results: string[] = [];

      for (const product of products ?? []) {
        try {
          await syncProduct(stripe, supabase, product);
          results.push(`${product.name} ✓`);
        } catch (e: any) {
          console.error(`Sync error for ${product.name}:`, e);
          results.push(`${product.name} ✗ ${e.message ?? ''}`);
        }
      }

      // Also import Stripe products not in our DB
      const imported = await importStripeProducts(stripe, supabase);
      for (const name of imported) {
        results.push(`Imported: ${name} ✓`);
      }

      return NextResponse.json({ success: true, results });
    }

    // ═══ IMPORT — pull a single Stripe product into our DB ═══
    if (type === 'import' && stripeProductId) {
      const result = await importSingleStripeProduct(stripe, supabase, stripeProductId);
      return NextResponse.json(result);
    }

    // Legacy type aliases (domain_tld is dropped — TLDs no longer have Stripe Products)
    if (['plan', 'addon', 'one_time_service'].includes(type) && id) {
      const { data: product } = await supabase.from('products').select('*').eq('id', id).single();
      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      return NextResponse.json(await syncProduct(stripe, supabase, product));
    }
    if (type === 'domain_tld') {
      return NextResponse.json(
        { error: 'TLDs do not sync to Stripe. Edit pricing in public.tlds via /api/admin/update-tld-price.' },
        { status: 410 },
      );
    }

    return NextResponse.json({ error: 'Unknown sync type' }, { status: 400 });
  } catch (e: any) {
    console.error('Stripe sync error:', e);
    return NextResponse.json({ error: e.message ?? 'Sync failed' }, { status: 500 });
  }
}

// ─── Sync DB product → Stripe ───────────────────────────

async function syncProduct(stripe: Stripe, supabase: any, product: any) {
  // domain_tld products don't exist in public.products — catch any stray
  // rows defensively and skip them.
  if (product.type === 'domain_tld') {
    return { success: false, skipped: true, reason: 'domain_tld products removed — pricing lives in public.tlds with inline checkout' };
  }

  const meta = product.metadata ?? {};

  // Build Stripe product metadata
  const stripeMeta: Record<string, string> = {
    envosta_product_id: product.id,
    envosta_type: product.type,
    envosta_slug: product.slug,
  };

  if (product.type === 'hosting_plan') {
    stripeMeta.storage_gb = String(meta.storage_gb ?? '');
    stripeMeta.php_workers_default = String(meta.php_workers_default ?? '');
    stripeMeta.php_workers_included = String(meta.php_workers_included ?? '');
    stripeMeta.php_memory_mb = String(meta.php_memory_mb ?? '');
    stripeMeta.onboarding_type = meta.onboarding_type ?? '';
    stripeMeta.support_type = meta.support_type ?? '';
  } else if (product.type === 'plan_addon') {
    stripeMeta.wpcloud_key = meta.wpcloud_key ?? '';
  }

  const stripeName = product.type === 'hosting_plan'
    ? `${product.name} Plan`
    : product.name;

  // Create or update Stripe product
  const productId = await upsertProduct(
    stripe, product.stripe_product_id, stripeName,
    product.description || stripeName, stripeMeta, product.is_active,
  );

  // USD and CAD prices — both synced to Stripe as separate price objects
  const priceUsd = product.price_usd || 0;
  const priceCad = product.price_cad || 0;
  const yearlyPriceUsd = product.price_yearly_usd || 0;
  const yearlyPriceCad = product.price_yearly_cad || 0;

  // Create or update prices (USD)
  let priceId = product.stripe_price_id;
  let yearlyPriceId = product.stripe_price_id_yearly;
  // CAD price IDs
  let priceIdCad = product.stripe_price_id_cad;
  let yearlyPriceIdCad = product.stripe_price_id_yearly_cad;
  const pMeta = { envosta_product_id: product.id };

  // Fetch the product's active prices ONCE up front so each upsertPrice
  // call can do an in-memory duplicate check instead of hitting Stripe
  // four separate times. Critical for not creating duplicate prices when
  // the DB has missing/stale stripe_price_id_* fields.
  const knownPrices: Stripe.Price[] = [];
  try {
    for await (const p of stripe.prices.list({ product: productId, active: true, limit: 100 })) {
      knownPrices.push(p);
    }
  } catch { /* if Stripe list fails, upsertPrice falls back to its own fetch */ }

  if (product.billing === 'monthly') {
    // USD prices
    if (priceUsd > 0) priceId = await upsertPrice(stripe, priceId, productId, priceUsd, 'month', pMeta, 1, 'usd', knownPrices);
    if (yearlyPriceUsd > 0) yearlyPriceId = await upsertPrice(stripe, yearlyPriceId, productId, yearlyPriceUsd, 'year', { ...pMeta, tier: '1yr' }, 1, 'usd', knownPrices);
    // CAD prices
    if (priceCad > 0) priceIdCad = await upsertPrice(stripe, priceIdCad, productId, priceCad, 'month', { ...pMeta, currency: 'cad' }, 1, 'cad', knownPrices);
    if (yearlyPriceCad > 0) yearlyPriceIdCad = await upsertPrice(stripe, yearlyPriceIdCad, productId, yearlyPriceCad, 'year', { ...pMeta, tier: '1yr', currency: 'cad' }, 1, 'cad', knownPrices);
  } else if (product.billing === 'yearly') {
    if (priceUsd > 0) priceId = await upsertPrice(stripe, priceId, productId, priceUsd, 'year', pMeta, 1, 'usd', knownPrices);
    if (priceCad > 0) priceIdCad = await upsertPrice(stripe, priceIdCad, productId, priceCad, 'year', { ...pMeta, currency: 'cad' }, 1, 'cad', knownPrices);
  } else if (product.billing === 'one_time') {
    if (priceUsd > 0) priceId = await upsertPrice(stripe, priceId, productId, priceUsd, null, pMeta, 1, 'usd', knownPrices);
    if (priceCad > 0) priceIdCad = await upsertPrice(stripe, priceIdCad, productId, priceCad, null, { ...pMeta, currency: 'cad' }, 1, 'cad', knownPrices);
  }

  // Save Stripe IDs back to DB
  const { error: dbError } = await supabase.from('products').update({
    stripe_product_id: productId,
    stripe_price_id: priceId,
    stripe_price_id_yearly: yearlyPriceId,
    stripe_price_id_cad: priceIdCad,
    stripe_price_id_yearly_cad: yearlyPriceIdCad,
  }).eq('id', product.id);

  if (dbError) console.error('Failed to save Stripe IDs to DB:', dbError);

  // Fetch actual Stripe price amounts for verification
  let stripePriceAmount: number | null = null;
  if (priceId) {
    try {
      const sp = await stripe.prices.retrieve(priceId);
      stripePriceAmount = sp.unit_amount;
    } catch { /* non-fatal */ }
  }

  return {
    success: true,
    stripe_product_id: productId,
    stripe_price_id: priceId,
    stripe_price_id_yearly: yearlyPriceId,
    stripe_price_id_cad: priceIdCad,
    stripe_price_id_yearly_cad: yearlyPriceIdCad,
    stripe_price_amount: stripePriceAmount,
    db_saved: !dbError,
  };
}

// ─── Import all unlinked Stripe products → DB ───────────

async function importStripeProducts(stripe: Stripe, supabase: any): Promise<string[]> {
  const stripeProducts: Stripe.Product[] = [];
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    stripeProducts.push(product);
  }

  // Fetch ALL DB products (with and without stripe IDs)
  const { data: allDbProducts } = await supabase
    .from('products')
    .select('id, stripe_product_id');

  const dbStripeIds = new Set((allDbProducts ?? []).filter((p: any) => p.stripe_product_id).map((p: any) => p.stripe_product_id));
  const allDbIds = new Set((allDbProducts ?? []).map((p: any) => p.id));

  // A Stripe product is "linked" if:
  // 1. Its ID is stored as stripe_product_id on any DB product, OR
  // 2. Its metadata.envosta_product_id matches an existing DB product ID
  const unlinked = stripeProducts.filter(sp => {
    if (dbStripeIds.has(sp.id)) return false;
    if (sp.metadata?.envosta_product_id && allDbIds.has(sp.metadata.envosta_product_id)) {
      // Auto-link: this Stripe product belongs to a DB product, just save the ID
      supabase.from('products').update({ stripe_product_id: sp.id }).eq('id', sp.metadata.envosta_product_id);
      return false;
    }
    return true;
  });

  const imported: string[] = [];
  for (const sp of unlinked) {
    try {
      await importSingleStripeProduct(stripe, supabase, sp.id);
      imported.push(sp.name);
    } catch (e) {
      console.error(`Import error for ${sp.name}:`, e);
    }
  }

  return imported;
}

async function importSingleStripeProduct(stripe: Stripe, supabase: any, stripeProductId: string) {
  const sp = await stripe.products.retrieve(stripeProductId);

  // Check if already linked
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('stripe_product_id', stripeProductId)
    .maybeSingle();

  if (existing) return { success: true, id: existing.id, message: 'Already linked' };

  // Fetch the default/active price
  const prices = await stripe.prices.list({ product: stripeProductId, active: true, limit: 5 });
  const defaultPrice = prices.data[0];

  // Determine product type from metadata or name.
  // Never default an imported Stripe product to 'domain_tld' — TLDs live
  // in public.tlds and have no Stripe representation.
  const meta = sp.metadata ?? {};
  let type = meta.envosta_type || 'one_time_service';
  if (type === 'domain_tld') type = 'one_time_service';
  if (sp.name.toLowerCase().includes('plan') || sp.name.toLowerCase().includes('hosting')) type = 'hosting_plan';

  // Determine billing from Stripe price
  let billing = 'one_time';
  if (defaultPrice?.recurring) {
    billing = defaultPrice.recurring.interval === 'month' ? 'monthly' : 'yearly';
  }

  const slug = meta.envosta_slug || sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

  const { data: inserted, error } = await supabase.from('products').insert({
    type,
    name: sp.name,
    slug,
    billing,
    price_usd: defaultPrice?.unit_amount ?? 0,
    price_cad: 0,
    is_active: sp.active,
    stripe_product_id: sp.id,
    stripe_price_id: defaultPrice?.id ?? null,
    metadata: { imported_from_stripe: true, stripe_description: sp.description },
    features: [],
  }).select('id').single();

  if (error) throw new Error(error.message);
  return { success: true, id: inserted.id, name: sp.name };
}
