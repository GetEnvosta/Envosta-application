/**
 * Connectivity test endpoint.
 *
 * Verifies the new Vercel-hosted integration clients can reach wp.cloud
 * and OpenSRS from Vercel's static IPs. Read-only operations only — no
 * upstream state is changed. Safe to call repeatedly.
 *
 * Use this BEFORE deleting the Supabase edge functions / decommissioning
 * the Cloud Run proxies to confirm everything works end-to-end.
 *
 * Each check returns:
 *   - ok:    boolean (did the call succeed?)
 *   - latencyMs: round-trip time
 *   - detail: parsed response or error info
 *
 * Authentication: admin-or-staff session OR X-Internal-Token header.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';
import { verifyInternalToken } from '@/lib/internal-auth';
import { createWpCloudClient, WpCloudError } from '@/lib/integrations/wpcloud';
import { createOpenSrsClient, OpenSrsError } from '@/lib/integrations/opensrs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CheckResult {
  ok: boolean;
  latencyMs: number;
  detail: any;
}

async function timed<T>(fn: () => Promise<T>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const detail = await fn();
    return { ok: true, latencyMs: Date.now() - start, detail };
  } catch (err: any) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      detail: {
        name: err?.name ?? 'Error',
        message: err?.message ?? String(err),
        status: err?.status,
        body: err?.body,
        path: err?.path,
      },
    };
  }
}

export async function GET(req: Request) {
  // ─── Authn ───────────────────────────────────────────
  let authed = false;
  if (verifyInternalToken(req)) {
    authed = true;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('users').select('role').eq('id', user.id).maybeSingle();
      if (isStaffRole(profile?.role)) authed = true;
    }
  }
  if (!authed) {
    return NextResponse.json({ error: 'Forbidden — admin/staff or X-Internal-Token required' }, { status: 403 });
  }

  // ─── 1. Vercel outbound IP check ─────────────────────
  const ipCheck = await timed(async () => {
    const res = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    const data = await res.json();
    return data;
  });

  // ─── 2. wp.cloud connectivity — list sites (read-only) ─
  const wpcloudCheck = await timed(async () => {
    const client = createWpCloudClient();
    const result = await client.listSites();
    return {
      siteCount: result.total,
      firstSiteIds: result.sites.slice(0, 3).map(s => ({
        atomic_site_id: s.atomic_site_id,
        domain_name: s.domain_name,
        status: s.status,
      })),
    };
  });

  // ─── 3. OpenSRS connectivity — check availability (read-only, free) ─
  const opensrsCheck = await timed(async () => {
    // Use a clearly-bogus test domain so we don't accidentally hit
    // anything real. OpenSRS's check_availability has no side effects
    // and no cost.
    const testDomain = `envosta-connectivity-test-${Date.now()}.com`;
    const client = createOpenSrsClient();
    const result = await client.checkAvailability(testDomain);
    return {
      testDomain,
      available: result.available,
      price: result.price ?? null,
    };
  });

  // ─── Roll up ─────────────────────────────────────────
  const allOk = ipCheck.ok && wpcloudCheck.ok && opensrsCheck.ok;
  const expectedIps = ['184.72.2.216', '54.241.78.174'];
  const outboundIp = ipCheck.detail?.ip;
  const ipIsVercelStatic = expectedIps.includes(outboundIp);

  return NextResponse.json({
    ok: allOk && ipIsVercelStatic,
    checks: {
      outboundIp: {
        ...ipCheck,
        expected: expectedIps,
        matchesVercelStatic: ipIsVercelStatic,
      },
      wpcloud: wpcloudCheck,
      opensrs: opensrsCheck,
    },
    diagnosis: buildDiagnosis({
      ipCheck,
      wpcloudCheck,
      opensrsCheck,
      ipIsVercelStatic,
    }),
  });
}

function buildDiagnosis(input: {
  ipCheck: CheckResult;
  wpcloudCheck: CheckResult;
  opensrsCheck: CheckResult;
  ipIsVercelStatic: boolean;
}): string[] {
  const notes: string[] = [];
  const { ipCheck, wpcloudCheck, opensrsCheck, ipIsVercelStatic } = input;

  if (!ipCheck.ok) {
    notes.push('Outbound IP check failed — could not reach api.ipify.org. Network egress is broken.');
    return notes;
  }
  if (!ipIsVercelStatic) {
    notes.push(`Outbound IP is ${ipCheck.detail?.ip}, not one of the Vercel static IPs (184.72.2.216, 54.241.78.174). Static IP feature may not be active on this deployment.`);
  }

  if (!wpcloudCheck.ok) {
    if (wpcloudCheck.detail?.status === 401 || wpcloudCheck.detail?.status === 403) {
      notes.push('wp.cloud: 401/403 — either WPCLOUD_API_KEY is wrong, or the calling IP is not whitelisted. Confirm both Vercel static IPs are in wp.cloud allowlist.');
    } else if (wpcloudCheck.detail?.status === 404) {
      notes.push('wp.cloud: 404 — WPCLOUD_BASE_URL or WPCLOUD_CLIENT may be wrong. Default base is https://atomic-api.wordpress.com.');
    } else {
      notes.push(`wp.cloud: ${wpcloudCheck.detail?.name || 'error'} — ${wpcloudCheck.detail?.message}`);
    }
  } else {
    notes.push(`wp.cloud OK — ${wpcloudCheck.detail.siteCount} sites visible.`);
  }

  if (!opensrsCheck.ok) {
    if (opensrsCheck.detail?.message?.includes('signature')) {
      notes.push('OpenSRS: signature failure — OPENSRS_API_KEY or OPENSRS_USERNAME is wrong.');
    } else if (opensrsCheck.detail?.message?.includes('not allowed') || opensrsCheck.detail?.status === 403) {
      notes.push('OpenSRS: 403 / not allowed — calling IP is not whitelisted. Confirm both Vercel static IPs are in the OpenSRS allowlist.');
    } else {
      notes.push(`OpenSRS: ${opensrsCheck.detail?.name || 'error'} — ${opensrsCheck.detail?.message}`);
    }
  } else {
    notes.push(`OpenSRS OK — test domain check returned available=${opensrsCheck.detail.available}.`);
  }

  if (input.ipIsVercelStatic && wpcloudCheck.ok && opensrsCheck.ok) {
    notes.push('All checks passed. Safe to decommission the Supabase edge functions.');
  }

  return notes;
}
