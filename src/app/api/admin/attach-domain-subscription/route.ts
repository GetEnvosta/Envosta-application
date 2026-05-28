/**
 * POST /api/admin/attach-domain-subscription
 *
 * Returns 410 Gone.
 *
 * Previously created an annual Stripe Subscription tied to a TLD's
 * persistent Stripe Price so domain renewals would auto-bill. There are
 * NO Stripe Subscriptions for domain renewals now — the
 * /api/cron/process-domain-renewals cron fires off-session
 * PaymentIntents instead and OpenSRS handles the renewal itself.
 *
 * Kept as an explicit 410 (with a useful message) so any stale UI hits
 * surface clearly instead of silently failing.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Gone',
      message:
        'Domain renewal subscriptions are retired. Renewals are fired by /api/cron/process-domain-renewals as off-session one-time charges — toggle the domain\'s auto_renew flag instead.',
    },
    { status: 410 },
  );
}
