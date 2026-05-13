/**
 * DNS update workflow:
 *   1. Validate the requested record set against our policies
 *   2. Write the new records to dns_records (our customer-facing mirror)
 *   3. Push to OpenSRS via SET_DNS_ZONE
 *   4. Re-read OpenSRS DNS zone to confirm
 *   5. Stamp domains.metadata.dns_setup_at
 *
 * Idempotency key: domain_id + content hash.
 * Triggered by: customer DNS manager UI, or provision-site workflow when
 * pointing a freshly-registered domain at the wp.cloud site IP.
 *
 * Phase 1: SCAFFOLD ONLY. Logic lands in Phase 5.
 */
export async function updateDns(input: {
  domainId: string;
  records: Array<{
    type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV';
    name: string;
    value: string;
    ttl?: number;
    priority?: number;
  }>;
}) {
  'use workflow';
  // TODO Phase 5: implement DNS update + mirror sync
  console.log('updateDns scaffold called with', input);
  return { status: 'scaffold' as const };
}
