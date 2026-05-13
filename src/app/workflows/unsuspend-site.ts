/**
 * Site unsuspension workflow (e.g. payment recovered):
 *   1. Flip sites.status to 'active'
 *   2. Call wp.cloud site-manage-software to re-enable the site
 *   3. Clear metadata.paused_at / metadata.pause_reason
 *   4. Send "your site is back online" email
 *
 * Idempotency key: site_id + initiated_at.
 * Triggered by: stripe-webhook on invoice.paid following a paused state,
 * or admin action via /api/admin/unsuspend-site.
 *
 * Phase 1: SCAFFOLD ONLY. Logic lands in Phase 5.
 */
export async function unsuspendSite(input: { siteId: string }) {
  'use workflow';
  // TODO Phase 5: implement unsuspension orchestration
  console.log('unsuspendSite scaffold called with', input);
  return { status: 'scaffold' as const };
}
