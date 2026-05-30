/**
 * Legacy redirect — logs are the Logs tab inside the Health (formerly
 * System) page. Sister file `./health-checks.tsx` is still imported by
 * /admin/diagnostics so the directory itself stays.
 */
import { redirect } from 'next/navigation';

export default function LegacyLogsRedirect() {
  redirect('/admin/diagnostics?tab=logs');
}
