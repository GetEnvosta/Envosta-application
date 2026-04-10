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

  // Verify user owns this site
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const { data: guardrails } = await supabase
    .from('site_guardrails')
    .select('*')
    .eq('site_id', siteId)
    .maybeSingle();

  return NextResponse.json(guardrails ?? {
    max_php_workers: null,
    max_ssd_gb: null,
    bursting_enabled: false,
    monthly_ai_token_limit: null,
  });
}

export async function PUT(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { siteId, max_php_workers, max_ssd_gb, bursting_enabled, monthly_ai_token_limit } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId is required' }, { status: 400 });

  const supabase = await createServerClient();

  // Verify user owns this site
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  const { data } = await supabase
    .from('site_guardrails')
    .upsert(
      {
        site_id: siteId,
        max_php_workers: max_php_workers ?? null,
        max_ssd_gb: max_ssd_gb ?? null,
        bursting_enabled: bursting_enabled ?? false,
        monthly_ai_token_limit: monthly_ai_token_limit ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'site_id' },
    )
    .select()
    .single();

  return NextResponse.json(data);
}
