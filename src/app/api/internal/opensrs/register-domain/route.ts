/**
 * POST /api/internal/opensrs/register-domain
 *
 * Internal route called server-to-server (Stripe webhook + admin routes
 * will switch to this in Phase 2C). Mirrors the work currently done by
 * supabase/functions/register-domain/index.ts (action="register"):
 *  - Inserts a `domains` row if one doesn't exist
 *  - Calls OpenSRS SW_REGISTER via the new direct integration client
 *  - Updates the customer-facing `domains` row (status, expiry_date)
 *  - Inserts a row into the `opensrs_domains` mirror table
 *  - Records the state change to `audit_log`
 *
 * Not yet wired into any caller — coexists with the edge function
 * until cutover in Phase 2C.
 *
 * Auth: X-Internal-Token header must match INTERNAL_API_TOKEN env var.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyInternalToken } from '@/lib/internal-auth';
import {
  createOpenSrsClient,
  OpenSrsError,
  type OpenSrsContact,
  type OpenSrsContacts,
} from '@/lib/integrations/opensrs';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RegisterDomainBody {
  userId: string;
  siteId?: string | null;
  domainName: string;
  years?: number;
  /**
   * Optional. If omitted, the route looks the contact info up from
   * the `users` table for `userId` (mirroring the edge function's
   * behaviour so existing callers don't need to assemble a contact
   * before calling).
   */
  contacts?: OpenSrsContacts;
}

/**
 * Build an OpenSrsContact from a row in the `users` table. Mirrors the
 * `getContact()` helper inside supabase/functions/register-domain so
 * Stripe-webhook → edge-function callers can be flipped to this route
 * without restructuring their payload.
 */
function buildContactFromProfile(profile: any, fallbackEmail: string): OpenSrsContact {
  const parts = (profile?.full_name ?? 'Domain Owner').split(' ');
  const meta = (profile?.metadata as any) ?? {};
  return {
    first_name: parts[0] ?? 'Domain',
    last_name: parts.slice(1).join(' ') || 'Owner',
    org_name: profile?.company_name ?? 'N/A',
    email: profile?.email ?? fallbackEmail ?? 'domains@envosta.com',
    phone: profile?.phone ?? '+1.0000000000',
    address1: meta.address ?? 'N/A',
    city: meta.city ?? 'Calgary',
    state: meta.state ?? 'AB',
    postal_code: meta.postal_code ?? 'T2P0A1',
    country: meta.country ?? 'CA',
  };
}

export async function POST(req: Request) {
  if (!verifyInternalToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RegisterDomainBody;
  try {
    body = (await req.json()) as RegisterDomainBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.userId || !body.domainName) {
    return NextResponse.json(
      { error: 'userId and domainName are required' },
      { status: 400 },
    );
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  // Resolve contacts: prefer explicit payload, otherwise look up the
  // user's profile. This keeps backwards-compat with the edge function
  // shape used by the Stripe webhook and admin callers.
  let contacts: OpenSrsContacts;
  if (body.contacts?.owner) {
    contacts = body.contacts;
  } else {
    const { data: profile } = await sb
      .from('users')
      .select('id, full_name, email, phone, company_name, metadata')
      .eq('id', body.userId)
      .maybeSingle();
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    contacts = { owner: buildContactFromProfile(profile, profile.email ?? '') };
  }

  const years = body.years ?? 1;
  const tld = body.domainName.split('.').slice(-1)[0] ?? '';

  // Find or create the customer-facing domains row.
  const { data: existing } = await sb
    .from('domains')
    .select('id, status, expiry_date, metadata')
    .eq('user_id', body.userId)
    .eq('domain_name', body.domainName)
    .maybeSingle();

  let domainRowId = existing?.id as string | undefined;
  const before = existing
    ? { status: existing.status, expiry_date: existing.expiry_date }
    : null;

  if (!domainRowId) {
    const { data: inserted, error: insErr } = await sb
      .from('domains')
      .insert({
        user_id: body.userId,
        site_id: body.siteId ?? null,
        domain_name: body.domainName,
        tld,
        status: 'pending',
        registrar: 'opensrs',
      })
      .select('id')
      .single();
    if (insErr || !inserted) {
      return NextResponse.json(
        { error: `Failed to insert domains row: ${insErr?.message ?? 'unknown'}` },
        { status: 500 },
      );
    }
    domainRowId = inserted.id;
  }

  const client = createOpenSrsClient();

  try {
    const result = await client.registerDomain({
      domain: body.domainName,
      years,
      contacts,
    });

    const nowIso = new Date().toISOString();
    const expiryIso = new Date(Date.now() + years * 365.25 * 86_400_000).toISOString();

    await sb
      .from('domains')
      .update({
        status: 'registered',
        expiry_date: expiryIso,
        metadata: {
          ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
          registration_date: nowIso,
          opensrs_order_id: result.order_id,
          opensrs_status: result.status,
        },
      })
      .eq('id', domainRowId);

    await sb.from('opensrs_domains').upsert(
      {
        upstream_id: body.domainName,
        upstream_status: result.status,
        upstream_payload: { registerDomain: result },
        domain_id: domainRowId,
        expires_at: expiryIso,
        auto_renew: true,
        last_synced_at: nowIso,
      },
      { onConflict: 'upstream_id' },
    );

    await recordAudit({
      actorType: 'system',
      actorId: body.userId,
      action: 'opensrs.domain.registered',
      resourceType: 'domain',
      resourceId: domainRowId,
      before,
      after: { status: 'registered', expiry_date: expiryIso },
      metadata: { source: 'internal-route', order_id: result.order_id },
    });

    return NextResponse.json({
      ok: true,
      domainId: domainRowId,
      domainName: body.domainName,
      orderId: result.order_id,
      status: 'registered',
      expiresAt: expiryIso,
    });
  } catch (e) {
    const isOpenSrsErr = e instanceof OpenSrsError;
    const status = isOpenSrsErr ? 502 : 502;
    const message = e instanceof Error ? e.message : String(e);

    await sb
      .from('domains')
      .update({
        status: 'failed',
        metadata: {
          ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
          error: {
            message,
            response_code: isOpenSrsErr ? e.responseCode : undefined,
            body: isOpenSrsErr ? e.body : null,
          },
        },
      })
      .eq('id', domainRowId);

    await recordAudit({
      actorType: 'system',
      actorId: body.userId,
      action: 'opensrs.domain.register_failed',
      resourceType: 'domain',
      resourceId: domainRowId,
      before,
      after: { status: 'failed' },
      metadata: {
        error: message,
        response_code: isOpenSrsErr ? e.responseCode : undefined,
      },
    });

    return NextResponse.json({ error: message }, { status });
  }
}
