/**
 * Vercel-runtime email helpers.
 *
 * Mirrors supabase/functions/_shared/email.ts so internal API routes
 * (and the Vercel-hosted Stripe webhook) can send branded transactional
 * emails without depending on Deno-specific imports. The templates +
 * subjects are intentionally identical to the edge-function originals.
 *
 * Send-side uses Resend's REST API directly. Failures are logged but
 * never thrown — email is best-effort and should not block business
 * logic.
 */

const FROM_EMAIL = 'Envosta <hello@email.envosta.com>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('[email] RESEND_API_KEY not set — skipping email to', params.to);
    return { ok: false, error: 'Email not configured' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: params.from ?? FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[email] Resend error:', data);
      return { ok: false, error: (data as any)?.message ?? 'Send failed' };
    }
    return { ok: true, id: (data as any)?.id };
  } catch (e) {
    console.error('[email] send error:', e);
    return { ok: false, error: String(e) };
  }
}

function template(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrap { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; text-decoration: none; }
    .logo-mark { width: 32px; height: 32px; }
    .logo-text { font-size: 22px; font-weight: 300; color: #0f172a; letter-spacing: -.5px; }
    h1 { font-size: 22px; font-weight: 600; color: #111; margin: 0 0 16px; line-height: 1.3; }
    p { font-size: 15px; color: #555; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; background: #111; color: #fff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 500; margin: 8px 0 24px; }
    .detail { background: #f8f9fb; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .detail-label { color: #888; }
    .detail-value { color: #111; font-weight: 500; }
    .footer { text-align: center; padding: 24px 0; font-size: 12px; color: #aaa; }
    .footer a { color: #888; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <a href="https://envosta.com" class="logo-row" style="text-decoration:none;">
        <img src="https://envosta.com/assets/Logo/envosta-logo-mark-dark.svg" alt="Envosta" class="logo-mark" width="32" height="32" style="width:32px;height:32px;">
        <span class="logo-text">Envosta</span>
      </a>
      ${content}
    </div>
    <div class="footer">
      <p>Envosta Inc. &middot; Calgary, Alberta, Canada</p>
      <p><a href="https://envosta.com">envosta.com</a> &middot; <a href="https://envosta.com/support">Support</a></p>
    </div>
  </div>
</body>
</html>`;
}

export function welcomeEmail(name: string, planName: string, loginUrl: string): { subject: string; html: string } {
  return {
    subject: `Welcome to Envosta, ${name}!`,
    html: template(`
      <h1>Welcome to Envosta!</h1>
      <p>Hey ${name}, thanks for choosing Envosta. Your <strong>${planName}</strong> plan is being set up right now.</p>
      <p>We're provisioning your WordPress site on enterprise infrastructure. You'll get another email when it's ready to go.</p>
      <a href="${loginUrl}" class="btn">Go to Your Dashboard</a>
      <p style="font-size:13px;color:#888;">If you chose onboarding, our team will reach out within 24 hours to schedule your call.</p>
    `),
  };
}

export function siteReadyEmail(name: string, siteName: string, siteUrl: string, wpAdminUrl: string): { subject: string; html: string } {
  return {
    subject: `Your site is live — ${siteName}`,
    html: template(`
      <h1>Your site is live!</h1>
      <p>Hey ${name}, great news — your WordPress site is provisioned and ready.</p>
      <div class="detail">
        <div class="detail-row"><span class="detail-label">Site</span><span class="detail-value">${siteName}</span></div>
        <div class="detail-row"><span class="detail-label">URL</span><span class="detail-value">${siteUrl}</span></div>
      </div>
      <a href="${wpAdminUrl}" class="btn">Open WordPress Admin</a>
      <p>Your daily backups, SSL certificate, and CDN are all active. You can manage everything from your <a href="https://my.envosta.com/dashboard">dashboard</a>.</p>
    `),
  };
}

export function invoicePaidEmail(name: string, amount: string, description: string, invoiceUrl: string | null): { subject: string; html: string } {
  return {
    subject: `Payment received — ${amount}`,
    html: template(`
      <h1>Payment received</h1>
      <p>Hey ${name}, we've received your payment. Here's your receipt:</p>
      <div class="detail">
        <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">${amount}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${description}</span></div>
      </div>
      ${invoiceUrl ? `<a href="${invoiceUrl}" class="btn">View Invoice</a>` : ''}
      <p style="font-size:13px;color:#888;">You can view all invoices in your <a href="https://my.envosta.com/dashboard/billing">billing dashboard</a>.</p>
    `),
  };
}

export function paymentFailedEmail(name: string, amount: string): { subject: string; html: string } {
  return {
    subject: `Payment failed — please update your card`,
    html: template(`
      <h1>We couldn't charge your card</h1>
      <p>Hey ${name}, your most recent payment of <strong>${amount}</strong> didn't go through. We'll automatically retry over the next few weeks.</p>
      <p>To avoid any service interruption, please update your payment method now.</p>
      <a href="https://my.envosta.com/dashboard/billing" class="btn">Update Payment Method</a>
      <p style="font-size:13px;color:#888;">If we can't collect after several attempts, your subscription will be cancelled and your sites will be paused. You'll have time to restore them before anything is removed.</p>
    `),
  };
}

export function sitesPausedEmail(name: string, siteCount: number): { subject: string; html: string } {
  const sitesStr = siteCount === 1 ? '1 site' : `${siteCount} sites`;
  return {
    subject: `Your ${sitesStr} ${siteCount === 1 ? 'has' : 'have'} been paused`,
    html: template(`
      <h1>Your sites are paused</h1>
      <p>Hey ${name}, your hosting subscription was cancelled because we weren't able to collect payment. We've paused <strong>${sitesStr}</strong> on your account.</p>
      <p>Your data is safe and untouched. Sign back in, restart your subscription, and your sites will be reactivated.</p>
      <a href="https://my.envosta.com/dashboard/billing" class="btn">Restart Subscription</a>
      <p style="font-size:13px;color:#888;">If you don't restore service, your sites may eventually be queued for deletion. We'll always notify you before anything is permanently removed.</p>
    `),
  };
}

export function provisioningFailedEmail(name: string, siteName: string): { subject: string; html: string } {
  return {
    subject: `Action needed — site setup issue`,
    html: template(`
      <h1>Site setup needs attention</h1>
      <p>Hey ${name}, we ran into an issue setting up your site <strong>${siteName}</strong>. Our team has been notified and is looking into it.</p>
      <p>You don't need to do anything — we'll reach out once it's resolved. If you have questions, open a support ticket.</p>
      <a href="https://my.envosta.com/dashboard/tickets/new" class="btn">Contact Support</a>
    `),
  };
}

/**
 * One group of drift rows sharing a provider + drift_type, as composed
 * by the drift-alerter cron.
 */
export interface DriftAlertGroup {
  provider: string;
  driftType: string;
  count: number;
  exampleResourceIds: string[];
}

/**
 * Internal ops digest summarising unresolved sync_drift the
 * reconciliation crons flagged. Sent to ADMIN_ALERT_EMAIL by
 * /api/cron/drift-alerter. Not a customer-facing email.
 */
export function driftAlertEmail(groups: DriftAlertGroup[]): { subject: string; html: string } {
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  const rows = groups
    .map(
      (g) => `
      <div class="detail">
        <div class="detail-row"><span class="detail-label">Provider</span><span class="detail-value">${g.provider}</span></div>
        <div class="detail-row"><span class="detail-label">Drift type</span><span class="detail-value">${g.driftType}</span></div>
        <div class="detail-row"><span class="detail-label">Count</span><span class="detail-value">${g.count}</span></div>
        <div class="detail-row"><span class="detail-label">Examples</span><span class="detail-value" style="font-size:12px;">${
          g.exampleResourceIds.length ? g.exampleResourceIds.join(', ') : '—'
        }</span></div>
      </div>`,
    )
    .join('');

  return {
    subject: `[Envosta ops] ${total} unresolved sync drift ${total === 1 ? 'issue' : 'issues'}`,
    html: template(`
      <h1>Sync drift detected</h1>
      <p>The reconciliation crons flagged <strong>${total}</strong> unresolved drift ${
        total === 1 ? 'row' : 'rows'
      } that ${total === 1 ? 'has' : 'have'} been outstanding for over an hour. Grouped by provider and type:</p>
      ${rows}
      <a href="https://my.envosta.com/admin/audit?tab=sync" class="btn">Open Audit Dashboard</a>
      <p style="font-size:13px;color:#888;">Each of these rows has been stamped so you won't be alerted about them again. Resolve them from the Sync &amp; Drift tab once handled.</p>
    `),
  };
}
