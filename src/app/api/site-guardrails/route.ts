import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

  const supabase = await createServerClient();

  const { data: site } = await supabase
    .from('sites')
    .select('max_php_workers, max_ssd_gb, bursting_enabled, monthly_ai_token_limit')
    .eq('id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  return NextResponse.json({
    max_php_workers: site.max_php_workers ?? null,
    max_ssd_gb: site.max_ssd_gb ?? null,
    bursting_enabled: site.bursting_enabled ?? false,
    monthly_ai_token_limit: site.monthly_ai_token_limit ?? null,
  });
}

export async function PUT(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { siteId, max_php_workers, max_ssd_gb, bursting_enabled, monthly_ai_token_limit } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

  const supabase = await createServerClient();

  // Verify ownership
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const { data } = await supabase
    .from('sites')
    .update({
      max_php_workers: max_php_workers ?? null,
      max_ssd_gb: max_ssd_gb ?? null,
      bursting_enabled: bursting_enabled ?? false,
      monthly_ai_token_limit: monthly_ai_token_limit ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId)
    .select('max_php_workers, max_ssd_gb, bursting_enabled, monthly_ai_token_limit')
    .single();

  return NextResponse.json(data);
}
