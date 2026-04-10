import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { ratePartner } from '@/services/partners';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { partnerId, rating, comment } = await req.json();
  if (!partnerId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'partnerId and rating (1-5) are required' }, { status: 400 });
  }

  const result = await ratePartner(userId, partnerId, rating, comment);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
