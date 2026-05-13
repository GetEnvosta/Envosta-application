/**
 * Site cancellation workflow:
 *   1. Flip subscription/sites status to cancelled
 *   2. Stamp recovery_deadline on the site
 *   3. Suspend the wp.cloud site (keep data, block traffic)
 *   4. Send cancellation email
 *   5. After grace period, delete-expired-sites cron picks this up
 *
 * Idempotency key: site_id.
 * Triggered by: stripe-webhook on customer.subscription.deleted, or admin
 * action via /api/admin/cancel-site.
 *
 * Phase 1: SCAFFOLD ONLY. Logic lands in Phase 5.
 */
export async function cancelSite(input: { siteId: string; reason?: string }) {
  'use workflow';
  // TODO Phase 5: implement cancellation orchestration
  console.log('cancelSite scaffold called with', input);
  return { status: 'scaffold' as const };
}
