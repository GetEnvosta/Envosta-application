import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { escapeHtml } from '@/lib/sanitize';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
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
  const { allowed } = rateLimit(`signup:${ip}`, 30, 300_000); // 30 signups per 5 minutes
  if (!allowed) {
    return NextResponse.json({ error: 'Too many signup attempts. Please wait a few minutes.' }, { status: 429 });
  }

  if (!process.env.SUPABASE_SECRET_KEY) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 });
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
      plan, // 'minimum' | 'growth' | ''
      onboarding, // 'self' | 'guided'
      billing, // 'monthly' | 'annual'
      termsAccepted,
      termsAcceptedAt,
      trial, // boolean — 14-day free trial on Minimum plan
      promoCode, // Stripe promotion code (e.g. WELCOME20)
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
    if (plan && typeof plan === 'string' && !['minimum', 'growth', ''].includes(plan)) {
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
          // Look up by email in our users table (much faster than listing all auth users)
          const { data: existingUser } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle();
          if (existingUser) {
            userId = existingUser.id;
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
        .from('products')
        .select('stripe_price_id, stripe_price_id_yearly, is_active')
        .eq('slug', plan)
        .single();
      if (planData && !planData.is_active) {
        return NextResponse.json({ error: 'This plan is no longer available' }, { status: 400 });
      }
      if (billing === 'annual') {
        if (!planData?.stripe_price_id_yearly) {
          return NextResponse.json({ error: 'Annual billing is not yet available for this plan. Please select monthly.' }, { status: 400 });
        }
        priceId = planData.stripe_price_id_yearly;
      } else {
        priceId = planData?.stripe_price_id ?? null;
      }
    }

    if (!priceId) {
      console.error('No Stripe price ID found for plan:', plan);
      return NextResponse.json({ error: `No pricing configured for the ${plan} plan. Please contact support.` }, { status: 400 });
    }

    // 4. Get or create Stripe customer
    let { data: customer } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (!customer?.stripe_customer_id) {
      const sc = await stripe.customers.create({
        email,
        name,
        phone: phone || undefined,
        metadata: { supabase_user_id: userId },
      });
      await supabaseAdmin.from('users').update({
        stripe_customer_id: sc.id,
      }).eq('id', userId);
      customer = { stripe_customer_id: sc.id };
    }

    // 5. Build Stripe Checkout session
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];

    // Domain registration is handled post-checkout by the webhook.
    // The webhook registers the domain at OpenSRS and creates a
    // separate yearly subscription for domain renewal billing.
    // Domain cost is shown on the checkout summary but charged separately.

    // Resolve promo code to Stripe promotion code ID if provided
    let discounts: any[] | undefined;
    if (promoCode && typeof promoCode === 'string') {
      try {
        const promos = await stripe.promotionCodes.list({ code: promoCode, active: true, limit: 1 });
        if (promos.data.length > 0) {
          discounts = [{ promotion_code: promos.data[0].id }];
        }
      } catch { /* ignore invalid promo codes */ }
    }

    const sessionParams: any = {
      customer: customer.stripe_customer_id,
      mode: 'subscription',
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://my.envosta.com'}/auth/login?checkout=success&email=${encodeURIComponent(email)}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://envosta.com'}/get-started?plan=${plan}`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          subscription_type: 'hosting',
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
      ...(discounts && { discounts }),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Create sales ticket for the team
    try {
      const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Unknown';
      const onboardingLabel = onboarding === 'guided' ? 'Wants onboarding call' : 'Self-guided setup';
      const domainLabel = situation === 'temporary' || !domain
        ? 'Using temporary domain'
        : situation === 'existing'
          ? `Bringing existing domain: ${domain}`
          : `Registering new domain: ${domain}`;

      const ticketMessage = [
        `**New signup: ${name}**`,
        '',
        `**Email:** ${email}`,
        phone ? `**Phone:** ${phone}` : null,
        `**Plan:** ${planLabel}`,
        `**Domain:** ${domainLabel}`,
        `**Onboarding:** ${onboardingLabel}`,
        situation === 'existing' ? `**Situation:** Moving existing site to Envosta` : situation === 'temporary' ? `**Situation:** Starting fresh (temporary domain)` : `**Situation:** New website`,
      ].filter(Boolean).join('\n');

      const { data: ticket } = await supabaseAdmin.from('tickets').insert({
        user_id: userId,
        subject: `New signup: ${name} — ${planLabel} plan`,
        type: 'onboarding',
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

        // Email notification to sales
        try {
          const RESEND_KEY = process.env.RESEND_API_KEY;
          if (RESEND_KEY) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: 'Envosta <noreply@email.envosta.com>',
                to: 'sales@envosta.com',
                subject: `New Signup: ${escapeHtml(name)} — ${escapeHtml(planLabel)} plan`,
                html: `<div style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:20px">
                  <h2 style="font-size:18px;font-weight:600;margin-bottom:16px">New Signup</h2>
                  <table style="font-size:14px;line-height:1.6;width:100%">
                    <tr><td style="color:#888;padding:4px 12px 4px 0">Name</td><td style="font-weight:500">${escapeHtml(name)}</td></tr>
                    <tr><td style="color:#888;padding:4px 12px 4px 0">Email</td><td>${escapeHtml(email)}</td></tr>
                    ${phone ? `<tr><td style="color:#888;padding:4px 12px 4px 0">Phone</td><td>${escapeHtml(phone)}</td></tr>` : ''}
                    <tr><td style="color:#888;padding:4px 12px 4px 0">Plan</td><td style="font-weight:500">${escapeHtml(planLabel)}</td></tr>
                    <tr><td style="color:#888;padding:4px 12px 4px 0">Domain</td><td>${escapeHtml(domainLabel)}</td></tr>
                    <tr><td style="color:#888;padding:4px 12px 4px 0">Onboarding</td><td>${escapeHtml(onboardingLabel)}</td></tr>
                    <tr><td style="color:#888;padding:4px 12px 4px 0">Trial</td><td>${trial ? '14-day free trial' : 'No trial'}</td></tr>
                  </table>
                  <p style="margin-top:20px;font-size:13px;color:#aaa"><a href="https://my.envosta.com/admin/tickets/${ticket.id}" style="color:#2563EB">View ticket in admin →</a></p>
                </div>`,
              }),
            });
          }
        } catch { /* email notification is non-blocking */ }
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
