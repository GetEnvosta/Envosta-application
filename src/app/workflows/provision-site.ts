/**
 * Full site provisioning workflow:
 *   1. Create wp.cloud site
 *   2. Register OpenSRS domain (if applicable)
 *   3. Set DNS at OpenSRS
 *   4. Attach domain to wp.cloud site
 *   5. Attribute Jetpack partner
 *   6. Send welcome email
 *
 * Idempotency key: subscription_id (one provisioning per subscription).
 * Triggered by: stripe-webhook on customer.subscription.created.
 *
 * Phase 1: SCAFFOLD ONLY. Logic lands in Phase 5.
 */
export async function provisionSite(input: { subscriptionId: string; userId: string }) {
  'use workflow';
  // TODO Phase 5: implement multi-step provisioning
  console.log('provisionSite scaffold called with', input);
  return { status: 'scaffold' as const };
}
