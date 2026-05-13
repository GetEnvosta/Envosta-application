import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id, price_cad, is_active, sync } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

  // Get current product
  const { data: product } = await sb.from('products').select('*').eq('id', id).single();
  if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

  // Update DB price if provided
  const updates: any = { updated_at: new Date().toISOString() };
  if (price_cad !== undefined) updates.price_cad = price_cad;
  if (is_active !== undefined) updates.is_active = is_active;
  await sb.from('products').update(updates).eq('id', id);

  const effectivePrice = price_cad ?? product.price_cad;

  // Sync to Stripe if requested
  if (sync) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

    try {
      let stripeProductId = product.stripe_product_id;

      // Create Stripe product if doesn't exist
      if (!stripeProductId) {
        const tldName = product.slug.replace('tld-', '.').toUpperCase();
        const stripeProduct = await stripe.products.create({
          name: `Domain Registration — ${tldName}`,
          metadata: { envosta_product_id: id, envosta_slug: product.slug, envosta_type: 'domain_tld' },
        });
        stripeProductId = stripeProduct.id;
        await sb.from('products').update({ stripe_product_id: stripeProductId }).eq('id', id);
      }

      // Create new Stripe price (prices are immutable in Stripe, so always create new)
      const stripePrice = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: effectivePrice, // already in cents
        currency: 'cad',
        recurring: { interval: 'year' },
        metadata: { envosta_product_id: id },
      });

      // Update DB with new Stripe price ID
      await sb.from('products').update({
        stripe_price_id: stripePrice.id,
        stripe_product_id: stripeProductId,
      }).eq('id', id);

      return NextResponse.json({ success: true, synced: true, stripe_price_id: stripePrice.id });
    } catch (e: any) {
      console.error('Stripe sync error:', e);
      return NextResponse.json({ error: `Stripe sync failed: ${e.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
