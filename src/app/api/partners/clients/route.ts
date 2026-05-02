import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getPartnerClients } from '@/services/partners';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/partners/clients
 *
 * Returns the partner's client list (customers whose users.partner_id
 * matches the caller). Augments each row with company_name pulled from
 * the users table.
 *
 * Auth: caller must be authed AND have role='partner'. Uses
 * getEffectiveUserId() so admin impersonation works the same as a
 * partner viewing their own dashboard.
 *
 * Response shape: { clients: [{ id, full_name, email, company_name, ... }] }
 */
export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  if (profile?.role !== 'partner') {
    return NextResponse.json({ error: 'Partner access required' }, { status: 403 });
  }

  const clients = await getPartnerClients(userId);

  // Augment with company_name (the partners service doesn't pull it).
  const withCompany = await Promise.all(
    clients.map(async (c: any) => {
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
