import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { applyAsPartner } from '@/services/partners';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { bio, specializations, industries, portfolio_links, location, setup_fee_range, company_name, website } = body;

  if (!bio || !specializations?.length) {
    return NextResponse.json({ error: 'Bio and at least one specialization are required' }, { status: 400 });
  }

  const result = await applyAsPartner(userId, {
    bio, specializations, industries: industries ?? [], portfolio_links,
    location, setup_fee_range, company_name, website,
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
