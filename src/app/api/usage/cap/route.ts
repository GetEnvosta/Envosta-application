import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase.from('users').select('spending_cap').eq('id', userId).single();
  return NextResponse.json({ spending_cap: data?.spending_cap ?? null });
}

export async function PUT(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { spending_cap } = await req.json();

  // Validate: null (no cap) or integer >= 36 (must cover at least the base plan)
  if (spending_cap !== null && (typeof spending_cap !== 'number' || spending_cap < 36)) {
    return NextResponse.json({ error: 'Spending cap must be at least 36 (your plan amount) or null for no cap' }, { status: 400 });
  }

  const supabase = await createClient();
  await supabase.from('users').update({ spending_cap }).eq('id', userId);

  return NextResponse.json({ spending_cap });
}
