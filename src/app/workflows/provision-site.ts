/**
 * Site provisioning workflow (Vercel Workflows SDK).
 *
 * Triggered by /api/webhooks/stripe on checkout.session.completed once
 * a row exists in public.sites for the new subscription. The webhook
 * returns 200 to Stripe immediately while this workflow runs in the
 * background with durable retry semantics.
 *
 * Steps (each independently checkpointed + retried):
 *   1. provisionUpstreamSite  — call /api/internal/wpcloud/provision-site
 *      which creates the wp.cloud Atomic site, configures Akismet,
 *      removes Jetpack, and stamps sites.wp_cloud_site_id.
 *   2. waitForSiteActive      — poll public.sites until status='active'
 *      (the internal route flips it once wp.cloud's blog API confirms).
 *   3. recordProvisioned      — audit_log entry + final state.
 *
 * Welcome email is intentionally deferred — we'll wire it via a separate
 * notifyClient workflow once that scaffold is built.
 *
 * Idempotency: keyed on siteId. If the workflow fires twice for the same
 * site, step 1 sees sites.wp_cloud_site_id already populated and short-
 * circuits (logic lives in the internal route).
 */
import { FatalError, sleep } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

export interface ProvisionSiteInput {
  siteId: string;
  userId: string;
  planSlug?: string;
}

// ───────────────────────────────────────────────────────────────────
// STEP 1 — kick off wp.cloud provisioning via the internal HTTP route.
// The route already encapsulates: site create, plugin manage, status
// update. It is idempotent on siteId.
// ───────────────────────────────────────────────────────────────────
async function provisionUpstreamSite(input: ProvisionSiteInput) {
  'use step';

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://envosta.com';
  const url = `${base}/api/internal/wpcloud/provision-site`;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token) {
    throw new FatalError('INTERNAL_API_TOKEN env var not set');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': token,
    },
    body: JSON.stringify({ siteId: input.siteId }),
  });

  // 4xx → bad input, don't retry. 5xx / network → retry.
  if (res.status >= 400 && res.status < 500) {
    const body = await res.text();
    throw new FatalError(
      `provision-site rejected siteId=${input.siteId} status=${res.status}: ${body}`,
    );
  }
  if (!res.ok) {
    throw new Error(`provision-site upstream error status=${res.status}`);
  }
  return (await res.json()) as { ok?: boolean; wpCloudSiteId?: string };
}

// ───────────────────────────────────────────────────────────────────
// STEP 2 — poll public.sites until the internal route flips status to
// 'active'. Step retries handle the polling — each attempt either
// succeeds (status==='active') or throws (retryable) so the workflow
// engine waits and retries with exponential backoff.
// ───────────────────────────────────────────────────────────────────
async function waitForSiteActive(siteId: string) {
  'use step';

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data, error } = await sb
    .from('sites')
    .select('status, wp_cloud_site_id')
    .eq('id', siteId)
    .maybeSingle();

  if (error) {
    throw new Error(`sites lookup failed: ${error.message}`);
  }
  if (!data) {
    throw new FatalError(`sites row ${siteId} disappeared`);
  }
  if (data.status === 'failed') {
    throw new FatalError(`provisioning marked sites.${siteId}.status=failed`);
  }
  if (data.status !== 'active') {
    // Retryable — step will be re-attempted with backoff.
    throw new Error(`site ${siteId} status=${data.status}, waiting`);
  }
  return { wpCloudSiteId: data.wp_cloud_site_id as string | null };
}

// ───────────────────────────────────────────────────────────────────
// STEP 3 — record successful provisioning in audit_log. The step is a
// thin wrapper so workflow observability shows the audit write as a
// discrete checkpoint.
// ───────────────────────────────────────────────────────────────────
async function recordProvisioned(input: ProvisionSiteInput, wpCloudSiteId: string | null) {
  'use step';

  await recordAudit({
    actorType: 'workflow',
    action: 'workflow.provision_site.completed',
    resourceType: 'site',
    resourceId: input.siteId,
    metadata: {
      user_id: input.userId,
      plan_slug: input.planSlug ?? null,
      wp_cloud_site_id: wpCloudSiteId,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator. `'use workflow'` makes this a durable run —
// step results are checkpointed; on retry the workflow resumes after
// the last successful step.
// ───────────────────────────────────────────────────────────────────
export async function provisionSite(input: ProvisionSiteInput) {
  'use workflow';

  await provisionUpstreamSite(input);

  // wp.cloud's blog API typically takes 20-90s to mark the new site
  // ready. Sleep before the first poll so we don't burn step retries
  // hammering the DB in the first few seconds.
  await sleep('20s');
  const { wpCloudSiteId } = await waitForSiteActive(input.siteId);

  await recordProvisioned(input, wpCloudSiteId);

  return {
    siteId: input.siteId,
    wpCloudSiteId,
    status: 'provisioned' as const,
  };
}
