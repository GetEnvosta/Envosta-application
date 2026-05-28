import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { isStaffRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Forwarder for site-management actions originating from authenticated
 * users (dashboard UIs). All supported actions route through the Vercel
 * internal /api/internal/wpcloud/site-info handler so wp.cloud calls
 * originate from a Vercel static IP (whitelisted at wp.cloud).
 *
 * Actions not yet supported return 501 — extend
 * /api/internal/wpcloud/site-info to add new ones.
 */

// Actions that have a Vercel internal-route handler today.
const INTERNAL_ACTIONS = new Set([
  'get',
  'get-site',
  'list-backups',
  'get-ssl-status',
  'list-all-sites',
  'health-check',
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

  if (!INTERNAL_ACTIONS.has(action)) {
    return NextResponse.json(
      {
        error: `Action "${action}" is not supported by /api/internal/wpcloud/site-info.`,
      },
      { status: 501 },
    );
  }

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
      if (!isStaffRole(profile?.role)) {
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
