import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getUsageBreakdown } from '@/services/credits';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const startDate = searchParams.get('start') || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endDate = searchParams.get('end') || now.toISOString();

  const breakdown = await getUsageBreakdown(userId, startDate, endDate);
  return NextResponse.json(breakdown);
}
