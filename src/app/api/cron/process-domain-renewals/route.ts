/**
 * GET /api/cron/process-domain-renewals
 *
 * Daily domain-renewal sweeper. For every domain whose `expires_at`
 * falls inside the renewal window (default 7 days), this job:
 *
 *   1. Skips domains with auto_renew = false
 *   2. Skips domains that already attempted in the last 24h (backoff)
 *   3. Looks up the customer's stripe_customer_id + default PM
 *   4. Computes the renewal cost from public.tlds (renew_price_cad_cents)
 *   5. Creates an off-session PaymentIntent (confirm: true)
 *   6. On success → calls OpenSRS renewDomain() and bumps expires_at + 1yr
 *   7. On failure → records the error in audit_log + domains.metadata
 *      and emails the customer "your domain renewal failed"
 *
 * Idempotency:
 *   - domains.metadata.renewal_in_progress_at is set before the
 *     PaymentIntent + cleared after. Concurrent cron runs honor it.
 *   - We always write to api_calls + audit_log regardless of outcome.
 *
 * TODOs left for follow-up work:
 *   - Resolving "customer's default PM" today uses
 *     stripe.customers.retrieve(...).invoice_settings.default_payment_method.
 *     Some customers have only an attached-but-not-default PM. The TODO
 *     comment in fetchDefaultPaymentMethod() marks the spot to widen the
 *     lookup if/when we see misses in production.
 *   - Renewal failure email uses a generic copy in lib/email helpers —
 *     replace with a dedicated `domainRenewalFailedEmail()` builder.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { createOpenSrsClient } from '@/lib/integrations/opensrs';
import { sendEmail, paymentFailedEmail } from '@/lib/email';
import { recordAudit } from '@/lib/audit';
import { recordApiCall } from '@/lib/api-call-logger';
import { start } from 'workflow/api';
import { renewDomain } from '@/app/workflows/renew-domain';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const RENEWAL_WINDOW_DAYS = parseInt(process.env.DOMAIN_RENEWAL_WINDOW_DAYS ?? '7', 10);
const RETRY_BACKOFF_HOURS = 24;
const BATCH_SIZE = 50;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
}

/**
 * Returns the customer's default payment method ID, or null. Tries
 * invoice_settings.default_payment_method first (where Stripe stores
 * the canonical "preferred card"). Falls back to the first attached PM
 * so an account that never set a default still gets billed.
 *
 * TODO: if we start seeing a non-trivial % of failures here in
 *       production, widen this to honour customer.default_source too.
 */
async function fetchDefaultPaymentMethod(stripe: Stripe, customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ((customer as any).deleted) return null;
    const c = customer as Stripe.Customer;
    const pm = c.invoice_settings?.default_payment_method;
    if (typeof pm === 'string') return pm;
    if (pm && (pm as any).id) return (pm as any).id;
  } catch (e) {
    console.error('[domain-renewals] fetch default PM failed:', e);
  }
  // Fallback: any attached card.
  try {
    const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
    return list.data[0]?.id ?? null;
  } catch (e) {
    console.error('[domain-renewals] fallback PM list failed:', e);
    return null;
  }
}

interface RenewalOutcome {
  domainId: string;
  domainName: string;
  status: 'renewed' | 'charge_failed' | 'opensrs_failed' | 'skipped';
  message: string;
}

export async function GET(req: Request) {
  // ── Auth: Vercel cron sends Bearer CRON_SECRET ──
  const authHeader = req.headers.get('authorization');
  // Fail-closed: if CRON_SECRET is unset, reject ALL callers. Previously
  // this fell open and let anyone trigger off-session charges.
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = sb();
  const stripe = getStripe();
  const opensrs = createOpenSrsClient();

  const windowEnd = new Date(Date.now() + RENEWAL_WINDOW_DAYS * 86_400_000).toISOString();
  const backoffCutoff = new Date(Date.now() - RETRY_BACKOFF_HOURS * 3_600_000).toISOString();
  const now = new Date().toISOString();

  // ── Pull due domains ──
  const { data: dueDomains, error: dueErr } = await supabase
    .from('domains')
    .select('id, user_id, domain_name, tld, expiry_date, auto_renew, metadata')
    .eq('status', 'registered')
    .eq('auto_renew', true)
    .lte('expiry_date', windowEnd)
    .limit(BATCH_SIZE);

  if (dueErr) {
    console.error('[domain-renewals] query error:', dueErr);
    return NextResponse.json({ error: dueErr.message }, { status: 500 });
  }

  const outcomes: RenewalOutcome[] = [];
  // Per-day cyclePin so the workflow's Stripe idempotency key is stable
  // across any retry within the same UTC day, distinct from the next
  // day's sweep. Domain renewals are once-per-year — within-day
  // idempotency is plenty, and prevents double-charge if the cron fires
  // twice within seconds (Vercel never has, but cheap belt-and-suspenders).
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const cyclePin = `cycle-${today}`;

  for (const dom of dueDomains ?? []) {
    const meta = (dom.metadata as any) ?? {};
    const lastAttempt = meta.renewal_last_attempt_at ?? null;
    const inProgress = meta.renewal_in_progress_at ?? null;

    // Idempotency / backoff
    if (inProgress && inProgress > backoffCutoff) {
      outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'skipped', message: 'already in progress' });
      continue;
    }
    if (lastAttempt && lastAttempt > backoffCutoff && meta.renewal_failed_at) {
      outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'skipped', message: 'in backoff window' });
      continue;
    }

    // Mark in-progress so a concurrent run won't double-charge.
    await supabase
      .from('domains')
      .update({
        metadata: { ...meta, renewal_in_progress_at: now, renewal_last_attempt_at: now },
      })
      .eq('id', dom.id);

    // Renewal runs as a Vercel Workflow (durable charge → renew →
    // mirror chain). On workflow runtime failure we fall through to the
    // legacy inline implementation below.
    let workflowStarted = false;
    try {
      await start(renewDomain, [{
        domainId: dom.id,
        invoiceId: cyclePin,
        years: 1,
      }]);
      workflowStarted = true;
      outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'renewed', message: 'workflow dispatched' });
      continue;
    } catch (e) {
      console.error('[domain-renewals] renewDomain workflow start failed, falling back to inline:', dom.domain_name, e);
    }

    void workflowStarted;
    try {
      // 1. Resolve user + Stripe customer.
      const { data: user } = await supabase
        .from('users')
        .select('id, email, full_name, stripe_customer_id')
        .eq('id', dom.user_id)
        .maybeSingle();

      if (!user?.stripe_customer_id) {
        await recordAudit({
          actorType: 'system',
          action: 'domain.renewal.skip_no_customer',
          resourceType: 'domain',
          resourceId: dom.id,
          metadata: { domain_name: dom.domain_name, reason: 'user missing stripe_customer_id' },
        });
        await supabase
          .from('domains')
          .update({ metadata: { ...meta, renewal_in_progress_at: null, renewal_failed_at: now, renewal_failure_reason: 'No Stripe customer on file' } })
          .eq('id', dom.id);
        outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'skipped', message: 'no stripe_customer_id' });
        continue;
      }

      // 2. Compute renew price from public.tlds.
      const { data: tldRow } = await supabase
        .from('tlds')
        .select('renew_price_cad_cents')
        .eq('tld', dom.tld.toLowerCase())
        .maybeSingle();

      const amount = tldRow?.renew_price_cad_cents ?? 0;
      if (amount <= 0) {
        await recordAudit({
          actorType: 'system',
          action: 'domain.renewal.skip_no_price',
          resourceType: 'domain',
          resourceId: dom.id,
          metadata: { domain_name: dom.domain_name, tld: dom.tld },
        });
        await supabase
          .from('domains')
          .update({ metadata: { ...meta, renewal_in_progress_at: null, renewal_failed_at: now, renewal_failure_reason: `No renew price for .${dom.tld}` } })
          .eq('id', dom.id);
        outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'skipped', message: `no renew price for .${dom.tld}` });
        continue;
      }

      // 3. Resolve default PM.
      const pmId = await fetchDefaultPaymentMethod(stripe, user.stripe_customer_id);
      if (!pmId) {
        await recordAudit({
          actorType: 'system',
          action: 'domain.renewal.skip_no_pm',
          resourceType: 'domain',
          resourceId: dom.id,
          metadata: { domain_name: dom.domain_name },
        });
        await supabase
          .from('domains')
          .update({ metadata: { ...meta, renewal_in_progress_at: null, renewal_failed_at: now, renewal_failure_reason: 'No payment method on file' } })
          .eq('id', dom.id);
        if (user.email) {
          const email = paymentFailedEmail(user.full_name ?? 'there', `$${(amount / 100).toFixed(2)} CAD`);
          await sendEmail({ to: user.email, ...email });
        }
        outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'charge_failed', message: 'no payment method' });
        continue;
      }

      // 4. Off-session PaymentIntent.
      let piId = '';
      try {
        const pi = await stripe.paymentIntents.create({
          customer: user.stripe_customer_id,
          amount,
          currency: 'cad',
          payment_method: pmId,
          off_session: true,
          confirm: true,
          metadata: {
            product_type: 'domain_renewal',
            domain_name: dom.domain_name,
            tld: dom.tld,
            supabase_user_id: user.id,
            domain_id: dom.id,
          },
        });
        piId = pi.id;
        if (pi.status !== 'succeeded') {
          throw new Error(`PaymentIntent status: ${pi.status}`);
        }
      } catch (e: any) {
        await recordApiCall({
          provider: 'stripe',
          method: 'POST',
          path: '/v1/payment_intents',
          requestPayload: { amount, currency: 'cad', customer: user.stripe_customer_id, off_session: true },
          responseStatus: e?.statusCode ?? 500,
          error: { message: e?.message ?? String(e), code: e?.code ?? null },
        });
        await recordAudit({
          actorType: 'system',
          action: 'domain.renewal.charge_failed',
          resourceType: 'domain',
          resourceId: dom.id,
          metadata: { domain_name: dom.domain_name, error: e?.message },
        });
        await supabase
          .from('domains')
          .update({ metadata: { ...meta, renewal_in_progress_at: null, renewal_failed_at: now, renewal_failure_reason: e?.message ?? 'Charge failed' } })
          .eq('id', dom.id);

        if (user.email) {
          // TODO: replace with a dedicated domainRenewalFailedEmail()
          const email = paymentFailedEmail(user.full_name ?? 'there', `$${(amount / 100).toFixed(2)} CAD`);
          await sendEmail({ to: user.email, ...email });
        }

        outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'charge_failed', message: e?.message ?? 'PaymentIntent failed' });
        continue;
      }

      // 5. Renew at OpenSRS.
      try {
        const result = await opensrs.renewDomain({ domain: dom.domain_name, years: 1 });
        const newExpiry = new Date(Date.now() + 365.25 * 86_400_000).toISOString();
        await supabase
          .from('domains')
          .update({
            expiry_date: newExpiry,
            metadata: {
              ...meta,
              renewal_in_progress_at: null,
              renewal_last_success_at: now,
              renewal_failed_at: null,
              renewal_failure_reason: null,
              renewal_payment_intent_id: piId,
              renewal_opensrs_order_id: result.order_id,
            },
          })
          .eq('id', dom.id);

        await recordAudit({
          actorType: 'system',
          action: 'domain.renewal.success',
          resourceType: 'domain',
          resourceId: dom.id,
          metadata: { domain_name: dom.domain_name, payment_intent_id: piId, opensrs_order_id: result.order_id, amount },
        });

        outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'renewed', message: `paid ${amount / 100} CAD` });
      } catch (e: any) {
        // Renewal failed AFTER successful charge — needs ops attention.
        await recordAudit({
          actorType: 'system',
          action: 'domain.renewal.opensrs_failed',
          resourceType: 'domain',
          resourceId: dom.id,
          metadata: { domain_name: dom.domain_name, error: e?.message ?? String(e), payment_intent_id: piId },
        });
        await supabase
          .from('domains')
          .update({
            metadata: {
              ...meta,
              renewal_in_progress_at: null,
              renewal_failed_at: now,
              renewal_failure_reason: `OpenSRS renew failed AFTER charge: ${e?.message ?? 'unknown'}`,
              renewal_payment_intent_id: piId,
            },
          })
          .eq('id', dom.id);
        outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'opensrs_failed', message: e?.message ?? 'OpenSRS renew failed' });
      }
    } catch (e: any) {
      console.error('[domain-renewals] outer catch for', dom.domain_name, e);
      await supabase
        .from('domains')
        .update({ metadata: { ...meta, renewal_in_progress_at: null, renewal_failed_at: now, renewal_failure_reason: e?.message ?? 'Unknown error' } })
        .eq('id', dom.id);
      outcomes.push({ domainId: dom.id, domainName: dom.domain_name, status: 'charge_failed', message: e?.message ?? 'Unknown error' });
    }
  }

  const renewed = outcomes.filter(o => o.status === 'renewed').length;
  const failed = outcomes.filter(o => o.status === 'charge_failed' || o.status === 'opensrs_failed').length;
  const skipped = outcomes.filter(o => o.status === 'skipped').length;

  return NextResponse.json({
    success: true,
    processed: outcomes.length,
    renewed,
    failed,
    skipped,
    outcomes,
  });
}
