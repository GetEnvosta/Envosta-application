import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const stripe = getStripe();
  const supabase = getSupabase();

  try {
    const { type, id, data } = await req.json();

    // ════════════════════════════════════════
    // SYNC PLAN TO STRIPE
    // ════════════════════════════════════════
    if (type === 'plan') {
      const { name, description, price_monthly, price_yearly, is_active, stripe_product_id, stripe_price_id_monthly, stripe_price_id_yearly,
        storage_gb, bandwidth_gb, default_php_workers, max_php_workers, php_memory_mb, onboarding_type, support_response_hours } = data;

      let productId = stripe_product_id;

      const productMetadata = {
        envosta_plan_id: id,
        type: 'hosting_plan',
        storage_gb: String(storage_gb ?? ''),
        bandwidth_gb: String(bandwidth_gb ?? ''),
        default_php_workers: String(default_php_workers ?? ''),
        max_php_workers: String(max_php_workers ?? ''),
        php_memory_mb: String(php_memory_mb ?? ''),
        onboarding_type: onboarding_type ?? '',
        support_response_hours: String(support_response_hours ?? ''),
      };

      // Create or update product
      if (!productId) {
        const product = await stripe.products.create({
          name: `${name} Plan`,
          description: description || `${name} hosting plan`,
          metadata: productMetadata,
        });
        productId = product.id;
      } else {
        await stripe.products.update(productId, {
          name: `${name} Plan`,
          description: description || `${name} hosting plan`,
          active: is_active,
          metadata: productMetadata,
        });
      }

      // Handle monthly price
      let monthlyPriceId = stripe_price_id_monthly;
      if (monthlyPriceId) {
        // Check if price amount changed
        const existingPrice = await stripe.prices.retrieve(monthlyPriceId);
        if (existingPrice.unit_amount !== price_monthly) {
          // Archive old price, create new one
          await stripe.prices.update(monthlyPriceId, { active: false });
          const newPrice = await stripe.prices.create({
            product: productId,
            unit_amount: price_monthly,
            currency: 'cad',
            recurring: { interval: 'month' },
            metadata: { envosta_plan_id: id },
          });
          monthlyPriceId = newPrice.id;
        }
      } else if (price_monthly > 0) {
        const newPrice = await stripe.prices.create({
          product: productId,
          unit_amount: price_monthly,
          currency: 'cad',
          recurring: { interval: 'month' },
          metadata: { envosta_plan_id: id },
        });
        monthlyPriceId = newPrice.id;
      }

      // Handle yearly price
      let yearlyPriceId = stripe_price_id_yearly;
      if (yearlyPriceId) {
        const existingPrice = await stripe.prices.retrieve(yearlyPriceId);
        if (existingPrice.unit_amount !== price_yearly) {
          await stripe.prices.update(yearlyPriceId, { active: false });
          const newPrice = await stripe.prices.create({
            product: productId,
            unit_amount: price_yearly,
            currency: 'cad',
            recurring: { interval: 'year' },
            metadata: { envosta_plan_id: id },
          });
          yearlyPriceId = newPrice.id;
        }
      } else if (price_yearly > 0) {
        const newPrice = await stripe.prices.create({
          product: productId,
          unit_amount: price_yearly,
          currency: 'cad',
          recurring: { interval: 'year' },
          metadata: { envosta_plan_id: id },
        });
        yearlyPriceId = newPrice.id;
      }

      // Update DB with Stripe IDs
      await supabase.from('plans').update({
        stripe_product_id: productId,
        stripe_price_id_monthly: monthlyPriceId,
        stripe_price_id_yearly: yearlyPriceId,
      }).eq('id', id);

      return NextResponse.json({
        success: true,
        stripe_product_id: productId,
        stripe_price_id_monthly: monthlyPriceId,
        stripe_price_id_yearly: yearlyPriceId,
      });
    }

    // ════════════════════════════════════════
    // SYNC DOMAIN TLD TO STRIPE
    // ════════════════════════════════════════
    if (type === 'domain_tld') {
      const { tld, renewal_price_cad, stripe_product_id, stripe_price_id_yearly, active } = data;

      let productId = stripe_product_id;

      // Create or update product
      if (!productId) {
        const product = await stripe.products.create({
          name: `.${tld} Domain Registration`,
          description: `Domain registration and annual renewal for .${tld} domains`,
          metadata: { tld, type: 'domain_registration' },
        });
        productId = product.id;
      } else {
        await stripe.products.update(productId, {
          name: `.${tld} Domain Registration`,
          active,
        });
      }

      // Handle yearly price
      let yearlyPriceId = stripe_price_id_yearly;
      if (yearlyPriceId) {
        const existingPrice = await stripe.prices.retrieve(yearlyPriceId);
        if (existingPrice.unit_amount !== renewal_price_cad) {
          await stripe.prices.update(yearlyPriceId, { active: false });
          const newPrice = await stripe.prices.create({
            product: productId,
            unit_amount: renewal_price_cad,
            currency: 'cad',
            recurring: { interval: 'year' },
            metadata: { tld },
          });
          yearlyPriceId = newPrice.id;
        }
      } else if (renewal_price_cad > 0) {
        const newPrice = await stripe.prices.create({
          product: productId,
          unit_amount: renewal_price_cad,
          currency: 'cad',
          recurring: { interval: 'year' },
          metadata: { tld },
        });
        yearlyPriceId = newPrice.id;
      }

      // Update DB
      await supabase.from('domain_pricing').update({
        stripe_product_id: productId,
        stripe_price_id_yearly: yearlyPriceId,
      }).eq('id', id);

      return NextResponse.json({
        success: true,
        stripe_product_id: productId,
        stripe_price_id_yearly: yearlyPriceId,
      });
    }

    // ════════════════════════════════════════
    // SYNC ALL — bulk sync everything missing Stripe IDs
    // ════════════════════════════════════════
    if (type === 'sync_all') {
      const results: string[] = [];

      // Sync plans
      const { data: plans } = await supabase.from('plans').select('*').eq('is_active', true);
      for (const plan of plans ?? []) {
        if (!plan.stripe_product_id || !plan.stripe_price_id_monthly) {
          const res = await fetch(req.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'plan', id: plan.id, data: plan }),
          });
          if (res.ok) results.push(`Plan: ${plan.name} ✓`);
          else results.push(`Plan: ${plan.name} ✗`);
        }
      }

      // Sync TLDs
      const { data: tlds } = await supabase.from('domain_pricing').select('*').eq('active', true);
      for (const tld of tlds ?? []) {
        if (!tld.stripe_product_id || !tld.stripe_price_id_yearly) {
          const res = await fetch(req.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'domain_tld', id: tld.id, data: tld }),
          });
          if (res.ok) results.push(`TLD: .${tld.tld} ✓`);
          else results.push(`TLD: .${tld.tld} ✗`);
        }
      }

      return NextResponse.json({ success: true, results });
    }

    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (e: any) {
    console.error('Stripe sync error:', e);
    return NextResponse.json({ error: e.message ?? 'Sync failed' }, { status: 500 });
  }
}
