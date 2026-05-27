/**
 * Domain registration workflow (Vercel Workflows SDK).
 *
 * Looks up the customer's profile, fires SW_REGISTER against OpenSRS,
 * upserts the opensrs_domains mirror, and flips the customer-facing
 * domains row to 'registered'.
 *
 * Steps:
 *   1. resolveProfileAndDomainRow — load user profile (for contact info)
 *      and find-or-insert the domains row.
 *   2. callOpenSrsRegister        — single OpenSRS RPC.
 *   3. persistRegistrationResult  — update domains + upsert opensrs_domains.
 *   4. recordRegistered           — audit completion.
 *
 * Triggered by /api/internal/opensrs/register-domain callers (stripe
 * webhook for bundled signup domains, admin /api/admin/register-domain).
 *
 * Idempotency: keyed on (userId, domainName). If a domains row exists
 * with status='registered' the workflow short-circuits (returns
 * skipped). OpenSRS itself rejects SW_REGISTER for an already-owned
 * domain — that error becomes FatalError so we don't loop.
 */
import { FatalError } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import {
  createOpenSrsClient,
  OpenSrsError,
  type OpenSrsContact,
  type OpenSrsContacts,
} from '@/lib/integrations/opensrs';
import { recordAudit } from '@/lib/audit';

export interface RegisterDomainInput {
  userId: string;
  domainName: string;
  registrationYears?: number;
  agreementIp?: string;
  siteId?: string | null;
}

interface DomainContext {
  domainRowId: string;
  alreadyRegistered: boolean;
  contacts: OpenSrsContacts;
  years: number;
}

function sbClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}

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

// ───────────────────────────────────────────────────────────────────
// STEP 1 — resolve profile + find/insert domains row.
// ───────────────────────────────────────────────────────────────────
async function resolveProfileAndDomainRow(input: RegisterDomainInput): Promise<DomainContext> {
  'use step';

  const sb = sbClient();
  const { data: profile, error: profErr } = await sb
    .from('users')
    .select('id, full_name, email, phone, company_name, metadata')
    .eq('id', input.userId)
    .maybeSingle();

  if (profErr) {
    throw new Error(`users lookup failed: ${profErr.message}`);
  }
  if (!profile) {
    throw new FatalError(`user ${input.userId} not found`);
  }

  const tld = input.domainName.split('.').slice(-1)[0] ?? '';
  const { data: existing } = await sb
    .from('domains')
    .select('id, status')
    .eq('user_id', input.userId)
    .eq('domain_name', input.domainName)
    .maybeSingle();

  let domainRowId = existing?.id as string | undefined;
  let alreadyRegistered = false;
  if (existing) {
    if (existing.status === 'registered') {
      alreadyRegistered = true;
    }
  } else {
    const { data: inserted, error: insErr } = await sb
      .from('domains')
      .insert({
        user_id: input.userId,
        site_id: input.siteId ?? null,
        domain_name: input.domainName,
        tld,
        status: 'pending',
        registrar: 'opensrs',
      })
      .select('id')
      .single();
    if (insErr || !inserted) {
      throw new Error(`failed to insert domains row: ${insErr?.message ?? 'unknown'}`);
    }
    domainRowId = inserted.id;
  }

  if (!domainRowId) {
    throw new FatalError(`could not resolve domains row for ${input.domainName}`);
  }

  return {
    domainRowId,
    alreadyRegistered,
    contacts: { owner: buildContactFromProfile(profile, profile.email ?? '') },
    years: input.registrationYears ?? 1,
  };
}

// ───────────────────────────────────────────────────────────────────
// STEP 2 — call OpenSRS SW_REGISTER.
// ───────────────────────────────────────────────────────────────────
async function callOpenSrsRegister(
  input: RegisterDomainInput,
  ctx: DomainContext,
): Promise<{ orderId: string; status: string }> {
  'use step';

  if (ctx.alreadyRegistered) {
    return { orderId: '', status: 'already_registered' };
  }

  try {
    const client = createOpenSrsClient();
    const result = await client.registerDomain({
      domain: input.domainName,
      years: ctx.years,
      contacts: ctx.contacts,
    });
    return { orderId: result.order_id, status: result.status };
  } catch (e) {
    if (e instanceof OpenSrsError) {
      // OpenSRS 4xx-equivalents (bad domain, taken, invalid contact) →
      // FatalError so we don't loop. 5xx-equivalents → retry.
      const code = parseInt(e.responseCode ?? '0', 10) || 0;
      if (code >= 400 && code < 500) {
        // Stamp the domains row with the failure so the customer-facing
        // status reflects reality, then escalate.
        const sb = sbClient();
        await sb
          .from('domains')
          .update({
            status: 'failed',
            metadata: {
              error: { message: e.message, response_code: e.responseCode },
            },
          })
          .eq('id', ctx.domainRowId);
        throw new FatalError(
          `OpenSRS rejected registration for ${input.domainName} (code=${code}): ${e.message}`,
        );
      }
    }
    throw e instanceof Error ? e : new Error(String(e));
  }
}

// ───────────────────────────────────────────────────────────────────
// STEP 3 — persist domains + opensrs_domains mirror.
// ───────────────────────────────────────────────────────────────────
async function persistRegistrationResult(
  input: RegisterDomainInput,
  ctx: DomainContext,
  result: { orderId: string; status: string },
) {
  'use step';

  if (result.status === 'already_registered') {
    return;
  }

  const sb = sbClient();
  const nowIso = new Date().toISOString();
  const expiryIso = new Date(Date.now() + ctx.years * 365.25 * 86_400_000).toISOString();

  await sb
    .from('domains')
    .update({
      status: 'registered',
      expiry_date: expiryIso,
      metadata: {
        registration_date: nowIso,
        opensrs_order_id: result.orderId,
        opensrs_status: result.status,
        ...(input.agreementIp ? { agreement_ip: input.agreementIp } : {}),
      },
    })
    .eq('id', ctx.domainRowId);

  await sb.from('opensrs_domains').upsert(
    {
      upstream_id: input.domainName,
      domain_id: ctx.domainRowId,
      upstream_status: result.status,
      auto_renew: true,
      let_expire: false,
      whois_privacy: 'enabled',
      expires_at: expiryIso,
      upstream_payload: { registerDomain: result },
      last_synced_at: nowIso,
    },
    { onConflict: 'upstream_id' },
  );
}

// ───────────────────────────────────────────────────────────────────
// STEP 4 — audit completion.
// ───────────────────────────────────────────────────────────────────
async function recordRegistered(
  input: RegisterDomainInput,
  ctx: DomainContext,
  result: { orderId: string; status: string },
) {
  'use step';

  await recordAudit({
    actorType: 'workflow',
    actorId: input.userId,
    action: 'workflow.register_domain.completed',
    resourceType: 'domain',
    resourceId: ctx.domainRowId,
    metadata: {
      domain_name: input.domainName,
      years: ctx.years,
      order_id: result.orderId,
      opensrs_status: result.status,
      already_registered: ctx.alreadyRegistered,
      site_id: input.siteId ?? null,
    },
  });
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator.
// ───────────────────────────────────────────────────────────────────
export async function registerDomain(input: RegisterDomainInput) {
  'use workflow';

  const ctx = await resolveProfileAndDomainRow(input);
  const result = await callOpenSrsRegister(input, ctx);
  await persistRegistrationResult(input, ctx, result);
  await recordRegistered(input, ctx, result);

  return {
    domainId: ctx.domainRowId,
    domainName: input.domainName,
    orderId: result.orderId,
    status: ctx.alreadyRegistered ? ('skipped' as const) : ('registered' as const),
  };
}
