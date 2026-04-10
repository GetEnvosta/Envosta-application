import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getPartnerProfile, updatePartnerProfile } from '@/services/partners';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await getPartnerProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Partner profile not found' }, { status: 404 });
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
  if (user?.role !== 'partner') return NextResponse.json({ error: 'Partner access required' }, { status: 403 });

  const body = await req.json();
  const data = await updatePartnerProfile(userId, body);
  return NextResponse.json(data);
}
