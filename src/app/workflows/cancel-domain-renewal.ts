/**
 * Cancel domain renewal workflow (Vercel Workflows SDK).
 *
 * Toggles a domain's auto_renew flag off at OpenSRS and mirrors the
 * change locally. Domain renewals are off-session PaymentIntents fired
 * by /api/cron/process-domain-renewals — not Stripe Subscriptions — so
 * there is no Stripe subscription to cancel here. The cron honours
 * `domains.auto_renew=false` directly: the next sweep simply skips this
 * domain.
 *
 * Idempotency: OpenSRS MODIFY is idempotent; setting auto_renew to its
 * existing value is a no-op upstream. Safe to retry.
 */
import { FatalError } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import { createOpenSrsClient, OpenSrsError } from '@/lib/integrations/opensrs';
import { recordAudit } from '@/lib/audit';

export interface CancelDomainRenewalInput {
  domainId: string;
  actorId?: string;
}

// ───────────────────────────────────────────────────────────────────
// STEP 1 — load the domain row.
// ───────────────────────────────────────────────────────────────────
async function loadDomain(domainId: string) {
  'use step';

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await sb
    .from('domains')
    .select('id, user_id, domain_name, auto_renew, status')
    .eq('id', domainId)
    .maybeSingle();

  if (error) {
    throw new Error(`domains lookup failed: ${error.message}`);
  }
  if (!data) {
    throw new FatalError(`domain ${domainId} not found`);
  }
  return data;
}

// ───────────────────────────────────────────────────────────────────
// STEP 2 — flip auto_renew off at OpenSRS.
// ───────────────────────────────────────────────────────────────────
async function disableAutoRenewAtOpenSrs(domainName: string) {
  'use step';

  try {
    const client = createOpenSrsClient();
    await client.setAutoRenew(domainName, false);
  } catch (e) {
    if (e instanceof OpenSrsError) {
      // OpenSRS 4xx-equivalents are non-retryable. 5xx / network → retry.
      const code = parseInt(e.responseCode ?? '0', 10) || 0;
      if (code >= 400 && code < 500) {
        throw new FatalError(`OpenSRS rejected setAutoRenew for ${domainName}: ${e.message}`);
      }
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

// ───────────────────────────────────────────────────────────────────
// STEP 3 — mirror the change in our DB.
// ───────────────────────────────────────────────────────────────────
async function persistAutoRenewOff(domainId: string) {
  'use step';

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  await sb
    .from('domains')
    .update({ auto_renew: false })
    .eq('id', domainId);

  // Mirror table: keyed on the domain name (upstream_id). Best-effort —
  // the reconcile-opensrs cron will re-stamp it if this misses.
  const { data: dom } = await sb
    .from('domains')
    .select('domain_name')
    .eq('id', domainId)
    .maybeSingle();

  if (dom?.domain_name) {
    await sb
      .from('opensrs_domains')
      .update({
        auto_renew: false,
        last_synced_at: new Date().toISOString(),
      })
      .eq('upstream_id', dom.domain_name);
  }
}

// ───────────────────────────────────────────────────────────────────
// STEP 4 — audit completion.
// ───────────────────────────────────────────────────────────────────
async function recordAutoRenewCancelled(
  input: CancelDomainRenewalInput,
  domainName: string,
  userId: string,
) {
  'use step';

  await recordAudit({
    actorType: 'workflow',
    actorId: input.actorId,
    action: 'workflow.cancel_domain_renewal.completed',
    resourceType: 'domain',
    resourceId: input.domainId,
    metadata: {
      domain_name: domainName,
      user_id: userId,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator.
// ───────────────────────────────────────────────────────────────────
export async function cancelDomainRenewal(input: CancelDomainRenewalInput) {
  'use workflow';

  const domain = await loadDomain(input.domainId);
  await disableAutoRenewAtOpenSrs(domain.domain_name);
  await persistAutoRenewOff(input.domainId);
  await recordAutoRenewCancelled(input, domain.domain_name, domain.user_id);

  return {
    domainId: input.domainId,
    domainName: domain.domain_name,
    status: 'cancelled' as const,
  };
}
