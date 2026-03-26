import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

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
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`signup:${ip}`, 5, 300_000); // 5 signups per 5 minutes
  if (!allowed) {
    return NextResponse.json({ error: 'Too many signup attempts. Please wait a few minutes.' }, { status: 429 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server config: missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 503 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Server config: missing STRIPE_SECRET_KEY' }, { status: 503 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const stripe = getStripe();
  try {
    const {
      name,
      email,
      phone,
      password,
      businessName,
      industry,
      situation,
      contact,
      goals,
      size,
      domain,
      plan, // 'minimum' | 'growth' | 'performance' | ''
      onboarding, // 'self' | 'guided'
      billing, // 'monthly' | 'annual'
      termsAccepted,
      termsAcceptedAt,
      trial, // boolean — 14-day free trial on Minimum plan
    } = await req.json();

    // Input validation
    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 320) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || name.trim().length < 1 || name.length > 200) {
      return NextResponse.json({ error: 'Name is required (max 200 characters)' }, { status: 400 });
    }
    if (!termsAccepted) {
      return NextResponse.json({ error: 'You must accept the Terms of Service to continue' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Password must be 8–128 characters' }, { status: 400 });
    }
    if (plan && typeof plan === 'string' && !['minimum', 'growth', 'performance', ''].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }
    if (domain && typeof domain === 'string' && domain.length > 253) {
      return NextResponse.json({ error: 'Domain name too long' }, { status: 400 });
    }
    if (billing && !['monthly', 'annual'].includes(billing)) {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
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
      // Create auth user with their chosen password
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
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
        terms_accepted: termsAccepted ?? false,
        terms_accepted_at: termsAcceptedAt ?? new Date().toISOString(),
        terms_version: '2026-03-01',
      },
    }).eq('id', userId);

    // 3. Resolve plan → Stripe price ID
    let priceId: string | null = null;
    if (plan) {
      const { data: planData } = await supabaseAdmin
        .from('plans')
        .select('stripe_price_id_monthly, stripe_price_id_yearly, is_active')
        .eq('slug', plan)
        .single();
      if (planData && !planData.is_active) {
        return NextResponse.json({ error: 'This plan is no longer available' }, { status: 400 });
      }
      priceId = billing === 'annual'
        ? (planData?.stripe_price_id_yearly ?? planData?.stripe_price_id_monthly ?? null)
        : (planData?.stripe_price_id_monthly ?? null);
    }

    if (!priceId) {
      console.error('No Stripe price ID found for plan:', plan);
      return NextResponse.json({ error: `No pricing configured for the ${plan} plan. Please contact support.` }, { status: 400 });
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

    // Domain registration is free with first year of hosting plan.
    // No charge at checkout — domain gets registered by the webhook,
    // and a yearly renewal subscription with 1-year trial is created.

    const sessionParams: any = {
      customer: customer.stripe_customer_id,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://my.envosta.com'}/auth/login?checkout=success&email=${encodeURIComponent(email)}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://envosta.com'}/get-started?plan=${plan}`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          ...(domain && { domain_name: domain }),
          ...(trial && { is_trial: 'true' }),
        },
        ...(trial && { trial_period_days: 14 }),
      },
      metadata: {
        supabase_user_id: userId,
        ...(domain && { domain_name: domain }),
        ...(trial && { is_trial: 'true' }),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Create sales ticket for the team
    try {
      const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Unknown';
      const onboardingLabel = onboarding === 'guided' ? 'Wants onboarding call' : 'Self-guided setup';
      const domainLabel = domain
        ? (situation === 'existing' ? `Bringing domain: ${domain}` : `Registering: ${domain}`)
        : 'Using temporary domain';

      const ticketMessage = [
        `**New signup: ${name}**`,
        '',
        `**Email:** ${email}`,
        phone ? `**Phone:** ${phone}` : null,
        `**Plan:** ${planLabel}`,
        `**Domain:** ${domainLabel}`,
        `**Onboarding:** ${onboardingLabel}`,
        situation === 'existing' ? `**Situation:** Moving existing site to Envosta` : `**Situation:** New website`,
      ].filter(Boolean).join('\n');

      const { data: ticket } = await supabaseAdmin.from('tickets').insert({
        user_id: userId,
        subject: `New signup: ${name} — ${planLabel} plan`,
        type: 'sales',
        status: 'open',
        priority: 'normal',
        metadata: { source: 'signup', plan, domain, onboarding, situation },
      }).select('id').single();

      if (ticket) {
        await supabaseAdmin.from('ticket_messages').insert({
          ticket_id: ticket.id,
          sender: 'system',
          message: ticketMessage,
        });
      }

      // If migrating existing site, create a separate migration ticket
      if (situation === 'existing') {
        const migrationMessage = [
          `**Migration request for ${name}**`,
          '',
          `**Current domain:** ${domain || 'Not provided'}`,
          `**Plan:** ${planLabel}`,
          '',
          'Customer is moving an existing website to Envosta.',
          'Steps:',
          '1. Reach out to schedule migration',
          '2. Get wp-admin and/or FTP access to current site',
          '3. Run migration (files + database)',
          '4. Test on staging/temp domain',
          '5. Switch DNS when ready',
        ].join('\n');

        const { data: migTicket } = await supabaseAdmin.from('tickets').insert({
          user_id: userId,
          subject: `Migration request: ${name} — ${domain || 'domain TBD'}`,
          type: 'support',
          status: 'open',
          priority: 'high',
          metadata: { source: 'signup_migration', plan, domain, situation: 'existing' },
        }).select('id').single();

        if (migTicket) {
          await supabaseAdmin.from('ticket_messages').insert({
            ticket_id: migTicket.id,
            sender: 'system',
            message: migrationMessage,
          });
        }
      }
    } catch {
      // Non-fatal — don't block checkout if ticket creation fails
    }

    return NextResponse.json({ url: session.url });

  } catch (e: any) {
    console.error('Signup checkout error:', e);
    return NextResponse.json({ error: e.message ?? 'Internal error' }, { status: 500 });
  }
}
