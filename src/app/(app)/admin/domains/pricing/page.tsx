/**
 * Legacy redirect — domain (TLD) pricing moved to /admin/settings/tlds
 * after TLDs got their own table (and stopped being Stripe Products).
 * Previously this redirected to /admin/products/domains which no
 * longer exists — fixed to point to the current canonical location.
 */
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

export default function DomainPricingRedirect() {
  redirect('/admin/settings/tlds');
}
