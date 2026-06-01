/**
 * GET /api/cron/drift-alerter
 *
 * Observability digest — runs every 6 hours.
 *
 * Digests unresolved `sync_drift` rows into ONE ops email so drift the
 * reconciliation crons flagged doesn't sit unnoticed. This is NOT a
 * reconcile sweep — it never touches upstream state and never opens a
 * `sync_runs` row. It only reads `sync_drift`, sends an email, and
 * stamps `alerted_at`.
 *
 * Idempotency: a drift row is alerted EXACTLY ONCE. We only pick up
 * rows where `alerted_at IS NULL`, and we stamp `alerted_at = now()` on
 * every row included in the digest immediately after composing it — so
 * even if the email send fails, those rows won't pile up across runs.
 *
 * The 1-hour `created_at` delay deliberately skips fresh drift that an
 * imminent reconcile run is likely to auto-resolve.
 *
 * Recipient: `ADMIN_ALERT_EMAIL` if set, else the first `users` row with
 * `role='admin'`. If neither resolves we log a warning and skip the
 * send — but still stamp `alerted_at` so the digest doesn't grow.
 *
 * Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { driftAlertEmail, sendEmail, type DriftAlertGroup } from '@/lib/email';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(req: Request) {
  // ── Auth ──
  const authHeader = req.headers.get('authorization');
  // Fail-closed: reject when CRON_SECRET is unset (was fail-open before).
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pause check + last-run stamp (managed in Settings → Crons). Fail-open.
  const { guardCron } = await import('@/lib/crons');
  if (!(await guardCron('drift-alerter')).enabled) {
    return NextResponse.json({ ok: true, skipped: 'cron paused' });
  }

  const supabase = sb();

  // ── What to alert on: unresolved, unalerted, >1h old drift ──
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: drift, error } = await supabase
    .from('sync_drift')
    .select('id, provider, drift_type, resource_id, created_at')
    .eq('resolved', false)
    .is('alerted_at', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[drift-alerter] sync_drift query failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!drift || drift.length === 0) {
    return NextResponse.json({ ok: true, alerted: 0 });
  }

  // ── Group by provider + drift_type with counts + example IDs ──
  const groupMap = new Map<string, DriftAlertGroup>();
  for (const row of drift) {
    const provider = row.provider ?? 'unknown';
    const driftType = row.drift_type ?? 'unknown';
    const key = `${provider}::${driftType}`;
    let group = groupMap.get(key);
    if (!group) {
      group = { provider, driftType, count: 0, exampleResourceIds: [] };
      groupMap.set(key, group);
    }
    group.count += 1;
    if (group.exampleResourceIds.length < 3 && row.resource_id) {
      group.exampleResourceIds.push(String(row.resource_id));
    }
  }
  const groups = Array.from(groupMap.values()).sort(
    (a, b) => b.count - a.count || a.provider.localeCompare(b.provider),
  );

  // ── Resolve the recipient ──
  let recipient = process.env.ADMIN_ALERT_EMAIL?.trim() || null;
  if (!recipient) {
    const { data: admin } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'admin')
      .not('email', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    recipient = admin?.email ?? null;
  }

  // ── Send the digest (best-effort) ──
  let sent = false;
  if (recipient) {
    const { subject, html } = driftAlertEmail(groups);
    const res = await sendEmail({ to: recipient, subject, html });
    sent = res.ok;
    if (!res.ok) {
      console.error('[drift-alerter] digest email failed:', res.error);
    }
  } else {
    console.warn(
      '[drift-alerter] no recipient — ADMIN_ALERT_EMAIL unset and no admin user found; stamping alerted_at anyway',
    );
  }

  // ── Stamp alerted_at so each row is alerted exactly once ──
  const ids = drift.map((d) => d.id);
  const stampedAt = new Date().toISOString();
  const { error: stampErr } = await supabase
    .from('sync_drift')
    .update({ alerted_at: stampedAt })
    .in('id', ids);
  if (stampErr) {
    console.error('[drift-alerter] alerted_at stamp failed:', stampErr);
  }

  // ── Audit log — system actor, drift.alerted ──
  await recordAudit({
    actorType: 'system',
    action: 'drift.alerted',
    resourceType: 'sync_drift',
    metadata: {
      total: drift.length,
      groups: groups.map((g) => ({
        provider: g.provider,
        drift_type: g.driftType,
        count: g.count,
      })),
      recipient: recipient ?? null,
      email_sent: sent,
    },
  });

  return NextResponse.json({
    ok: true,
    alerted: drift.length,
    groups: groups.length,
    recipient: recipient ?? null,
    email_sent: sent,
  });
}
