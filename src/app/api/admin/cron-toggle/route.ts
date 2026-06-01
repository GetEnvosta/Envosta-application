/**
 * POST /api/admin/cron-toggle  — Admin enable/disable a cron.
 *
 * Writes the `enabled` flag to platform_settings (cron:<name>). A disabled cron
 * still gets hit by Vercel on schedule, but guardCron() makes the route skip its
 * work. Admin-only.
 */
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isAdminRole } from '@/lib/roles';
import { isValidCron, setCronEnabled } from '@/lib/crons';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? '');
  const enabled = body?.enabled === true;
  if (!isValidCron(name)) return NextResponse.json({ error: 'Unknown cron' }, { status: 400 });

  try {
    await setCronEnabled(name, enabled);
    return NextResponse.json({ ok: true, name, enabled });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
