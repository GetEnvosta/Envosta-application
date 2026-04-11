import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getUsageBreakdown } from '@/services/usage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start') ?? undefined;
  const end = searchParams.get('end') ?? undefined;

  const breakdown = await getUsageBreakdown(userId, start, end);
  return NextResponse.json(breakdown);
}
