/**
 * GET /api/cron/monthly-engine — 1st of the month, 08:00 UTC.
 *
 * Runs the automation spine's monthly engine (spine/monthly-engine.ts):
 * plan-cadence service-area-page tasks + the branded monthly report
 * template per active client, routed to the VA QA queue. Nothing ships
 * without QA sign-off (runbooks/monthly-engine.md).
 *
 * Pre–Phase 6 (new schema not provisioned) the run no-ops with
 * schemaReady:false — safe to schedule now.
 *
 * Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`.
 */
import { NextResponse } from 'next/server';
import { guardCron } from '@/lib/crons';
import { recordAudit } from '@/lib/audit';
import { runMonthlyEngine } from '@/spine/monthly-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { enabled } = await guardCron('monthly-engine');
  if (!enabled) return NextResponse.json({ skipped: 'disabled' });

  const started = Date.now();
  const result = await runMonthlyEngine();

  await recordAudit({
    actorType: 'system',
    action: result.schemaReady ? 'monthly_engine.ran' : 'monthly_engine.skipped_schema',
    resourceType: 'cron',
    resourceId: 'monthly-engine',
    metadata: { ...result, duration_ms: Date.now() - started },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
