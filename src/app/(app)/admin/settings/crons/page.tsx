/**
 * Settings → Crons. Understand / pause / test the scheduled jobs.
 *
 * Schedules are owned by vercel.json and shown read-only. Pause + last-run
 * state come from platform_settings (see src/lib/crons.ts).
 */
export const dynamic = 'force-dynamic';

import { CRONS, getAllCronStates } from '@/lib/crons';
import { CronsClient } from './crons-client';

export default async function CronsSettingsPage() {
  const states = await getAllCronStates();
  const rows = CRONS.map((c) => ({ ...c, state: states[c.name] ?? { enabled: true } }));

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-base font-semibold text-gray-900">Crons</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Schedules live in <span className="font-mono">vercel.json</span> (read-only here). <strong>Pause</strong> keeps
          the job on its schedule but makes it skip its work; <strong>Run now</strong> triggers it immediately.
        </p>
      </div>
      <CronsClient rows={rows} />
    </div>
  );
}
