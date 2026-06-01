/**
 * POST /api/admin/run-cron  — Admin "Run now" trigger for a cron.
 *
 * Fires the cron's own route server-to-server with the CRON_SECRET (same as
 * Vercel would), times it, records the outcome to platform_settings, and
 * returns a snippet of the response. Admin-only.
 */
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isAdminRole } from '@/lib/roles';
import { CRONS, recordCronResult } from '@/lib/crons';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? '');
  const def = CRONS.find((c) => c.name === name);
  if (!def) return NextResponse.json({ error: 'Unknown cron' }, { status: 400 });
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });

  const origin = new URL(req.url).origin;
  const start = Date.now();
  try {
    const res = await fetch(`${origin}${def.path}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      cache: 'no-store',
    });
    const durationMs = Date.now() - start;
    const text = await res.text();
    const status = res.ok ? 'ok' : `http_${res.status}`;
    await recordCronResult(name, { status, durationMs, error: res.ok ? null : text.slice(0, 300) });
    return NextResponse.json({ ok: res.ok, httpStatus: res.status, durationMs, body: text.slice(0, 1000) });
  } catch (e) {
    const durationMs = Date.now() - start;
    const msg = e instanceof Error ? e.message : String(e);
    await recordCronResult(name, { status: 'error', durationMs, error: msg });
    return NextResponse.json({ ok: false, error: msg, durationMs }, { status: 502 });
  }
}
