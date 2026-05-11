import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!, { auth: { persistSession: false } });
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single();
  return ['admin', 'affiliate'].includes(profile?.role) ? user : null;
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

// GET — list all coupons with their promo codes
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const stripe = getStripe();

  try {
    const coupons = await stripe.coupons.list({ limit: 50 });
    const result = [];

    for (const coupon of coupons.data) {
      const promos = await stripe.promotionCodes.list({ coupon: coupon.id, limit: 10 });
      result.push({
        id: coupon.id,
        name: coupon.name ?? coupon.id,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        currency: coupon.currency ?? 'usd',
        duration: coupon.duration,
        duration_in_months: coupon.duration_in_months,
        times_redeemed: coupon.times_redeemed,
        max_redemptions: coupon.max_redemptions,
        promo_codes: promos.data.map(p => ({
          id: p.id,
          code: p.code,
          active: p.active,
          times_redeemed: p.times_redeemed,
        })),
      });
    }

    return NextResponse.json({ coupons: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create coupon + promotion code
export async function POST(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const stripe = getStripe();

  try {
    const { name, discount_type, percent_off, amount_off, duration, duration_in_months, max_redemptions, promo_code } = await req.json();

    const couponParams: Stripe.CouponCreateParams = {
      name,
      duration,
      ...(duration === 'repeating' && { duration_in_months }),
      ...(max_redemptions && { max_redemptions }),
    };

    if (discount_type === 'percent') {
      couponParams.percent_off = percent_off;
    } else {
      couponParams.amount_off = amount_off;
      couponParams.currency = 'cad';
    }

    const coupon = await stripe.coupons.create(couponParams);

    // Create the promotion code
    await (stripe.promotionCodes as any).create({
      coupon: coupon.id,
      code: promo_code,
    });

    return NextResponse.json({ success: true, coupon_id: coupon.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE — delete a coupon
export async function DELETE(req: Request) {
  const admin = await verifyAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const stripe = getStripe();

  try {
    const { coupon_id } = await req.json();
    await stripe.coupons.del(coupon_id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
