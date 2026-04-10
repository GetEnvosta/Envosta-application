import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from('users')
    .select('mandatory_monthly_credits, auto_refill_enabled')
    .eq('id', userId)
    .single();

  return NextResponse.json({
    mandatory_monthly_credits: Number(data?.mandatory_monthly_credits ?? 0),
    auto_refill_enabled: data?.auto_refill_enabled ?? false,
  });
}
