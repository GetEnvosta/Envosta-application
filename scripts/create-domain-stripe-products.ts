/**
 * Run this script once to create Stripe products + yearly prices for all TLDs
 * and update the domain_pricing table with the Stripe IDs.
 *
 * Usage:
 *   npx tsx scripts/create-domain-stripe-products.ts
 *
 * Requires env vars: STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const { data: tlds, error } = await supabase
    .from('domain_pricing')
    .select('*')
    .eq('active', true)
    .order('tld');

  if (error || !tlds) {
    console.error('Failed to fetch TLDs:', error);
    process.exit(1);
  }

  console.log(`Found ${tlds.length} TLDs to process\n`);

  for (const tld of tlds) {
    // Skip if already has Stripe price
    if (tld.stripe_price_id_yearly) {
      console.log(`✓ .${tld.tld} — already has price: ${tld.stripe_price_id_yearly}`);
      continue;
    }

    const priceCad = tld.renewal_price_cad; // cents
    const displayPrice = `$${(priceCad / 100).toFixed(2)}`;

    console.log(`Creating .${tld.tld} domain product (${displayPrice} CAD/yr)...`);

    // Create Stripe product
    const product = await stripe.products.create({
      name: `.${tld.tld} Domain Registration`,
      description: `Domain registration and annual renewal for .${tld.tld} domains`,
      metadata: { tld: tld.tld, type: 'domain_registration' },
    });

    // Create yearly recurring price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceCad,
      currency: 'cad',
      recurring: { interval: 'year' },
      metadata: { tld: tld.tld },
    });

    // Update database
    await supabase
      .from('domain_pricing')
      .update({
        stripe_product_id: product.id,
        stripe_price_id_yearly: price.id,
      })
      .eq('id', tld.id);

    console.log(`  ✓ Product: ${product.id}`);
    console.log(`  ✓ Price: ${price.id} (${displayPrice}/yr)\n`);
  }

  console.log('Done! All TLD products created in Stripe.');
}

main().catch(console.error);
