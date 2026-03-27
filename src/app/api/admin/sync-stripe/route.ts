import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

// ─── Clients ─────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────

/** Create or update a Stripe product. Returns the product ID. */
async function upsertProduct(
  stripe: Stripe,
  productId: string | null,
  name: string,
  description: string,
  metadata: Record<string, string>,
  active = true,
): Promise<string> {
  if (!productId) {
    const product = await stripe.products.create({ name, description, metadata });
    return product.id;
  }
  await stripe.products.update(productId, { name, description, active, metadata });
  return productId;
}

/** Create, update, or leave a Stripe recurring price. Returns the price ID. */
async function upsertPrice(
  stripe: Stripe,
  priceId: string | null,
  productId: string,
  amount: number,
  interval: 'month' | 'year',
  metadata: Record<string, string> = {},
): Promise<string | null> {
  if (amount <= 0) return priceId;

  if (priceId) {
    const existing = await stripe.prices.retrieve(priceId);
    if (existing.unit_amount === amount) return priceId; // unchanged
    await stripe.prices.update(priceId, { active: false }); // archive old
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount,
    currency: 'cad',
    recurring: { interval },
    metadata,
  });
  return price.id;
}

/** Create, update, or leave a Stripe price (recurring or one-time). Returns the price ID. */
async function upsertFlexPrice(
  stripe: Stripe,
  priceId: string | null,
  productId: string,
  amount: number,
  billingType: string,
  metadata: Record<string, string> = {},
): Promise<string | null> {
  if (amount <= 0) return priceId;

  if (priceId) {
    const existing = await stripe.prices.retrieve(priceId);
    if (existing.unit_amount === amount) return priceId;
    await stripe.prices.update(priceId, { active: false });
  }

  const interval = billingType === 'yearly' ? 'year' : billingType === 'monthly' ? 'month' : null;
  const params: Stripe.PriceCreateParams = {
    product: productId,
    unit_amount: amount,
    currency: 'cad',
    metadata,
  };
  if (interval) params.recurring = { interval };

  const price = await stripe.prices.create(params);
  return price.id;
}

// ─── Auth ────────────────────────────────────────────────

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
    const { type, id, data } = await req.json();

    // ═══════════════════════════════════════════════════════
    // HOSTING PLANS → Stripe product + monthly/yearly prices
    // ═══════════════════════════════════════════════════════
    if (type === 'plan') {
      const { name, description, price_cad, price_yearly_cad, is_active,
        storage_gb, bandwidth_gb, default_php_workers, max_php_workers,
        php_memory_mb, onboarding_type, support_response_hours } = data;

      const { data: db } = await supabase
        .from('products')
        .select('stripe_product_id, stripe_price_id, stripe_price_id_yearly')
        .eq('id', id).single();

      const metadata = {
        envosta_plan_id: id, type: 'hosting_plan',
        storage_gb: String(storage_gb ?? ''), bandwidth_gb: String(bandwidth_gb ?? ''),
        default_php_workers: String(default_php_workers ?? ''), max_php_workers: String(max_php_workers ?? ''),
        php_memory_mb: String(php_memory_mb ?? ''), onboarding_type: onboarding_type ?? '',
        support_response_hours: String(support_response_hours ?? ''),
      };

      const productId = await upsertProduct(
        stripe, db?.stripe_product_id ?? data.stripe_product_id ?? null,
        `${name} Plan`, description || `${name} hosting plan`, metadata, is_active,
      );

      const monthlyPriceId = await upsertPrice(
        stripe, db?.stripe_price_id ?? data.stripe_price_id ?? null,
        productId, price_cad, 'month', { envosta_plan_id: id },
      );

      const yearlyPriceId = await upsertPrice(
        stripe, db?.stripe_price_id_yearly ?? data.stripe_price_id_yearly ?? null,
        productId, price_yearly_cad, 'year', { envosta_plan_id: id },
      );

      await supabase.from('products').update({
        stripe_product_id: productId,
        stripe_price_id: monthlyPriceId,
        stripe_price_id_yearly: yearlyPriceId,
      }).eq('id', id);

      return NextResponse.json({
        success: true, stripe_product_id: productId,
        stripe_price_id: monthlyPriceId, stripe_price_id_yearly: yearlyPriceId,
      });
    }

    // ═══════════════════════════════════════════════════════
    // DOMAIN TLDs → Stripe product + yearly renewal price
    // ═══════════════════════════════════════════════════════
    if (type === 'domain_tld') {
      const { tld, renewal_price_cad, active } = data;

      const { data: db } = await supabase
        .from('products')
        .select('stripe_product_id, stripe_price_id_yearly')
        .eq('id', id).single();

      const productId = await upsertProduct(
        stripe, db?.stripe_product_id ?? data.stripe_product_id ?? null,
        `.${tld} Domain Registration`,
        `Domain registration and annual renewal for .${tld} domains`,
        { tld, type: 'domain_registration' }, active,
      );

      const yearlyPriceId = await upsertPrice(
        stripe, db?.stripe_price_id_yearly ?? data.stripe_price_id_yearly ?? null,
        productId, renewal_price_cad, 'year', { tld },
      );

      await supabase.from('products').update({
        stripe_product_id: productId,
        stripe_price_id_yearly: yearlyPriceId,
      }).eq('id', id);

      return NextResponse.json({
        success: true, stripe_product_id: productId, stripe_price_id_yearly: yearlyPriceId,
      });
    }

    // ═══════════════════════════════════════════════════════
    // PLAN ADD-ONS → Stripe product + price (recurring or one-time)
    // ═══════════════════════════════════════════════════════
    if (type === 'addon') {
      const { name, description, price_cad, billing_type, is_active, slug } = data;

      const { data: db } = await supabase
        .from('products')
        .select('stripe_product_id, stripe_price_id')
        .eq('id', id).single();

      const productId = await upsertProduct(
        stripe, db?.stripe_product_id ?? data.stripe_product_id ?? null,
        name, description || `${name} add-on`,
        { envosta_addon_slug: slug, type: 'addon' }, is_active,
      );

      const priceId = await upsertFlexPrice(
        stripe, db?.stripe_price_id ?? data.stripe_price_id ?? null,
        productId, price_cad, billing_type, { envosta_addon_slug: slug },
      );

      await supabase.from('products').update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
      }).eq('id', id);

      return NextResponse.json({
        success: true, stripe_product_id: productId, stripe_price_id: priceId,
      });
    }

    // ═══════════════════════════════════════════════════════
    // SYNC ALL — bulk create missing Stripe products + prices
    // ═══════════════════════════════════════════════════════
    if (type === 'sync_all') {
      const results: string[] = [];

      // Plans
      const { data: plans } = await supabase.from('products').select('*').eq('is_active', true);
      for (const plan of plans ?? []) {
        if (!plan.stripe_product_id || !plan.stripe_price_id || !plan.stripe_price_id_yearly) {
          try {
            const pid = await upsertProduct(stripe, plan.stripe_product_id, `${plan.name} Plan`, plan.description || '', { envosta_plan_id: plan.id, type: 'hosting_plan' });
            const mId = plan.stripe_price_id || (plan.price_cad > 0 ? (await stripe.prices.create({ product: pid, unit_amount: plan.price_cad, currency: 'cad', recurring: { interval: 'month' } })).id : null);
            const yId = plan.stripe_price_id_yearly || (plan.price_yearly_cad > 0 ? (await stripe.prices.create({ product: pid, unit_amount: plan.price_yearly_cad, currency: 'cad', recurring: { interval: 'year' } })).id : null);
            await supabase.from('products').update({ stripe_product_id: pid, stripe_price_id: mId, stripe_price_id_yearly: yId }).eq('id', plan.id);
            results.push(`Plan: ${plan.name} ✓`);
          } catch (e) { console.error('Plan sync error:', e); results.push(`Plan: ${plan.name} ✗`); }
        }
      }

      // TLDs
      const { data: tlds } = await supabase.from('products').select('*').eq('active', true);
      for (const tld of tlds ?? []) {
        if (!tld.stripe_product_id || !tld.stripe_price_id_yearly) {
          try {
            const pid = await upsertProduct(stripe, tld.stripe_product_id, `.${tld.tld} Domain Registration`, '', { tld: tld.tld, type: 'domain_registration' });
            const yId = tld.stripe_price_id_yearly || (tld.renewal_price_cad > 0 ? (await stripe.prices.create({ product: pid, unit_amount: tld.renewal_price_cad, currency: 'cad', recurring: { interval: 'year' } })).id : null);
            await supabase.from('products').update({ stripe_product_id: pid, stripe_price_id_yearly: yId }).eq('id', tld.id);
            results.push(`TLD: .${tld.tld} ✓`);
          } catch (e) { console.error('TLD sync error:', e); results.push(`TLD: .${tld.tld} ✗`); }
        }
      }

      // Add-ons
      const { data: addons } = await supabase.from('products').select('*').eq('is_active', true);
      for (const addon of addons ?? []) {
        if (!addon.stripe_product_id || !addon.stripe_price_id) {
          try {
            const pid = await upsertProduct(stripe, addon.stripe_product_id, addon.name, addon.description || '', { envosta_addon_slug: addon.slug, type: 'addon' });
            const priceId = await upsertFlexPrice(stripe, addon.stripe_price_id, pid, addon.price_cad, addon.billing_type, { envosta_addon_slug: addon.slug });
            await supabase.from('products').update({ stripe_product_id: pid, stripe_price_id: priceId }).eq('id', addon.id);
            results.push(`Addon: ${addon.name} ✓`);
          } catch (e) { console.error('Addon sync error:', e); results.push(`Addon: ${addon.name} ✗`); }
        }
      }

      // One-time services
      const { data: otServices } = await supabase.from('products').select('*').eq('is_active', true);
      for (const svc of otServices ?? []) {
        if (!svc.stripe_product_id || !svc.stripe_price_id) {
          try {
            const pid = await upsertProduct(stripe, svc.stripe_product_id, svc.name, svc.description || '', { envosta_service_slug: svc.slug, type: 'one_time_service' });
            const priceId = await upsertFlexPrice(stripe, svc.stripe_price_id, pid, svc.price_cad, 'one_time', { envosta_service_slug: svc.slug });
            await supabase.from('products').update({ stripe_product_id: pid, stripe_price_id: priceId }).eq('id', svc.id);
            results.push(`Service: ${svc.name} ✓`);
          } catch (e) { console.error('Service sync error:', e); results.push(`Service: ${svc.name} ✗`); }
        }
      }

      return NextResponse.json({ success: true, results });
    }

    // ═══════════════════════════════════════════════════════
    // ONE-TIME SERVICES → Stripe product + one-time price
    // ═══════════════════════════════════════════════════════
    if (type === 'one_time_service') {
      const { name, description, price_cad, is_active, slug } = data;

      const { data: db } = await supabase
        .from('products')
        .select('stripe_product_id, stripe_price_id')
        .eq('id', id).single();

      const productId = await upsertProduct(
        stripe, db?.stripe_product_id ?? data.stripe_product_id ?? null,
        name, description || `${name} — one-time service`,
        { envosta_service_slug: slug, type: 'one_time_service' }, is_active,
      );

      const priceId = await upsertFlexPrice(
        stripe, db?.stripe_price_id ?? data.stripe_price_id ?? null,
        productId, price_cad, 'one_time', { envosta_service_slug: slug },
      );

      await supabase.from('products').update({
        stripe_product_id: productId,
        stripe_price_id: priceId,
      }).eq('id', id);

      return NextResponse.json({
        success: true, stripe_product_id: productId, stripe_price_id: priceId,
      });
    }

    return NextResponse.json({ error: 'Unknown sync type' }, { status: 400 });
  } catch (e: any) {
    console.error('Stripe sync error:', e);
    return NextResponse.json({ error: e.message ?? 'Sync failed' }, { status: 500 });
  }
}
