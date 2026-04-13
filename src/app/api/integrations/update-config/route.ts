import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { integrationId, config } = await req.json();
  if (!integrationId || !config) {
    return NextResponse.json({ error: 'integrationId and config required' }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Verify ownership
  const { data: existing } = await admin
    .from('user_integrations')
    .select('id, user_id, connection_config')
    .eq('id', integrationId)
    .eq('user_id', user.id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Deep merge into existing connection_config
  const merged = { ...(existing.connection_config ?? {}), ...config };

  const { error } = await admin
    .from('user_integrations')
    .update({ connection_config: merged, updated_at: new Date().toISOString() })
    .eq('id', integrationId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
