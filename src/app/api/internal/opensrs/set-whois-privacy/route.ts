/**
 * POST /api/internal/opensrs/set-whois-privacy
 *
 * Internal route that toggles WHOIS privacy for an Envosta-registered
 * domain. Wraps `createOpenSrsClient().setWhoisPrivacy()` (action
 * `MODIFY`, data=whois_privacy_state, state=enable|disable).
 *
 * Unlike auto-renew, WHOIS privacy is a service OpenSRS provides
 * directly — the customer toggle mirrors straight to OpenSRS via
 * this call, and the `opensrs_domains.whois_privacy` mirror column
 * tracks the resulting state.
 *
 * Side effects:
 *   - Calls OpenSRS set_whois_privacy
 *   - Updates `opensrs_domains.whois_privacy` ('enabled' | 'disabled')
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

interface SetWhoisPrivacyBody {
  domainName: string;
  enabled: boolean;
  actorId?: string;
}

export async function POST(req: Request) {
  if (!verifyInternalToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SetWhoisPrivacyBody;
  try {
    body = (await req.json()) as SetWhoisPrivacyBody;
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
    .select('id, user_id, metadata')
    .eq('domain_name', body.domainName)
    .maybeSingle();
  if (fetchErr || !domain) {
    return NextResponse.json({ error: 'Domain row not found' }, { status: 404 });
  }

  const { data: mirror } = await sb
    .from('opensrs_domains')
    .select('whois_privacy')
    .eq('domain_id', domain.id)
    .maybeSingle();

  const nextState = body.enabled ? 'enabled' : 'disabled';
  const client = createOpenSrsClient();

  try {
    await client.setWhoisPrivacy(body.domainName, body.enabled);

    const nowIso = new Date().toISOString();
    await sb.from('opensrs_domains').update({
      whois_privacy: nextState,
      last_synced_at: nowIso,
    }).eq('domain_id', domain.id);

    // Also reflect on domains.metadata so legacy callers reading the
    // JSONB shape see the new state without consulting the mirror.
    await sb.from('domains').update({
      metadata: {
        ...((domain.metadata as Record<string, unknown> | null) ?? {}),
        whois_privacy: body.enabled,
      },
    }).eq('id', domain.id);

    await recordAudit({
      actorType: 'system',
      actorId: body.actorId ?? domain.user_id,
      action: 'opensrs.whois_privacy.set',
      resourceType: 'domain',
      resourceId: domain.id,
      before: { whois_privacy: mirror?.whois_privacy ?? null },
      after: { whois_privacy: nextState },
      metadata: { source: 'internal-route' },
    });

    return NextResponse.json({
      ok: true,
      domainId: domain.id,
      domainName: body.domainName,
      whois_privacy: nextState,
    });
  } catch (e) {
    const isOpenSrsErr = e instanceof OpenSrsError;
    const message = e instanceof Error ? e.message : String(e);

    await recordAudit({
      actorType: 'system',
      actorId: body.actorId ?? domain.user_id,
      action: 'opensrs.whois_privacy.set_failed',
      resourceType: 'domain',
      resourceId: domain.id,
      before: { whois_privacy: mirror?.whois_privacy ?? null },
      after: null,
      metadata: {
        error: message,
        response_code: isOpenSrsErr ? e.responseCode : undefined,
      },
    });

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
