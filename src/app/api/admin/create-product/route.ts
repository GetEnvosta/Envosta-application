import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { isAdminRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Verify admin
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { type, name, slug, billing, price_cad } = await req.json();

  const metadata = type === 'hosting_plan'
    ? { php_workers_default: 2, php_workers_included: 4, php_memory_mb: 512, storage_gb: 25, has_staging: true, has_backups: true, has_cdn: true, has_waf: true, onboarding_type: 'standard', support_type: 'tickets' }
    : {};

  const { data, error } = await supabase.from('products').insert({
    type, name, slug, billing,
    price_cad: price_cad ?? 0,
    is_active: true,
    metadata,
    features: [],
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}

export async function PUT(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

  const { error } = await supabase.from('products').update(fields).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

  // Fetch the product first to get stripe IDs
  const { data: product } = await supabase.from('products').select('stripe_product_id, stripe_price_id').eq('id', id).single();

  // Deactivate in Stripe if linked
  if (product?.stripe_product_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
      await stripe.products.update(product.stripe_product_id, { active: false });
      if (product.stripe_price_id) {
        await stripe.prices.update(product.stripe_price_id, { active: false });
      }
    } catch { /* non-fatal — product may already be deleted in Stripe */ }
  }

  // Try to delete from DB
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    // If FK constraint prevents delete, deactivate instead
    if (error.code === '23503') {
      const { error: updateError } = await supabase.from('products').update({ is_active: false }).eq('id', id);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
      return NextResponse.json({ success: true, deactivated: true, message: 'Product is referenced by subscriptions — deactivated instead of deleted.' });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
