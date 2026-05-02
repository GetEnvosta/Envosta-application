import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/partners/manage-client
 *
 * Sets the impersonating_user_id cookie so the partner can navigate
 * the customer's dashboard as if logged in as them. Used by the
 * partner portal "manage client" action.
 *
 * The cookie is httpOnly + sameSite=lax + 4-hour expiry. The dashboard
 * shell + getEffectiveUserId() pick it up and treat the session as the
 * impersonated user.
 *
 * Auth: caller must be a partner AND the target client must belong to
 * them (partner_id match). Prevents partners from impersonating each
 * other's customers.
 *
 * Body: { clientId }
 */
export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createServerClient();
  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (caller?.role !== 'partner') {
    return NextResponse.json({ error: 'Partner access required' }, { status: 403 });
  }

  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  // Confirm the target belongs to THIS partner before granting impersonation.
  const { data: target } = await supabase
    .from('users')
    .select('id, partner_id')
    .eq('id', clientId)
    .single();
  if (!target || target.partner_id !== userId) {
    return NextResponse.json({ error: 'Client not found or not yours' }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set('impersonating_user_id', clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 4, // 4 hours
  });

  return NextResponse.json({ ok: true });
}
