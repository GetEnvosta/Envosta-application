import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16' as any,
  });
}

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  const stripe = getStripe();
  try {
    const {
      name,
      email,
      phone,
      businessName,
      industry,
      situation,
      contact,
      goals,
      size,
      domain,
      plan, // 'minimum' | 'growth' | 'performance' | ''
    } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // 1. Create or get Supabase user
    let userId: string;
    const { data: existingUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUsers?.id) {
      userId = existingUsers.id;
    } else {
      // Create auth user with a temporary password (they'll reset via email)
      const tempPassword = `Env0sta_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: name },
      });

      if (authErr) {
        // User might exist in auth but not in users table
        if (authErr.message?.includes('already been registered')) {
          const { data: authList } = await supabaseAdmin.auth.admin.listUsers();
          const existingAuth = authList?.users?.find(u => u.email === email);
          if (existingAuth) {
            userId = existingAuth.id;
          } else {
            return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
          }
        } else {
          console.error('Auth error:', authErr);
          return NextResponse.json({ error: authErr.message }, { status: 500 });
        }
      } else {
        userId = authData.user.id;
      }

      // Ensure user profile exists
      await supabaseAdmin.from('users').upsert({
        id: userId,
        email,
        full_name: name,
        phone: phone || null,
        company_name: businessName || null,
        role: 'customer',
      }, { onConflict: 'id' });
    }

    // 2. Store signup metadata on the user
    await supabaseAdmin.from('users').update({
      metadata: {
        signup_situation: situation || null,
        signup_contact: contact || null,
        signup_industry: industry || null,
        signup_goals: goals || null,
        signup_size: size || null,
        signup_domain: domain || null,
        signup_plan: plan || null,
        signup_at: new Date().toISOString(),
      },
    }).eq('id', userId);

    // 3. Resolve plan → Stripe price ID
    let priceId: string | null = null;
    if (plan) {
      const { data: planData } = await supabaseAdmin
        .from('plans')
        .select('stripe_price_id_monthly')
        .eq('slug', plan)
        .single();
      priceId = planData?.stripe_price_id_monthly ?? null;
    }

    // If no plan selected (came through recommendation flow without pre-select),
    // redirect to pricing page instead of checkout
    if (!priceId) {
      return NextResponse.json({ redirect: '/pricing' });
    }

    // 4. Get or create Stripe customer
    let { data: customer } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!customer?.stripe_customer_id) {
      const sc = await stripe.customers.create({
        email,
        name,
        phone: phone || undefined,
        metadata: { supabase_user_id: userId },
      });
      await supabaseAdmin.from('customers').upsert({
        user_id: userId,
        stripe_customer_id: sc.id,
        billing_email: email,
        billing_name: name,
      }, { onConflict: 'user_id' });
      customer = { stripe_customer_id: sc.id };
    }

    // 5. Build Stripe Checkout session
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];

    // Add domain if provided
    if (domain) {
      const tld = domain.split('.').pop()?.toLowerCase() ?? '';
      const { data: tldPricing } = await supabaseAdmin
        .from('domain_pricing')
        .select('stripe_price_id_yearly, registration_price_cad')
        .eq('tld', tld)
        .maybeSingle();

      if (tldPricing?.stripe_price_id_yearly) {
        lineItems.push({ price: tldPricing.stripe_price_id_yearly, quantity: 1 });
      } else if (tldPricing?.registration_price_cad) {
        lineItems.push({
          price_data: {
            currency: 'cad',
            unit_amount: tldPricing.registration_price_cad,
            product_data: { name: `Domain Registration: ${domain} (1 year)` },
          },
          quantity: 1,
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customer.stripe_customer_id,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://my.envosta.com'}/dashboard/sites?checkout=success${domain ? `&domain=${domain}` : ''}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://envosta.com'}/get-started?plan=${plan}`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          ...(domain && { domain_name: domain }),
        },
      },
      metadata: {
        supabase_user_id: userId,
        ...(domain && { domain_name: domain }),
      },
    });

    // 6. Send password reset email so user can log into dashboard later
    await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://my.envosta.com'}/auth/reset-password`,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (e: any) {
    console.error('Signup checkout error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
