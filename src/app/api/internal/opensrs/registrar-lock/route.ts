/**
 * POST /api/internal/opensrs/registrar-lock
 *
 * Internal route that reads or toggles the registrar transfer lock for
 * an Envosta-registered domain.
 *
 *   - Body { domainName }                  → READ current lock state via
 *                                            getDomainAllInfo (type=status
 *                                            carries lock_state).
 *   - Body { domainName, locked: boolean } → SET the lock via
 *                                            setRegistrarLock (action
 *                                            MODIFY, data=status,
 *                                            lock_state=0|1).
 *
 * Side effects (set only):
 *   - Calls OpenSRS set_registrar_lock
 *   - Updates `opensrs_domains.lock_state`
 *   - Records the change to `audit_log` with before/after
 *
 * Auth: X-Internal-Token header must match INTERNAL_API_TOKEN env var.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyInternalToken } from '@/lib/internal-auth';
import { createOpenSrsClient, OpenSrsError } from '@/lib/integrations/opensrs';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RegistrarLockBody {
  domainName: string;
  locked?: boolean;
  actorId?: string;
}

export async function POST(req: Request) {
  if (!verifyInternalToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RegistrarLockBody;
  try {
    body = (await req.json()) as RegistrarLockBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.domainName) {
    return NextResponse.json({ error: 'domainName is required' }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: domain, error: fetchErr } = await sb
    .from('domains')
    .select('id, user_id')
    .eq('domain_name', body.domainName)
    .maybeSingle();
  if (fetchErr || !domain) {
    return NextResponse.json({ error: 'Domain row not found' }, { status: 404 });
  }

  const client = createOpenSrsClient();

  // ── READ path ──────────────────────────────────────────────
  if (typeof body.locked !== 'boolean') {
    try {
      const info = await client.getDomainAllInfo(body.domainName);
      const locked = info.lock_state ?? false;
      // Keep the mirror fresh on read (best-effort).
      await sb
        .from('opensrs_domains')
        .update({ lock_state: info.lock_state ?? null, last_synced_at: new Date().toISOString() })
        .eq('domain_id', domain.id);
      return NextResponse.json({ ok: true, domainName: body.domainName, locked });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  // ── SET path ───────────────────────────────────────────────
  const { data: mirror } = await sb
    .from('opensrs_domains')
    .select('lock_state')
    .eq('domain_id', domain.id)
    .maybeSingle();

  try {
    await client.setRegistrarLock(body.domainName, body.locked);

    await sb
      .from('opensrs_domains')
      .update({ lock_state: body.locked, last_synced_at: new Date().toISOString() })
      .eq('domain_id', domain.id);

    await recordAudit({
      actorType: 'system',
      actorId: body.actorId ?? domain.user_id,
      action: 'opensrs.registrar_lock.set',
      resourceType: 'domain',
      resourceId: domain.id,
      before: { lock_state: mirror?.lock_state ?? null },
      after: { lock_state: body.locked },
      metadata: { source: 'internal-route' },
    });

    return NextResponse.json({
      ok: true,
      domainName: body.domainName,
      locked: body.locked,
    });
  } catch (e) {
    const isOpenSrsErr = e instanceof OpenSrsError;
    const message = e instanceof Error ? e.message : String(e);

    await recordAudit({
      actorType: 'system',
      actorId: body.actorId ?? domain.user_id,
      action: 'opensrs.registrar_lock.set_failed',
      resourceType: 'domain',
      resourceId: domain.id,
      before: { lock_state: mirror?.lock_state ?? null },
      after: null,
      metadata: {
        error: message,
        response_code: isOpenSrsErr ? e.responseCode : undefined,
      },
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
