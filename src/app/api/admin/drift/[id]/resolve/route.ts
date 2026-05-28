/**
 * POST /api/admin/drift/[id]/resolve
 *
 * Admin-only. Marks a single `sync_drift` row as resolved (sets
 * `resolved=true, resolved_at=now()`). Driven by the "Mark resolved"
 * button on the /admin/audit Sync & Drift tab.
 *
 * Writes an audit_log row so the resolution is itself observable.
 */
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: profile } = await sb.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  if (!id) return NextResponse.json({ error: 'drift id required' }, { status: 400 });

  const { data: drift } = await sb
    .from('sync_drift')
    .select('id, resolved, provider, drift_type, resource_id')
    .eq('id', id)
    .maybeSingle();
  if (!drift) return NextResponse.json({ error: 'Drift row not found' }, { status: 404 });
  if (drift.resolved) return NextResponse.json({ ok: true, alreadyResolved: true });

  const now = new Date().toISOString();
  const { error: updErr } = await sb
    .from('sync_drift')
    .update({ resolved: true, resolved_at: now })
    .eq('id', id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: 'drift.resolved',
    resourceType: 'sync_drift',
    metadata: {
      drift_id: id,
      provider: drift.provider,
      drift_type: drift.drift_type,
      resource_id: drift.resource_id,
    },
  });

  return NextResponse.json({ ok: true, resolved: true });
}
