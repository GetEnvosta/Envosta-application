import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Forwarder for site-management actions originating from authenticated
 * users (dashboard UIs). Two backend paths:
 *
 *  - INTERNAL VERCEL ROUTE (Phase 2C): for actions the new
 *    /api/internal/wpcloud/site-info route supports, we forward there
 *    so the wp.cloud call originates from a Vercel static IP that
 *    wp.cloud has whitelisted.
 *
 *  - SUPABASE EDGE FUNCTION (legacy): everything else falls through to
 *    the existing supabase/functions/site-info endpoint which still
 *    routes through the Cloud Run proxy. These will move over once
 *    each action has an internal-route handler.
 */

// Actions that have a Vercel internal-route handler today.
const INTERNAL_ACTIONS = new Set([
  'get',
  'get-site',
  'list-backups',
  'get-ssl-status',
  'list-all-sites',
  'update-meta',
  'update-site-meta',
  'software-bootstrap',
  'hard-delete-site',
  'delete-site',
]);

export async function POST(req: Request) {
  // Auth — all site actions require a logged-in user
  const jar = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const action = body?.action ?? '';

  // ── Phase 2C: route through Vercel internal endpoint ──
  if (INTERNAL_ACTIONS.has(action)) {
    // The internal route enforces server-only access via the
    // X-Internal-Token header; user-ownership is enforced here.
    if (body.siteId) {
      // Verify the user owns the site (or is admin/staff) before forwarding.
      const sbAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        { auth: { persistSession: false } },
      );
      const { data: site } = await sbAdmin.from('sites').select('user_id').eq('id', body.siteId).maybeSingle();
      if (site && site.user_id && site.user_id !== user.id) {
        const { data: profile } = await sbAdmin.from('users').select('role').eq('id', user.id).maybeSingle();
        if (!['admin', 'staff'].includes(profile?.role ?? '')) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
      : new URL(req.url).origin;

    const res = await fetch(`${origin}/api/internal/wpcloud/site-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_API_TOKEN ?? '',
      },
      body: JSON.stringify({ ...body, actorId: user.id }),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  }

  // ── Burn-in fallback: still goes through the Cloud Run proxy ──
  // Extract a fresh access token from the auth cookie directly.
  // getSession() can return stale tokens since SSR client can't refresh cookies,
  // but the middleware refreshes the cookie on each request so the raw cookie value is fresh.
  let accessToken = '';
  const allCookies = jar.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes('auth-token')) {
      try {
        const decoded = cookie.value.startsWith('base64-')
          ? Buffer.from(cookie.value.replace('base64-', ''), 'base64').toString()
          : cookie.value;
        const parsed = JSON.parse(decoded);
        if (parsed.access_token) {
          accessToken = parsed.access_token;
          break;
        }
      } catch {
        // Cookie might be chunked — try getSession as fallback
      }
    }
  }

  if (!accessToken) {
    const { data: { session } } = await supabase.auth.getSession();
    accessToken = session?.access_token ?? '';
  }

  if (!accessToken) {
    return NextResponse.json({ error: 'Could not retrieve session token' }, { status: 401 });
  }

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
