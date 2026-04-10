import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { searchAvailableNumbers } from '@/services/twilio';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const areaCode = searchParams.get('areaCode');
  const country = searchParams.get('country') || 'CA';

  if (!areaCode) return NextResponse.json({ error: 'areaCode is required' }, { status: 400 });

  try {
    const numbers = await searchAvailableNumbers(areaCode, country);
    return NextResponse.json(numbers);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
