import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getPartnerTickets } from '@/services/partners';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
  if (user?.role !== 'partner') return NextResponse.json({ error: 'Partner access required' }, { status: 403 });

  const tickets = await getPartnerTickets(userId);
  return NextResponse.json(tickets);
}
