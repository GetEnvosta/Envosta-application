/**
 * Domain registration workflow:
 *   1. Pre-flight: confirm domain availability via OpenSRS lookup
 *   2. Create owner/admin/tech/billing contacts at OpenSRS (mirror to opensrs_contacts)
 *   3. SW_REGISTER the domain (mirror to opensrs_domains + update domains row)
 *   4. Create yearly renewal Stripe subscription
 *   5. Attach default nameservers + DNS zone
 *   6. Send registration confirmation email
 *
 * Idempotency key: domain_name + user_id.
 * Triggered by: stripe-webhook on customer.subscription.created (for
 * hosting plans that bundle a domain), or /api/domain-checkout success.
 *
 * Phase 1: SCAFFOLD ONLY. Logic lands in Phase 5.
 */
export async function registerDomain(input: {
  userId: string;
  domainName: string;
  registrationYears?: number;
  agreementIp?: string;
}) {
  'use workflow';
  // TODO Phase 5: implement OpenSRS registration orchestration
  console.log('registerDomain scaffold called with', input);
  return { status: 'scaffold' as const };
}
