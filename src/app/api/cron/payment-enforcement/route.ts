import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const GRACE_PERIOD_DAYS = 30;
const UNPAID_FLAG_DAYS = 90;

/**
 * Daily cron: enforce payment grace periods.
 *
 * - 0-30 days after payment failure: grace period, everything runs
 * - 30 days: suspend sites, disable domain auto-renew, save pre-suspension state
 * - 90 days: flag account as 'unpaid' for admin review
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const now = new Date();
  let suspended = 0;
  let flagged = 0;
  const errors: string[] = [];

  // ── 30-DAY: Suspend grace period accounts ──
  const thirtyDaysAgo = new Date(now.getTime() - GRACE_PERIOD_DAYS * 86400000).toISOString();

  const { data: graceUsers } = await sb
    .from('users')
    .select('id, full_name, email, payment_failed_at')
    .eq('payment_status', 'grace')
    .lt('payment_failed_at', thirtyDaysAgo);

  for (const user of graceUsers ?? []) {
    try {
      // Save current site states before suspending
      const { data: sites } = await sb
        .from('sites')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'provisioning']);

      const { data: domains } = await sb
        .from('domains')
        .select('id, auto_renew')
        .eq('user_id', user.id)
        .eq('auto_renew', true);

      const preSuspensionState = {
        sites: (sites ?? []).map(s => ({ id: s.id, status: s.status })),
        domains: (domains ?? []).map(d => ({ id: d.id, auto_renew: d.auto_renew })),
      };

      // Suspend all active sites
      for (const site of sites ?? []) {
        await sb.from('sites').update({ status: 'suspended' }).eq('id', site.id);
      }

      // Disable auto-renew on all domains
      for (const domain of domains ?? []) {
        await sb.from('domains').update({ auto_renew: false }).eq('id', domain.id);
      }

      // Update user status
      await sb.from('users').update({
        payment_status: 'suspended',
        suspended_at: now.toISOString(),
        pre_suspension_state: preSuspensionState,
      }).eq('id', user.id);

      // Log
      await sb.from('logs').insert({
        user_id: user.id,
        action: 'billing.suspended',
        details: `Account suspended after ${GRACE_PERIOD_DAYS}-day grace period. ${sites?.length ?? 0} sites paused, ${domains?.length ?? 0} domain auto-renews disabled.`,
        level: 'warn',
        metadata: preSuspensionState,
      });

      // Email the customer
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Envosta <noreply@email.envosta.com>',
            to: user.email,
            subject: 'Account suspended — payment required',
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border-radius:12px;padding:40px 32px;box-shadow:0 1px 3px rgba(0,0,0,.08)"><h1 style="font-size:22px;font-weight:600;color:#111;margin:0 0 16px">Account Suspended</h1><p style="font-size:15px;color:#555;line-height:1.7">Hey ${user.full_name ?? 'there'}, your Envosta account has been suspended due to an unpaid balance. Your sites have been paused and domain auto-renewals have been disabled.</p><p style="font-size:15px;color:#555;line-height:1.7">To restore your services, please add credits to your account.</p><a href="https://my.envosta.com/dashboard/billing" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;margin:8px 0 24px">Add Credits Now</a><p style="font-size:13px;color:#888">Your data is safe. Once payment is received, your sites and domain settings will be restored automatically.</p></div></div>`,
          }),
        });
      }

      suspended++;
    } catch (err) {
      errors.push(`Suspend ${user.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 90-DAY: Flag as unpaid ──
  const ninetyDaysAgo = new Date(now.getTime() - UNPAID_FLAG_DAYS * 86400000).toISOString();

  const { data: suspendedUsers } = await sb
    .from('users')
    .select('id, full_name, email, payment_failed_at')
    .eq('payment_status', 'suspended')
    .lt('payment_failed_at', ninetyDaysAgo);

  for (const user of suspendedUsers ?? []) {
    try {
      await sb.from('users').update({ payment_status: 'unpaid' }).eq('id', user.id);

      await sb.from('logs').insert({
        user_id: user.id,
        action: 'billing.unpaid_flagged',
        details: `Account flagged as unpaid after ${UNPAID_FLAG_DAYS} days. Requires admin review.`,
        level: 'error',
      });

      // Email admin
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Envosta <noreply@email.envosta.com>',
            to: 'admin@envosta.com',
            subject: `[Unpaid] ${user.full_name ?? user.email} — 90 days overdue`,
            html: `<p><strong>${user.full_name}</strong> (${user.email}) has been unpaid for 90+ days. Account flagged for admin review.</p><a href="https://my.envosta.com/admin/customers">Review in Admin</a>`,
          }),
        });
      }

      flagged++;
    } catch (err) {
      errors.push(`Flag ${user.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    message: 'Payment enforcement complete',
    suspended,
    flagged,
    errors: errors.length > 0 ? errors : undefined,
  });
}
