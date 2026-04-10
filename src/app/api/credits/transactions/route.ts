import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getCreditTransactions } from '@/services/credits';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
  const offset = Number(searchParams.get('offset') || 0);

  const result = await getCreditTransactions(userId, limit, offset);
  return NextResponse.json(result);
}
