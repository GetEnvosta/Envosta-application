/**
 * POST /api/internal/opensrs/set-auto-renew
 *
 * Internal route that flips the OpenSRS-side auto-renew flag for an
 * Envosta-registered domain. Wraps
 * `createOpenSrsClient().setAutoRenew()` (action `MODIFY`,
 * data=expire_action).
 *
 * Architectural note:
 *   Envosta normally keeps OpenSRS auto-renew OFF for every domain —
 *   the daily `process-domain-renewals` cron is the source of truth
 *   for billing and calls `renewDomain()` manually. This route exists
 *   for admin operations (e.g. backfilling pre-policy domains, rare
 *   overrides) and for keeping the `opensrs_domains` mirror table in
 *   sync. The customer-facing dashboard toggle does NOT call this
 *   route — it only updates `domains.auto_renew` (the cron's filter).
 *
 * Side effects:
 *   - Calls OpenSRS set_auto_renew
 *   - Updates `opensrs_domains.auto_renew` + `let_expire`
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

interface SetAutoRenewBody {
  domainName: string;
  enabled: boolean;
  actorId?: string;
}

export async function POST(req: Request) {
  if (!verifyInternalToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SetAutoRenewBody;
  try {
    body = (await req.json()) as SetAutoRenewBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.domainName) {
    return NextResponse.json({ error: 'domainName is required' }, { status: 400 });
  }
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
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

  const { data: mirror } = await sb
    .from('opensrs_domains')
    .select('auto_renew, let_expire')
    .eq('domain_id', domain.id)
    .maybeSingle();

  const client = createOpenSrsClient();
  try {
    await client.setAutoRenew(body.domainName, body.enabled);

    const nowIso = new Date().toISOString();
    await sb.from('opensrs_domains').update({
      auto_renew: body.enabled,
      let_expire: !body.enabled,
      last_synced_at: nowIso,
    }).eq('domain_id', domain.id);

    await recordAudit({
      actorType: 'system',
      actorId: body.actorId ?? domain.user_id,
      action: 'opensrs.auto_renew.set',
      resourceType: 'domain',
      resourceId: domain.id,
      before: { auto_renew: mirror?.auto_renew ?? null, let_expire: mirror?.let_expire ?? null },
      after: { auto_renew: body.enabled, let_expire: !body.enabled },
      metadata: { source: 'internal-route' },
    });

    return NextResponse.json({
      ok: true,
      domainId: domain.id,
      domainName: body.domainName,
      auto_renew: body.enabled,
    });
  } catch (e) {
    const isOpenSrsErr = e instanceof OpenSrsError;
    const message = e instanceof Error ? e.message : String(e);

    await recordAudit({
      actorType: 'system',
      actorId: body.actorId ?? domain.user_id,
      action: 'opensrs.auto_renew.set_failed',
      resourceType: 'domain',
      resourceId: domain.id,
      before: { auto_renew: mirror?.auto_renew ?? null },
      after: null,
      metadata: {
        error: message,
        response_code: isOpenSrsErr ? e.responseCode : undefined,
      },
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
