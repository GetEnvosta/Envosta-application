import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Credit deductions cron — DISABLED.
 * Credit system removed. Plans now use simple sites_allowed count.
 * Kept as stub so existing cron config doesn't 404.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ message: 'Credit system disabled — no-op', processed: 0 });
}
