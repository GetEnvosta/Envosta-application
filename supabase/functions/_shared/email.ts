const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = "Envosta <hello@email.envosta.com>";
const FROM_NOREPLY = "Envosta <noreply@email.envosta.com>";

/**
 * Send an email via Resend API.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set, skipping email");
    return { ok: false, error: "Email not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: params.from ?? FROM_EMAIL,
        to: params.to,
        subject: params.subject,
        html: params.html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend error:", data);
      return { ok: false, error: data.message ?? "Send failed" };
    }

    console.log("Email sent:", data.id, "to:", params.to);
    return { ok: true, id: data.id };
  } catch (e) {
    console.error("Email send error:", e);
    return { ok: false, error: String(e) };
  }
}

/**
 * Wrap content in branded email template.
 */
function template(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrap { max-width: 560px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .logo { font-size: 20px; font-weight: 300; color: #111; letter-spacing: -.5px; margin-bottom: 32px; }
    .logo span { font-weight: 500; }
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
      <div class="logo">Env<span>o</span>sta</div>
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

// ════════════════════════════════════════
// EMAIL TEMPLATES
// ════════════════════════════════════════

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
      <h1>Your site is live! 🎉</h1>
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

export function domainRegisteredEmail(name: string, domain: string): { subject: string; html: string } {
  return {
    subject: `Domain registered: ${domain}`,
    html: template(`
      <h1>Domain registered</h1>
      <p>Hey ${name}, your domain <strong>${domain}</strong> has been registered successfully.</p>
      <div class="detail">
        <div class="detail-row"><span class="detail-label">Domain</span><span class="detail-value">${domain}</span></div>
        <div class="detail-row"><span class="detail-label">WHOIS Privacy</span><span class="detail-value">Enabled</span></div>
        <div class="detail-row"><span class="detail-label">Auto-Renew</span><span class="detail-value">On</span></div>
      </div>
      <p>DNS records have been configured automatically. It may take up to 48 hours for DNS to fully propagate.</p>
      <a href="https://my.envosta.com/dashboard/domains" class="btn">Manage Domains</a>
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

export function domainExpiryWarningEmail(name: string, domain: string, daysLeft: number, autoRenew: boolean): { subject: string; html: string } {
  return {
    subject: `Domain expiring soon: ${domain}`,
    html: template(`
      <h1>Domain expiring in ${daysLeft} days</h1>
      <p>Hey ${name}, your domain <strong>${domain}</strong> expires in <strong>${daysLeft} days</strong>.</p>
      ${autoRenew
        ? `<p>Auto-renew is <strong>enabled</strong>, so it will renew automatically. No action needed.</p>`
        : `<p style="color:#dc2626;"><strong>Auto-renew is off.</strong> If you don't renew, you'll lose this domain.</p>
           <a href="https://my.envosta.com/dashboard/domains" class="btn">Manage Domain</a>`
      }
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
