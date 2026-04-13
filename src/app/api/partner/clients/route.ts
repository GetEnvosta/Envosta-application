import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { getPartnerClients } from '@/services/partners';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'partner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clients = await getPartnerClients(user.id);

  // Also pull company_name
  const withCompany = await Promise.all(
    clients.map(async (c) => {
      const { data } = await supabase
        .from('users')
        .select('company_name')
        .eq('id', c.id)
        .single();
      return { ...c, company_name: data?.company_name ?? null };
    }),
  );

  return NextResponse.json({ clients: withCompany });
}
