/**
 * Site suspension workflow (e.g. payment failure dunning):
 *   1. Flip sites.status to 'paused'
 *   2. Call wp.cloud site-manage-software to disable the site
 *   3. Stamp metadata.paused_at + metadata.pause_reason
 *   4. Send "your site is paused" notification email
 *
 * Idempotency key: site_id + pause_reason.
 * Triggered by: stripe-webhook on invoice.payment_failed (after retry
 * grace period), or admin action via /api/admin/suspend-site.
 *
 * Phase 1: SCAFFOLD ONLY. Logic lands in Phase 5.
 */
export async function suspendSite(input: { siteId: string; reason: string }) {
  'use workflow';
  // TODO Phase 5: implement suspension orchestration
  console.log('suspendSite scaffold called with', input);
  return { status: 'scaffold' as const };
}
