/**
 * POST /api/admin/cac-entry — save a month's manual CAC inputs
 * (charter §8: CAC = fully-loaded cost per closed client).
 * Stored in platform_settings KV as `cac:YYYY-MM`; Phase 6 migrates to
 * the `cac_entries` table. Admin only.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { isAdminRole } from '@/lib/roles';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).maybeSingle();
  if (!isAdminRole(profile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const month = typeof body.month === 'string' && /^\d{4}-\d{2}$/.test(body.month) ? body.month : null;
  if (!month) return NextResponse.json({ error: 'month (YYYY-MM) is required' }, { status: 400 });

  const entry = {
    spend_cents: Math.max(0, Math.round(Number(body.spendCents) || 0)),
    hours: Math.max(0, Number(body.hours) || 0),
    hourly_cents: Math.max(0, Math.round(Number(body.hourlyCents) || 0)),
    closed_clients: Math.max(0, Math.round(Number(body.closedClients) || 0)),
  };

  const { error } = await sb.from('platform_settings').upsert(
    { key: `cac:${month}`, value: entry },
    { onConflict: 'key' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: 'gates.cac_entry.saved',
    resourceType: 'platform_settings',
    resourceId: `cac:${month}`,
    metadata: entry,
  });

  return NextResponse.json({ ok: true });
}
