import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getCreditBalance } from '@/services/credits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const balance = await getCreditBalance(userId);
  return NextResponse.json(balance);
}
