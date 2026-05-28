/**
 * Legacy redirect — custom invoice creator moved to
 * /admin/billing/invoice/new during the Billing+Reporting consolidation.
 */
import { redirect } from 'next/navigation';

export default function LegacyCustomInvoicesRedirect() {
  redirect('/admin/billing/invoice/new');
}
