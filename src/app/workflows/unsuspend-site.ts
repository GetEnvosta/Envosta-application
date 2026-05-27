/**
 * Site unsuspension workflow (Vercel Workflows SDK).
 *
 * Inverse of suspend-site: flips sites.status back to 'active', clears
 * the paused_at column and the paused_at / pause_reason metadata keys,
 * then audits the restoration.
 *
 * Triggered by the Stripe webhook when a paused subscription resumes
 * (customer.subscription.updated → no pause_collection and active).
 * Also available for admin-driven unpauses.
 *
 * Idempotency: re-running for an already-active site is a no-op against
 * the row (set already-active values), the audit row is still written.
 */
import { FatalError } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

export interface UnsuspendSiteInput {
  siteId: string;
}

// ───────────────────────────────────────────────────────────────────
// STEP 1 — flip status back to 'active', strip pause metadata.
// ───────────────────────────────────────────────────────────────────
async function markSiteActive(input: UnsuspendSiteInput) {
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
  // Strip every pause/cancellation marker — recovery_deadline and
  // cancelled_at must go so delete-expired-sites doesn't pick the site
  // up after we restore it.
  const {
    paused_at: _pa,
    pause_reason: _pr,
    recovery_deadline: _rd,
    cancelled_at: _ca,
    ...keptMeta
  } = meta as Record<string, unknown>;

  const { error: updErr } = await sb
    .from('sites')
    .update({
      status: 'active',
      paused_at: null,
      flag_reason: null,
      metadata: {
        ...keptMeta,
        restored_at: new Date().toISOString(),
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
async function recordUnsuspended(
  input: UnsuspendSiteInput,
  details: { userId: string; label: string | null; previousStatus: string },
) {
  'use step';

  await recordAudit({
    actorType: 'workflow',
    action: 'workflow.unsuspend_site.completed',
    resourceType: 'site',
    resourceId: input.siteId,
    before: { status: details.previousStatus },
    after: { status: 'active' },
    metadata: {
      user_id: details.userId,
      label: details.label,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator.
// ───────────────────────────────────────────────────────────────────
export async function unsuspendSite(input: UnsuspendSiteInput) {
  'use workflow';

  const details = await markSiteActive(input);
  await recordUnsuspended(input, details);

  return {
    siteId: input.siteId,
    status: 'active' as const,
  };
}
