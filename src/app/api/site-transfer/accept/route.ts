/**
 * POST /api/site-transfer/accept — Recipient accepts a site handoff.
 *
 * The recipient must be signed in (their email matching the invite) and have
 * a payment method on file. On accept we run the shared transfer engine:
 * create a fresh per-site subscription under the recipient, recreate add-ons,
 * flip ownership + billing, and cancel the previous owner's subscription
 * (prorated). The wp.cloud site is untouched — no re-provisioning.
 *
 * Body: { token }
 * Auth: logged-in recipient.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { executeSiteTransfer } from '@/lib/site-transfer';
import { recordAudit } from '@/lib/audit';
import { sendEmail, siteHandoffAcceptedEmail } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`handoff-accept:${ip}`, 10, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to accept the handoff', needAuth: true }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token ?? '');
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

  // Find the site carrying this pending transfer token.
  const { data: site } = await sb
    .from('sites')
    .select('id, user_id, label, status, metadata')
    .eq('metadata->>transfer_token', token)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'This handoff link is invalid or already used.' }, { status: 404 });

  const transfer = (site.metadata as any)?.transfer ?? {};
  if (transfer.status !== 'pending') return NextResponse.json({ error: 'This handoff is no longer pending.' }, { status: 410 });
  if (transfer.expires_at && new Date(transfer.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This handoff link has expired.' }, { status: 410 });
  }
  if (site.user_id === user.id) return NextResponse.json({ error: 'You already own this site.' }, { status: 400 });

  const { data: me } = await sb.from('users').select('email, full_name, stripe_customer_id').eq('id', user.id).maybeSingle();
  if (transfer.to_email && me?.email && me.email.toLowerCase() !== String(transfer.to_email).toLowerCase()) {
    return NextResponse.json({ error: `This handoff was sent to ${transfer.to_email}. Sign in with that email to accept.` }, { status: 403 });
  }
  if (!me?.stripe_customer_id) {
    return NextResponse.json({ error: 'Add a payment method before accepting so billing can start.', needPaymentMethod: true }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
  const oldOwnerId = site.user_id as string | null;
  const result = await executeSiteTransfer(sb, stripe, site.id, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  // Clear the pending transfer from the site metadata.
  const meta = (site.metadata as Record<string, unknown> | null) ?? {};
  const { transfer_token, transfer: _t, ...keptMeta } = meta as any;
  await sb.from('sites').update({
    metadata: { ...keptMeta, transfer_completed_at: new Date().toISOString() },
  }).eq('id', site.id);

  await recordAudit({
    actorId: user.id,
    actorType: 'user',
    action: 'site.handoff.accepted',
    resourceType: 'site',
    resourceId: site.id,
    before: { user_id: oldOwnerId },
    after: { user_id: user.id },
    metadata: {
      level: result.oldCancelError ? 'warn' : 'info',
      new_subscription_id: result.newSubscriptionId,
      old_cancel_error: result.oldCancelError,
    },
  });

  // Notify the previous owner.
  try {
    if (oldOwnerId) {
      const { data: prev } = await sb.from('users').select('email, full_name').eq('id', oldOwnerId).maybeSingle();
      if (prev?.email) {
        const email = siteHandoffAcceptedEmail(prev.full_name ?? 'there', result.siteLabel ?? 'your site', me?.full_name ?? me?.email ?? 'the new owner');
        await sendEmail({ to: prev.email, ...email });
      }
    }
  } catch (e) {
    console.error('[site-transfer/accept] notify email failed:', e);
  }

  return NextResponse.json({ ok: true, siteId: site.id, warning: result.warning });
}
