import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { requestPartnerChange } from '@/services/partners';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reason } = await req.json();
  if (!reason?.trim()) {
    return NextResponse.json({ error: 'Please provide a reason for the change request' }, { status: 400 });
  }

  const result = await requestPartnerChange(userId, reason.trim());
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.data);
}
