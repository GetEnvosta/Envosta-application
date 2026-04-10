import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { getAutoRefillSettings, updateAutoRefillSettings } from '@/services/credits';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getAutoRefillSettings(userId);
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { enabled, threshold, refill_amount } = await req.json();

  if (typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 });
  }
  if (threshold < 1 || threshold > 1000) {
    return NextResponse.json({ error: 'threshold must be 1–1000' }, { status: 400 });
  }
  const validAmounts = [25, 50, 100, 250, 500];
  if (!validAmounts.includes(refill_amount)) {
    return NextResponse.json({ error: `refill_amount must be one of: ${validAmounts.join(', ')}` }, { status: 400 });
  }

  const data = await updateAutoRefillSettings(userId, { enabled, threshold, refill_amount });
  return NextResponse.json(data);
}
