import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Caller must be a partner
  const { data: caller } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (caller?.role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { clientId } = await req.json();
  if (!clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 });

  // Verify the target client belongs to this partner
  const { data: target } = await supabase
    .from('users')
    .select('id, partner_id')
    .eq('id', clientId)
    .single();

  if (!target || target.partner_id !== user.id) {
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
