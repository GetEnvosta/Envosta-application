/**
 * Site cancellation workflow (Vercel Workflows SDK).
 *
 * Flags a site for deletion. The actual upstream wp.cloud removal is
 * performed asynchronously by the `delete-expired-sites` cron once the
 * grace period elapses — this workflow only updates DB state.
 *
 * Steps:
 *   1. Set sites.status='cancelled', stamp flagged_for_deletion_at +
 *      flag_reason, clear stripe_subscription_item_id (so future
 *      reconciliation doesn't try to re-link it to a now-dead Stripe
 *      item).
 *   2. Audit completion.
 *
 * Triggered by stripe-webhook on customer.subscription.deleted, and by
 * /api/admin/cleanup-site action='flag'. The wp.cloud hard-delete path
 * (cleanup-site action='delete') is NOT wired here — that path explicitly
 * issues the upstream wp.cloud delete and flips status='deleted'.
 *
 * Idempotency: a site already in 'cancelled' state stays there; we still
 * stamp the audit so each retry is observable.
 */
import { FatalError } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

export interface CancelSiteInput {
  siteId: string;
  reason?: string;
}

// ───────────────────────────────────────────────────────────────────
// STEP 1 — mark site cancelled + flag for deletion.
// ───────────────────────────────────────────────────────────────────
async function markSiteCancelled(input: CancelSiteInput) {
  'use step';

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: site, error: loadErr } = await sb
    .from('sites')
    .select('id, user_id, label, status, stripe_subscription_item_id, metadata')
    .eq('id', input.siteId)
    .maybeSingle();

  if (loadErr) {
    throw new Error(`sites lookup failed: ${loadErr.message}`);
  }
  if (!site) {
    throw new FatalError(`site ${input.siteId} not found`);
  }

  const meta = (site.metadata as Record<string, unknown> | null) ?? {};
  const nowIso = new Date().toISOString();
  const reason = input.reason ?? 'cancelled';

  const { error: updErr } = await sb
    .from('sites')
    .update({
      status: 'cancelled',
      flagged_for_deletion_at: nowIso,
      flag_reason: reason,
      stripe_subscription_item_id: null,
      metadata: {
        ...meta,
        cancelled_at: nowIso,
        cancel_reason: reason,
      },
    })
    .eq('id', input.siteId);

  if (updErr) {
    throw new Error(`sites update failed: ${updErr.message}`);
  }

  return {
    userId: site.user_id as string,
    label: site.label as string | null,
    previousStatus: site.status as string,
    previousItemId: site.stripe_subscription_item_id as string | null,
  };
}

// ───────────────────────────────────────────────────────────────────
// STEP 2 — audit completion.
// ───────────────────────────────────────────────────────────────────
async function recordCancelled(
  input: CancelSiteInput,
  details: {
    userId: string;
    label: string | null;
    previousStatus: string;
    previousItemId: string | null;
  },
) {
  'use step';

  await recordAudit({
    actorType: 'workflow',
    action: 'workflow.cancel_site.completed',
    resourceType: 'site',
    resourceId: input.siteId,
    before: { status: details.previousStatus, stripe_subscription_item_id: details.previousItemId },
    after: { status: 'cancelled', stripe_subscription_item_id: null },
    metadata: {
      user_id: details.userId,
      label: details.label,
      reason: input.reason ?? 'cancelled',
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator.
// ───────────────────────────────────────────────────────────────────
export async function cancelSite(input: CancelSiteInput) {
  'use workflow';

  const details = await markSiteCancelled(input);
  await recordCancelled(input, details);

  return {
    siteId: input.siteId,
    status: 'cancelled' as const,
    reason: input.reason ?? 'cancelled',
  };
}
