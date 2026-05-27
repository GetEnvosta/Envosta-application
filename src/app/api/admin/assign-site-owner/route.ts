import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { siteId, userId } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

  await sb.from('sites').update({ user_id: userId ?? null, updated_at: new Date().toISOString() }).eq('id', siteId);

  await recordAudit({
    actorId: user.id,
    actorType: 'admin',
    action: 'admin.site_owner_changed',
    resourceType: 'site',
    resourceId: siteId,
    after: { user_id: userId ?? null },
    metadata: {
      level: 'info',
      details: userId ? `Site assigned to user ${userId}` : 'Site owner removed (orphaned)',
      new_owner: userId,
      changed_by: user.id,
    },
  });

  return NextResponse.json({ success: true });
}
