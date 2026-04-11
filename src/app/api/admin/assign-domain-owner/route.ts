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

  const { domainId, userId } = await req.json();
  if (!domainId) return NextResponse.json({ error: 'domainId required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  await sb.from('domains').update({ user_id: userId ?? null, updated_at: new Date().toISOString() }).eq('id', domainId);

  await sb.from('logs').insert({
    user_id: user.id,
    action: 'admin.domain_owner_changed',
    details: userId ? `Domain assigned to user ${userId}` : 'Domain owner removed',
    level: 'info',
    metadata: { domain_id: domainId, new_owner: userId, changed_by: user.id },
  });

  return NextResponse.json({ success: true });
}
