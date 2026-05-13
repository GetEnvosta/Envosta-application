/**
 * Site plan change workflow:
 *   1. Update the Stripe subscription item to the new price
 *   2. Apply prorations (Stripe handles via proration_behavior)
 *   3. Call wp.cloud to adjust site resources (PHP workers, storage, etc.)
 *   4. Update sites.product_id and config columns
 *   5. Send "plan changed" confirmation email
 *
 * Idempotency key: site_id + new_product_id + initiated_at timestamp.
 * Triggered by: customer plan-change UI, or admin via /api/admin/upgrade-site.
 *
 * Phase 1: SCAFFOLD ONLY. Logic lands in Phase 5.
 */
export async function updateSitePlan(input: {
  siteId: string;
  newProductId: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}) {
  'use workflow';
  // TODO Phase 5: implement plan-change orchestration
  console.log('updateSitePlan scaffold called with', input);
  return { status: 'scaffold' as const };
}
