import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient as createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** GET /api/phone-numbers/[id] — get config + recent calls for a phone number */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = await createServerClient();

  const { data: record } = await supabase
    .from('phone_numbers')
    .select('id, phone_number, enabled, config, site_id, created_at, sites(id, label)')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Fetch recent calls for this number
  const { data: logs } = await supabase
    .from('logs')
    .select('*')
    .eq('user_id', userId)
    .eq('action', 'receptionist.call')
    .order('created_at', { ascending: false })
    .limit(20);

  // Filter to calls matching this phone number
  const calls = (logs ?? [])
    .filter((log: any) => {
      // Match by site_id if linked, or by phone number in metadata
      if (record.site_id && log.site_id === record.site_id) return true;
      return false;
    })
    .map((log: any) => {
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

  return NextResponse.json({ ...record, calls });
}

/** PUT /api/phone-numbers/[id] — update config and enabled state */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { enabled, config } = await req.json();

  const supabase = await createServerClient();

  // Verify ownership
  const { data: record } = await supabase
    .from('phone_numbers')
    .select('id, site_id')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Cap max call minutes
  if (config?.max_call_minutes && config.max_call_minutes > 6) {
    config.max_call_minutes = 6;
  }

  const updates: any = {};
  if (enabled !== undefined) updates.enabled = enabled;
  if (config) updates.config = config;

  const { data, error } = await supabase
    .from('phone_numbers')
    .update(updates)
    .eq('id', id)
    .select('id, phone_number, enabled, config')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also sync enabled state to site if linked
  if (record.site_id && enabled !== undefined) {
    await supabase.from('sites').update({
      receptionist_enabled: enabled,
      updated_at: new Date().toISOString(),
    }).eq('id', record.site_id);
  }

  return NextResponse.json(data);
}
