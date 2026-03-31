import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: customer } = await sb.from('users').select('stripe_customer_id').eq('id', user.id).maybeSingle();

  if (!customer?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  // Use a restricted portal configuration — payment method only, no subscription management
  // Find existing config or create one
  let configId = process.env.STRIPE_PORTAL_CONFIG_ID;
  if (!configId) {
    const configs = await stripe.billingPortal.configurations.list({ limit: 10 });
    const existing = configs.data.find((c: any) =>
      c.features?.payment_method_update?.enabled === true &&
      c.features?.subscription_cancel?.enabled === false
    );
    if (existing) {
      configId = existing.id;
    } else {
      const created = await stripe.billingPortal.configurations.create({
        business_profile: { headline: 'Manage your payment method' },
        features: {
          payment_method_update: { enabled: true },
          customer_update: { enabled: true, allowed_updates: ['email'] },
          subscription_cancel: { enabled: false },
          subscription_update: { enabled: false },
          invoice_history: { enabled: false },
        },
      });
      configId = created.id;
    }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    configuration: configId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://my.envosta.com'}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
