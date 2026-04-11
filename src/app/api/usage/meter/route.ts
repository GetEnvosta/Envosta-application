import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getUsageMeter } from '@/services/usage';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const meter = await getUsageMeter(userId);
  return NextResponse.json(meter);
}
