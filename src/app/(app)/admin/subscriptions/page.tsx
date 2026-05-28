/**
 * Legacy redirect — subscriptions are the default tab inside
 * /admin/billing. The standalone page was retired during the
 * Billing+Reporting consolidation.
 */
import { redirect } from 'next/navigation';

export default function LegacySubscriptionsRedirect() {
  redirect('/admin/billing?view=subscriptions');
}
