import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100);
  const offset = Number(searchParams.get('offset') || 0);

  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const supabase = await createServerClient();

  // Verify ownership
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', userId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const { data, count } = await supabase
    .from('logs')
    .select('*', { count: 'exact' })
    .eq('site_id', siteId)
    .eq('action', 'receptionist.call')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const calls = (data ?? []).map((log: any) => {
    const meta = (log.metadata as any) ?? {};
    return {
      id: log.id,
      caller: meta.caller_number ?? 'Unknown',
      duration_seconds: meta.duration_seconds ?? 0,
      duration_minutes: meta.duration_minutes ?? 0,
      credits_charged: meta.credits_charged ?? 0,
      transcript: meta.transcript ?? [],
      tokens_used: meta.total_tokens ?? 0,
      created_at: log.created_at,
    };
  });

  return NextResponse.json({ calls, total: count ?? 0 });
}
