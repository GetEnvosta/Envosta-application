/**
 * Site suspension workflow (Vercel Workflows SDK).
 *
 * Marks a site as soft-cancelled in our DB with a recovery_deadline.
 * After the deadline elapses, the `delete-expired-sites` cron picks it
 * up and issues the wp.cloud hard-delete. wp.cloud does not expose a
 * public "pause" API — suspension is purely a status/access marker in
 * our layer plus the asynchronous upstream removal at end of grace.
 *
 * CRITICAL: this workflow sets status='cancelled' + metadata
 * .recovery_deadline. The delete-expired-sites cron explicitly filters
 *   status='cancelled' AND recovery_deadline IS NOT NULL
 *   AND recovery_deadline < NOW()
 * — divergence here (e.g. status='paused') means sites never get
 * cleaned up. See src/app/api/cron/delete-expired-sites/route.ts.
 *
 * Triggered by the Stripe webhook when a customer's subscription pauses
 * (customer.subscription.updated → pause_collection set). The caller
 * passes the subscription's current_period_end as recoveryDeadlineIso.
 */
import { FatalError } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

export interface SuspendSiteInput {
  siteId: string;
  reason: string;
  /** ISO timestamp at which delete-expired-sites cron may hard-delete. */
  recoveryDeadlineIso: string;
}

// ───────────────────────────────────────────────────────────────────
// STEP 1 — flip sites.status to 'paused', stamp metadata.
// ───────────────────────────────────────────────────────────────────
async function markSitePaused(input: SuspendSiteInput) {
  'use step';

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: site, error: loadErr } = await sb
    .from('sites')
    .select('id, user_id, label, status, metadata')
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

  const { error: updErr } = await sb
    .from('sites')
    .update({
      status: 'cancelled',
      paused_at: nowIso,
      flag_reason: input.reason,
      metadata: {
        ...meta,
        recovery_deadline: input.recoveryDeadlineIso,
        cancelled_at: nowIso,
        pause_reason: input.reason,
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
  };
}

// ───────────────────────────────────────────────────────────────────
// STEP 2 — audit completion.
// ───────────────────────────────────────────────────────────────────
async function recordSuspended(
  input: SuspendSiteInput,
  details: { userId: string; label: string | null; previousStatus: string },
) {
  'use step';

  await recordAudit({
    actorType: 'workflow',
    action: 'workflow.suspend_site.completed',
    resourceType: 'site',
    resourceId: input.siteId,
    before: { status: details.previousStatus },
    after: { status: 'cancelled', recovery_deadline: input.recoveryDeadlineIso },
    metadata: {
      user_id: details.userId,
      label: details.label,
      reason: input.reason,
      recovery_deadline: input.recoveryDeadlineIso,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator.
// ───────────────────────────────────────────────────────────────────
export async function suspendSite(input: SuspendSiteInput) {
  'use workflow';

  const details = await markSitePaused(input);
  await recordSuspended(input, details);

  return {
    siteId: input.siteId,
    status: 'cancelled' as const,
    recoveryDeadlineIso: input.recoveryDeadlineIso,
    reason: input.reason,
  };
}
