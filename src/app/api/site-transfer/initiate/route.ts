/**
 * POST /api/site-transfer/initiate — Owner-initiated self-serve site handoff.
 *
 * The current owner invites a recipient by email. We stamp a one-time token
 * on the site (metadata.transfer_token + metadata.transfer) and email the
 * recipient an accept link. Nothing about billing changes yet — the owner
 * keeps paying until the recipient accepts (no service gap). The actual
 * ownership + billing move happens in /api/site-transfer/accept.
 *
 * Body: { siteId, recipientEmail, expiresInDays? }
 * Auth: logged-in owner of the site.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';
import { sendEmail, siteHandoffInviteEmail } from '@/lib/email';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`handoff-init:${ip}`, 10, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const jar = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => jar.getAll(), setAll() {} } },
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const siteId = String(body?.siteId ?? '');
  const recipientEmail = String(body?.recipientEmail ?? '').trim().toLowerCase();
  const expiresInDays = Math.min(Math.max(parseInt(String(body?.expiresInDays), 10) || 14, 1), 30);
  if (!siteId || !recipientEmail) {
    return NextResponse.json({ error: 'siteId and recipientEmail are required' }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipientEmail)) {
    return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 });
  }

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

  // Verify the requester owns the site.
  const { data: site } = await sb
    .from('sites')
    .select('id, user_id, label, status, metadata')
    .eq('id', siteId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });
  if (site.user_id !== user.id) return NextResponse.json({ error: 'You do not own this site' }, { status: 403 });
  if (!['active', 'provisioning'].includes(site.status ?? '')) {
    return NextResponse.json({ error: 'Only an active site can be handed off' }, { status: 400 });
  }

  const { data: me } = await sb.from('users').select('email, full_name').eq('id', user.id).maybeSingle();
  if (me?.email && me.email.toLowerCase() === recipientEmail) {
    return NextResponse.json({ error: 'That is your own email' }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
  const meta = (site.metadata as Record<string, unknown> | null) ?? {};
  await sb.from('sites').update({
    metadata: {
      ...meta,
      transfer_token: token,
      transfer: {
        to_email: recipientEmail,
        initiated_by: user.id,
        initiated_at: new Date().toISOString(),
        expires_at: expiresAt,
        status: 'pending',
      },
    },
  }).eq('id', siteId);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://my.envosta.com';
  const acceptUrl = `${appUrl}/transfer/accept?token=${token}`;

  try {
    const email = siteHandoffInviteEmail(me?.full_name ?? 'An Envosta user', site.label ?? 'a website', acceptUrl, expiresInDays);
    await sendEmail({ to: recipientEmail, ...email });
  } catch (e) {
    console.error('[site-transfer/initiate] invite email failed:', e);
  }

  await recordAudit({
    actorId: user.id,
    actorType: 'user',
    action: 'site.handoff.initiated',
    resourceType: 'site',
    resourceId: siteId,
    metadata: { recipient_email: recipientEmail, expires_at: expiresAt },
  });

  return NextResponse.json({ ok: true, acceptUrl, expiresAt });
}
