import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data } = await admin
    .from('user_integrations')
    .select('id, provider_email, status, enabled, last_used_at, connection_config, integration_providers(slug, display_name, description, category)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  return NextResponse.json({ integrations: data ?? [] });
}
