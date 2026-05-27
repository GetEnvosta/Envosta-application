/**
 * Domain renewal workflow (Vercel Workflows SDK).
 *
 * Decomposes /api/cron/process-domain-renewals into durable steps so a
 * mid-flight failure (between charge + OpenSRS renew, the most painful
 * case) becomes resumable rather than requiring manual reconciliation.
 *
 * Steps:
 *   1. loadDomainAndUser     — load the domain + owner profile + PM info,
 *                              compute renewal cost from public.tlds.
 *   2. chargeStripe          — off-session PaymentIntent. Stripe idempotency
 *                              key keys on the domain id + the cron's
 *                              invoiceId pin so retries don't double-charge.
 *   3. renewAtOpenSrs        — SW_REGISTER reg_type=renew. OpenSRS handles
 *                              "already renewed" gracefully.
 *   4. persistRenewal        — bump domains.expires_at + opensrs_domains.
 *   5. recordRenewed         — audit completion.
 *
 * Triggered by the daily process-domain-renewals cron, one workflow
 * invocation per due domain. The cron passes the cycle's PaymentIntent ID
 * candidate via `invoiceId` so retries can be idempotency-keyed on it.
 */
import { FatalError } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createOpenSrsClient, OpenSrsError } from '@/lib/integrations/opensrs';
import { recordAudit } from '@/lib/audit';

export interface RenewDomainInput {
  domainId: string;
  /**
   * Caller-provided idempotency key. The cron passes its per-cycle PI
   * candidate ID; if absent we synthesize one keyed on (domainId, date).
   */
  invoiceId: string;
  years?: number;
}

interface RenewContext {
  domainName: string;
  tld: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  stripeCustomerId: string;
  amount: number;
  years: number;
}

function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

function sbClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

async function fetchDefaultPaymentMethod(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ((customer as any).deleted) return null;
    const c = customer as Stripe.Customer;
    const pm = c.invoice_settings?.default_payment_method;
    if (typeof pm === 'string') return pm;
    if (pm && (pm as any).id) return (pm as any).id;
  } catch (e) {
    console.error('[renew-domain] fetch default PM failed:', e);
  }
  try {
    const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
    return list.data[0]?.id ?? null;
  } catch (e) {
    console.error('[renew-domain] fallback PM list failed:', e);
    return null;
  }
}

// ───────────────────────────────────────────────────────────────────
// STEP 1 — load domain + user + tld price.
// ───────────────────────────────────────────────────────────────────
async function loadDomainAndUser(input: RenewDomainInput): Promise<RenewContext> {
  'use step';

  const sb = sbClient();

  const { data: dom, error: domErr } = await sb
    .from('domains')
    .select('id, user_id, domain_name, tld, status, auto_renew')
    .eq('id', input.domainId)
    .maybeSingle();

  if (domErr) {
    throw new Error(`domains lookup failed: ${domErr.message}`);
  }
  if (!dom) {
    throw new FatalError(`domain ${input.domainId} not found`);
  }
  if (dom.status !== 'registered') {
    throw new FatalError(`domain ${input.domainId} status=${dom.status}, not renewable`);
  }
  if (!dom.auto_renew) {
    throw new FatalError(`domain ${input.domainId} has auto_renew=false`);
  }

  const { data: user, error: userErr } = await sb
    .from('users')
    .select('id, email, full_name, stripe_customer_id')
    .eq('id', dom.user_id)
    .maybeSingle();

  if (userErr) {
    throw new Error(`users lookup failed: ${userErr.message}`);
  }
  if (!user) {
    throw new FatalError(`user ${dom.user_id} not found`);
  }
  if (!user.stripe_customer_id) {
    throw new FatalError(`user ${dom.user_id} has no stripe_customer_id`);
  }

  const { data: tldRow } = await sb
    .from('tlds')
    .select('renew_price_cad_cents')
    .eq('tld', String(dom.tld).toLowerCase())
    .maybeSingle();

  const amount = tldRow?.renew_price_cad_cents ?? 0;
  if (amount <= 0) {
    throw new FatalError(`no renew price configured for .${dom.tld}`);
  }

  return {
    domainName: dom.domain_name as string,
    tld: dom.tld as string,
    userId: dom.user_id as string,
    userEmail: (user.email as string | null) ?? null,
    userName: (user.full_name as string | null) ?? null,
    stripeCustomerId: user.stripe_customer_id as string,
    amount,
    years: input.years ?? 1,
  };
}

// ───────────────────────────────────────────────────────────────────
// STEP 2 — off-session PaymentIntent.
// ───────────────────────────────────────────────────────────────────
async function chargeStripe(input: RenewDomainInput, ctx: RenewContext): Promise<string> {
  'use step';

  const stripe = getStripe();
  const pmId = await fetchDefaultPaymentMethod(stripe, ctx.stripeCustomerId);
  if (!pmId) {
    throw new FatalError(`user ${ctx.userId} has no payment method on file`);
  }

  // Idempotency key — same input replays produce the same PI (Stripe
  // returns the prior PI rather than charging twice).
  const idempotencyKey = `domain-renew:${input.domainId}:${input.invoiceId}`;

  try {
    const pi = await stripe.paymentIntents.create(
      {
        customer: ctx.stripeCustomerId,
        amount: ctx.amount,
        currency: 'cad',
        payment_method: pmId,
        off_session: true,
        confirm: true,
        metadata: {
          product_type: 'domain_renewal',
          domain_name: ctx.domainName,
          tld: ctx.tld,
          supabase_user_id: ctx.userId,
          domain_id: input.domainId,
          workflow_invoice_id: input.invoiceId,
        },
      },
      { idempotencyKey },
    );

    if (pi.status !== 'succeeded') {
      throw new FatalError(`PaymentIntent ${pi.id} ended in status=${pi.status}`);
    }
    return pi.id;
  } catch (e: any) {
    const status = typeof e?.statusCode === 'number' ? e.statusCode : 500;
    // Stripe card decline / authentication_required → not retryable.
    if (status >= 400 && status < 500) {
      throw new FatalError(`Stripe rejected renewal charge: ${e?.message ?? 'unknown'}`);
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

// ───────────────────────────────────────────────────────────────────
// STEP 3 — renew at OpenSRS.
// ───────────────────────────────────────────────────────────────────
async function renewAtOpenSrs(ctx: RenewContext): Promise<{ orderId: string }> {
  'use step';

  try {
    const client = createOpenSrsClient();
    const result = await client.renewDomain({ domain: ctx.domainName, years: ctx.years });
    return { orderId: result.order_id };
  } catch (e) {
    if (e instanceof OpenSrsError) {
      const code = parseInt(e.responseCode ?? '0', 10) || 0;
      if (code >= 400 && code < 500) {
        throw new FatalError(
          `OpenSRS rejected renewal for ${ctx.domainName} (code=${code}): ${e.message}`,
        );
      }
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

// ───────────────────────────────────────────────────────────────────
// STEP 4 — persist new expiry to domains + opensrs_domains.
// ───────────────────────────────────────────────────────────────────
async function persistRenewal(
  input: RenewDomainInput,
  ctx: RenewContext,
  paymentIntentId: string,
  orderId: string,
) {
  'use step';

  const sb = sbClient();
  const nowIso = new Date().toISOString();
  const newExpiryIso = new Date(Date.now() + ctx.years * 365.25 * 86_400_000).toISOString();

  // Preserve existing metadata, clear in_progress/failed flags, stamp new ones.
  const { data: dom } = await sb
    .from('domains')
    .select('metadata')
    .eq('id', input.domainId)
    .maybeSingle();
  const meta = (dom?.metadata as Record<string, unknown> | null) ?? {};

  await sb
    .from('domains')
    .update({
      expiry_date: newExpiryIso,
      metadata: {
        ...meta,
        renewal_in_progress_at: null,
        renewal_last_success_at: nowIso,
        renewal_failed_at: null,
        renewal_failure_reason: null,
        renewal_payment_intent_id: paymentIntentId,
        renewal_opensrs_order_id: orderId,
      },
    })
    .eq('id', input.domainId);

  await sb
    .from('opensrs_domains')
    .update({
      expires_at: newExpiryIso,
      last_synced_at: nowIso,
    })
    .eq('upstream_id', ctx.domainName);
}

// ───────────────────────────────────────────────────────────────────
// STEP 5 — audit completion.
// ───────────────────────────────────────────────────────────────────
async function recordRenewed(
  input: RenewDomainInput,
  ctx: RenewContext,
  paymentIntentId: string,
  orderId: string,
) {
  'use step';

  await recordAudit({
    actorType: 'workflow',
    actorId: ctx.userId,
    action: 'workflow.renew_domain.completed',
    resourceType: 'domain',
    resourceId: input.domainId,
    metadata: {
      domain_name: ctx.domainName,
      years: ctx.years,
      amount_cad_cents: ctx.amount,
      payment_intent_id: paymentIntentId,
      opensrs_order_id: orderId,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator.
// ───────────────────────────────────────────────────────────────────
export async function renewDomain(input: RenewDomainInput) {
  'use workflow';

  const ctx = await loadDomainAndUser(input);
  const paymentIntentId = await chargeStripe(input, ctx);
  const { orderId } = await renewAtOpenSrs(ctx);
  await persistRenewal(input, ctx, paymentIntentId, orderId);
  await recordRenewed(input, ctx, paymentIntentId, orderId);

  return {
    domainId: input.domainId,
    domainName: ctx.domainName,
    paymentIntentId,
    orderId,
    status: 'renewed' as const,
  };
}
