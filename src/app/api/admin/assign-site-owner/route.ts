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

  const { siteId, userId } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  await sb.from('sites').update({ user_id: userId ?? null, updated_at: new Date().toISOString() }).eq('id', siteId);

  await sb.from('logs').insert({
    user_id: user.id,
    site_id: siteId,
    action: 'admin.site_owner_changed',
    details: userId ? `Site assigned to user ${userId}` : 'Site owner removed (orphaned)',
    level: 'info',
    metadata: { new_owner: userId, changed_by: user.id },
  });

  return NextResponse.json({ success: true });
}
