import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getApprovedPartners } from '@/services/partners';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const partners = await getApprovedPartners({
    specialization: searchParams.get('specialization') ?? undefined,
    industry: searchParams.get('industry') ?? undefined,
    minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
  });

  return NextResponse.json(partners);
}
