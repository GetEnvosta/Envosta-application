/**
 * POST /api/admin/transfer-site — Admin: move a site (with its billing) from
 * one account to another.
 *
 * Body: { siteId, newUserId }
 *
 * Thin wrapper around lib/site-transfer.ts#executeSiteTransfer (the shared
 * per-site transfer engine, also used by the self-serve handoff flow). This
 * route just enforces admin auth and records the admin audit entry.
 *
 * The wp.cloud site is untouched — only ownership + billing move. Verify on
 * deploy with a low-stakes site first (no live Stripe in local dev).
 */
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { isAdminRole } from '@/lib/roles';
import { executeSiteTransfer } from '@/lib/site-transfer';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  // ── Admin auth ──
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: actor } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isAdminRole(actor?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const siteId = String(body?.siteId ?? '');
  const newUserId = String(body?.newUserId ?? '');
  if (!siteId || !newUserId) {
    return NextResponse.json({ error: 'siteId and newUserId are required' }, { status: 400 });
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });

  const result = await executeSiteTransfer(sb, stripe, siteId, newUserId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { data: newOwner } = await sb.from('users').select('email').eq('id', newUserId).maybeSingle();

  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: 'admin.site_transferred',
    resourceType: 'site',
    resourceId: siteId,
    before: { user_id: result.oldUserId, stripe_subscription_id: result.oldSubscriptionId },
    after: { user_id: newUserId, stripe_subscription_id: result.newSubscriptionId },
    metadata: {
      level: result.oldCancelError ? 'warn' : 'info',
      details: `Site "${result.siteLabel}" transferred to ${newOwner?.email ?? newUserId} (admin). New per-site subscription; old cancelled (prorated).`,
      old_owner: result.oldUserId,
      new_owner: newUserId,
      old_subscription_cancelled: result.oldSubscriptionCancelled,
      old_cancel_error: result.oldCancelError,
    },
  });

  return NextResponse.json({
    ok: true,
    siteId,
    newOwner: { id: newUserId, email: newOwner?.email ?? null },
    newSubscriptionId: result.newSubscriptionId,
    oldSubscriptionCancelled: result.oldSubscriptionCancelled,
    oldCancelError: result.oldCancelError,
    warning: result.warning,
  });
}
