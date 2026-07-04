/**
 * POST /api/admin/set-reseller
 *
 * Toggle a customer's reseller flag (users.metadata.reseller). A flagged
 * reseller gets a flat platform discount (a forever Stripe coupon) applied
 * to EVERY per-site subscription they own — see src/lib/reseller.ts. This
 * replaces the old standalone "Reseller" hosting plan.
 *
 * Body: { userId: string, reseller: boolean }
 * Auth: admin only.
 *
 * Note: this changes the flag for FUTURE subscriptions. Existing live
 * subscriptions are not retroactively re-couponed here — apply the coupon
 * to those in Stripe (or on their next renewal) if needed.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { isAdminRole } from '@/lib/roles';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user: caller } } = await supabaseAuth.auth.getUser();
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: callerProfile } = await sb.from('users').select('role').eq('id', caller.id).maybeSingle();
  if (!isAdminRole(callerProfile?.role)) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const userId = typeof body.userId === 'string' ? body.userId : '';
  const reseller = body.reseller === true;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const { data: target } = await sb.from('users').select('id, email, metadata').eq('id', userId).maybeSingle();
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const newMeta = { ...((target.metadata as Record<string, unknown> | null) ?? {}) };
  if (reseller) newMeta.reseller = true;
  else delete (newMeta as any).reseller; // keep metadata tidy when turning off
  await sb.from('users').update({ metadata: newMeta }).eq('id', userId);

  await recordAudit({
    actorId: caller.id,
    actorType: 'admin',
    action: reseller ? 'admin.reseller.enabled' : 'admin.reseller.disabled',
    resourceType: 'user',
    resourceId: userId,
    metadata: { reseller, target_email: target.email },
  });

  return NextResponse.json({ ok: true, reseller });
}
