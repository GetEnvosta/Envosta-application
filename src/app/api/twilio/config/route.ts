import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const supabase = await createServerClient();
  const { data: site } = await supabase
    .from('sites')
    .select('twilio_phone_number, receptionist_enabled, receptionist_config, label')
    .eq('id', siteId)
    .eq('user_id', userId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  return NextResponse.json({
    phone_number: site.twilio_phone_number,
    enabled: site.receptionist_enabled,
    config: site.receptionist_config ?? {},
    site_label: site.label,
  });
}

export async function PUT(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { siteId, enabled, config } = await req.json();
  if (!siteId) return NextResponse.json({ error: 'siteId required' }, { status: 400 });

  const supabase = await createServerClient();

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .eq('user_id', userId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  // Validate max_call_minutes cap
  if (config?.max_call_minutes && config.max_call_minutes > 6) {
    config.max_call_minutes = 6;
  }

  const updates: any = { updated_at: new Date().toISOString() };
  if (enabled !== undefined) updates.receptionist_enabled = enabled;
  if (config) updates.receptionist_config = config;

  const { data } = await supabase
    .from('sites')
    .update(updates)
    .eq('id', siteId)
    .select('receptionist_enabled, receptionist_config')
    .single();

  return NextResponse.json(data);
}
