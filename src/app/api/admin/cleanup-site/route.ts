import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Admin endpoint for the cleanup queue at /admin/sites/cleanup.
 *
 * action: 'flag'    → paused site → flagged_for_deletion (still alive, awaiting confirm)
 *         'unflag'  → flagged_for_deletion → paused
 *         'delete'  → flagged_for_deletion → call wp.cloud hard-delete + status='deleted'
 */
export async function POST(req: Request) {
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { siteId, action } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });
  if (!['flag', 'unflag', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }

  const { data: site } = await sb.from('sites').select('id, status, label, wp_cloud_site_id, user_id, users:user_id(email, full_name)').eq('id', siteId).maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const owner = (site as any).users as { email: string; full_name: string | null } | null;
  const siteName = site.label ?? `site ${siteId.slice(0, 8)}`;

  if (action === 'flag') {
    if (site.status !== 'paused') {
      return NextResponse.json({ error: `Only paused sites can be flagged (status=${site.status})` }, { status: 409 });
    }
    await sb.from('sites').update({
      status: 'flagged_for_deletion',
      flagged_for_deletion_at: new Date().toISOString(),
      flag_reason: 'admin_review',
    }).eq('id', siteId);
    await sb.from('logs').insert({
      user_id: user.id,
      action: 'admin.site_flagged',
      details: `Admin flagged ${siteName} for deletion.`,
      level: 'warn',
    });
    if (owner?.email) {
      await sendOwnerEmail(owner.email, siteFlaggedForDeletionSubject(siteName), siteFlaggedForDeletionHtml(owner.full_name, siteName));
    }
    return NextResponse.json({ ok: true, flagged: true });
  }

  if (action === 'unflag') {
    if (site.status !== 'flagged_for_deletion') {
      return NextResponse.json({ error: `Site is not flagged (status=${site.status})` }, { status: 409 });
    }
    await sb.from('sites').update({
      status: 'paused',
      flagged_for_deletion_at: null,
      flag_reason: null,
    }).eq('id', siteId);
    await sb.from('logs').insert({
      user_id: user.id,
      action: 'admin.site_unflagged',
      details: `Admin restored ${site.label ?? siteId} back to paused.`,
      level: 'info',
    });
    return NextResponse.json({ ok: true, unflagged: true });
  }

  // action === 'delete' — only flagged sites can be permanently deleted.
  if (site.status !== 'flagged_for_deletion') {
    return NextResponse.json({ error: `Flag the site for deletion before deleting (status=${site.status})` }, { status: 409 });
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ action: 'hard-delete-site', siteId, userId: user.id }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `wp.cloud delete failed: ${text.slice(0, 300)}` }, { status: 502 });
  }

  await sb.from('sites').update({ status: 'deleted' }).eq('id', siteId);
  await sb.from('logs').insert({
    user_id: user.id,
    action: 'admin.site_deleted',
    details: `Admin permanently deleted ${siteName} from cleanup queue.`,
    level: 'warn',
  });

  if (owner?.email) {
    await sendOwnerEmail(owner.email, siteDeletedSubject(siteName), siteDeletedHtml(owner.full_name, siteName));
  }

  return NextResponse.json({ ok: true, deleted: true });
}

// ── Inline email helpers (mirror supabase/functions/_shared/email.ts) ──
// Kept inline so we don't have to wire deno imports into the Next.js runtime.
function emailShell(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:0;background:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.wrap{max-width:560px;margin:0 auto;padding:40px 20px}.card{background:#fff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,.08)}h1{font-size:22px;font-weight:600;color:#111;margin:0 0 16px;line-height:1.3}p{font-size:15px;color:#555;line-height:1.7;margin:0 0 16px}.btn{display:inline-block;background:#111;color:#fff!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;margin:8px 0 24px}.footer{text-align:center;padding:24px 0;font-size:12px;color:#aaa}.footer a{color:#888;text-decoration:none}</style></head><body><div class="wrap"><div class="card">${content}</div><div class="footer"><p>Envosta Inc. · Calgary, Alberta, Canada</p><p><a href="https://envosta.com">envosta.com</a> · <a href="https://envosta.com/support">Support</a></p></div></div></body></html>`;
}

function siteFlaggedForDeletionSubject(siteName: string) {
  return `Final notice — ${siteName} queued for deletion`;
}
function siteFlaggedForDeletionHtml(name: string | null, siteName: string) {
  return emailShell(`<h1>${siteName} is queued for deletion</h1><p>Hey ${name ?? 'there'}, your site <strong>${siteName}</strong> has been flagged for deletion. This is your last chance to restore it before it's permanently removed.</p><p>To save your site, restart your subscription and contact support so we can move it back out of the cleanup queue.</p><a href="https://my.envosta.com/dashboard/billing" class="btn">Restart Subscription</a><p style="font-size:13px;color:#888;">An admin will review and confirm the deletion. Once deleted, your site and its data cannot be recovered.</p>`);
}

function siteDeletedSubject(siteName: string) {
  return `${siteName} has been permanently deleted`;
}
function siteDeletedHtml(name: string | null, siteName: string) {
  return emailShell(`<h1>${siteName} has been deleted</h1><p>Hey ${name ?? 'there'}, your site <strong>${siteName}</strong> has been permanently removed from our servers. All site files and databases have been deleted.</p><p>If you'd like to start a new site, you can sign up again at any time. We're sorry to see you go.</p><a href="https://envosta.com/get-started" class="btn">Start a New Site</a><p style="font-size:13px;color:#888;">If you believe this was done in error, please contact <a href="https://envosta.com/support">support</a> immediately.</p>`);
}

async function sendOwnerEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Envosta <hello@email.envosta.com>', to, subject, html }),
    });
  } catch (e) {
    console.error('cleanup-site email send failed:', e);
  }
}
