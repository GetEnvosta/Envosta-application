import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const FROM = 'Envosta <hello@email.envosta.com>';

// Inline templates so we don't depend on Edge Function imports
function template(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body{margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
  .wrap{max-width:560px;margin:0 auto;padding:40px 20px}
  .card{background:#fff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .logo-row{display:flex;align-items:center;gap:10px;margin-bottom:32px;text-decoration:none}
  .logo-mark{width:32px;height:32px}
  .logo-text{font-size:22px;font-weight:300;color:#0f172a;letter-spacing:-.5px}
  h1{font-size:22px;font-weight:600;color:#111;margin:0 0 16px;line-height:1.3}
  p{font-size:15px;color:#555;line-height:1.7;margin:0 0 16px}
  .btn{display:inline-block;background:#111;color:#fff!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;margin:8px 0 24px}
  .detail{background:#f8f9fb;border-radius:8px;padding:16px 20px;margin:16px 0}
  .detail-row{display:flex;justify-content:space-between;padding:6px 0;font-size:14px}
  .detail-label{color:#888}.detail-value{color:#111;font-weight:500}
  .footer{text-align:center;padding:24px 0;font-size:12px;color:#aaa}.footer a{color:#888;text-decoration:none}
</style></head><body>
<div class="wrap"><div class="card"><a href="https://envosta.com" class="logo-row" style="text-decoration:none;"><img src="https://envosta.com/assets/Logo/envosta-logo-mark-blue.svg" alt="Envosta" class="logo-mark" width="32" height="32" style="width:32px;height:32px;"><span class="logo-text">Envosta</span></a>${content}</div>
<div class="footer"><p>Envosta Inc. · Calgary, Alberta, Canada</p><p><a href="https://envosta.com">envosta.com</a> · <a href="https://envosta.com/support">Support</a></p></div></div>
</body></html>`;
}

const TEMPLATES: Record<string, { subject: string; html: string }> = {
  welcome: {
    subject: 'Welcome to Envosta, Test User!',
    html: template(`<h1>Welcome to Envosta!</h1><p>Hey Test User, thanks for choosing Envosta. Your <strong>Growth</strong> plan is being set up right now.</p><p>We're provisioning your WordPress site on enterprise infrastructure. You'll get another email when it's ready to go.</p><a href="https://my.envosta.com/dashboard" class="btn">Go to Your Dashboard</a><p style="font-size:13px;color:#888;">If you chose onboarding, our team will reach out within 24 hours to schedule your call.</p>`),
  },
  site_ready: {
    subject: 'Your site is live — test-site',
    html: template(`<h1>Your site is live! 🎉</h1><p>Hey Test User, great news — your WordPress site is provisioned and ready.</p><div class="detail"><div class="detail-row"><span class="detail-label">Site</span><span class="detail-value">test-site</span></div><div class="detail-row"><span class="detail-label">URL</span><span class="detail-value">https://test.envosta.com</span></div></div><a href="https://test.envosta.com/wp-admin" class="btn">Open WordPress Admin</a><p>Your daily backups, SSL certificate, and CDN are all active.</p>`),
  },
  domain_registered: {
    subject: 'Domain registered: testdomain.com',
    html: template(`<h1>Domain registered</h1><p>Hey Test User, your domain <strong>testdomain.com</strong> has been registered successfully.</p><div class="detail"><div class="detail-row"><span class="detail-label">Domain</span><span class="detail-value">testdomain.com</span></div><div class="detail-row"><span class="detail-label">WHOIS Privacy</span><span class="detail-value">Enabled</span></div><div class="detail-row"><span class="detail-label">Auto-Renew</span><span class="detail-value">On</span></div></div><p>DNS records have been configured automatically.</p><a href="https://my.envosta.com/dashboard/domains" class="btn">Manage Domains</a>`),
  },
  invoice_paid: {
    subject: 'Payment received — $129.00 CAD',
    html: template(`<h1>Payment received</h1><p>Hey Test User, we've received your payment. Here's your receipt:</p><div class="detail"><div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">$129.00 CAD</span></div><div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">Growth Plan — Monthly</span></div></div><a href="#" class="btn">View Invoice</a><p style="font-size:13px;color:#888;">You can view all invoices in your <a href="https://my.envosta.com/dashboard/billing">billing dashboard</a>.</p>`),
  },
  domain_expiry: {
    subject: 'Domain expiring soon: testdomain.com',
    html: template(`<h1>Domain expiring in 7 days</h1><p>Hey Test User, your domain <strong>testdomain.com</strong> expires in <strong>7 days</strong>.</p><p>Auto-renew is <strong>enabled</strong>, so it will renew automatically. No action needed.</p>`),
  },
  provisioning_failed: {
    subject: 'Action needed — site setup issue',
    html: template(`<h1>Site setup needs attention</h1><p>Hey Test User, we ran into an issue setting up your site <strong>test-site</strong>. Our team has been notified and is looking into it.</p><p>You don't need to do anything — we'll reach out once it's resolved.</p><a href="https://my.envosta.com/dashboard/tickets/new" class="btn">Contact Support</a>`),
  },
};

export async function POST(req: Request) {
  // Verify admin
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: profile } = await sb.from('users').select('role, email').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin required' }, { status: 403 });

  const { template: templateKey, to } = await req.json();
  const sendTo = to || profile.email || user.email;
  const tmpl = TEMPLATES[templateKey];

  if (!tmpl) return NextResponse.json({ error: `Unknown template: ${templateKey}` }, { status: 400 });
  if (!RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: sendTo, subject: `[TEST] ${tmpl.subject}`, html: tmpl.html }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.message ?? 'Send failed' }, { status: 502 });

  return NextResponse.json({ success: true, id: data.id, to: sendTo });
}
