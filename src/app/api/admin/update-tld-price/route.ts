import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id, price_cad, is_active } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const updates: any = { updated_at: new Date().toISOString() };
  if (price_cad !== undefined) updates.price_cad = price_cad;
  if (is_active !== undefined) updates.is_active = is_active;

  await sb.from('products').update(updates).eq('id', id);

  return NextResponse.json({ success: true });
}
