import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { deleteSecret } from '@/lib/vault';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { integrationId } = await req.json();
  if (!integrationId) return NextResponse.json({ error: 'integrationId required' }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Fetch the integration — must belong to this user
  const { data: integration } = await admin
    .from('user_integrations')
    .select('id, user_id, credentials_vault_id')
    .eq('id', integrationId)
    .eq('user_id', user.id)
    .single();

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
  }

  // Delete from Vault first
  if (integration.credentials_vault_id) {
    try {
      await deleteSecret(integration.credentials_vault_id);
    } catch (err) {
      console.error('Vault delete failed (continuing):', err);
    }
  }

  // Delete the integration row
  await admin.from('user_integrations').delete().eq('id', integrationId);

  return NextResponse.json({ success: true });
}
