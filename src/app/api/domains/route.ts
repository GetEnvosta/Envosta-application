import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ── PUT: Domain updates (disconnect, etc.) ──
export async function PUT(req: Request) {
  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { domainId, action } = await req.json();
  if (!domainId) return NextResponse.json({ error: 'domainId required' }, { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  if (action === 'disconnect') {
    const { error } = await sb
      .from('domains')
      .update({ site_id: null })
      .eq('id', domainId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

/**
 * Phase 2D — the legacy `register-domain` Supabase edge function has
 * been deleted along with the OpenSRS Cloud Run proxy. The fallback
 * path now returns 501 for any action that hasn't been ported to a
 * Vercel internal route yet:
 *
 *   update-nameservers, set-dns-mode, set-auto-renew, set-whois-privacy,
 *   get-lock-status, set-lock, get-epp-code, transfer, list-all-domains,
 *   create-nameserver
 *
 * Each of these needs its own /api/internal/opensrs/* handler.
 */
function notImplemented(action: string) {
  return NextResponse.json(
    {
      error: `Action "${action}" has not been ported to a Vercel internal route. The Supabase register-domain edge function was decommissioned in Phase 2D.`,
    },
    { status: 501 },
  );
}

/**
 * Resolve the origin for internal API calls. Prefers
 * NEXT_PUBLIC_APP_URL (set on Vercel) so the call stays within the
 * same deployment; falls back to the request's origin for local dev.
 */
function internalOrigin(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && env.length > 0) return env.replace(/\/$/, '');
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  // Check action is public (no auth needed). Calls OpenSRS directly
  // via the internal route added in Phase 2D.
  if (action === 'check') {
    const origin = internalOrigin(req);
    const res = await fetch(`${origin}/api/domain-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: body.domainName }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  // All other actions require auth
  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const origin = internalOrigin(req);
  const internalHeaders = {
    'Content-Type': 'application/json',
    'X-Internal-Token': process.env.INTERNAL_API_TOKEN!,
  };

  // ── Phase 2C: routes cut over to the Vercel internal API ──
  // These hit OpenSRS directly from Vercel static IPs (whitelisted).

  if (action === 'register') {
    // If the caller is registering on behalf of another user, require
    // admin role (mirrors the edge function's admin-override check).
    let targetUserId = user.id;
    if (body.userId && body.userId !== user.id) {
      const sbAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        { auth: { persistSession: false } },
      );
      const { data: profile } = await sbAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      }
      targetUserId = body.userId;
    }

    const res = await fetch(`${origin}/api/internal/opensrs/register-domain`, {
      method: 'POST',
      headers: internalHeaders,
      body: JSON.stringify({
        userId: targetUserId,
        siteId: body.serviceId ?? body.siteId ?? null,
        domainName: body.domainName,
        years: body.years ?? body.period ?? 1,
      }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  if (action === 'setup-dns') {
    if (!body.domainName || !body.siteIp) {
      return NextResponse.json({ error: 'domainName and siteIp are required' }, { status: 400 });
    }
    const res = await fetch(`${origin}/api/internal/opensrs/set-dns`, {
      method: 'POST',
      headers: internalHeaders,
      body: JSON.stringify({
        domainName: body.domainName,
        siteIp: body.siteIp,
        actorId: user.id,
      }),
    });
    const data = await res.json();
    // Match edge-function response shape so the dns-manager UI keeps working:
    //   { records: <count>, siteIp, success: true }
    if (res.ok) {
      return NextResponse.json({
        domainName: data.domainName ?? body.domainName,
        siteIp: body.siteIp,
        records: data.recordCount ?? 0,
        success: true,
      });
    }
    return NextResponse.json(data, { status: res.status });
  }

  if (action === 'update-dns') {
    if (!body.domainName || !Array.isArray(body.records)) {
      return NextResponse.json(
        { error: 'domainName and records[] are required' },
        { status: 400 },
      );
    }
    const res = await fetch(`${origin}/api/internal/opensrs/set-dns`, {
      method: 'POST',
      headers: internalHeaders,
      body: JSON.stringify({
        domainName: body.domainName,
        records: body.records,
        actorId: user.id,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      return NextResponse.json({
        domainName: data.domainName ?? body.domainName,
        records: data.recordCount ?? 0,
        success: true,
      });
    }
    return NextResponse.json(data, { status: res.status });
  }

  // ── Phase 2D: no fallback. Actions without a Vercel internal route
  //   return 501 until they're ported.
  return notImplemented(action ?? 'unknown');
}
