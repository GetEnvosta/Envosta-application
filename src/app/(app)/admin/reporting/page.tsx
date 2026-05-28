/**
 * Legacy redirect — reporting was folded into /admin/billing as the
 * Revenue + Funnel tabs. Anyone hitting the old URL gets sent to the
 * unified view.
 */
import { redirect } from 'next/navigation';

export default function LegacyReportingRedirect() {
  redirect('/admin/billing?view=revenue');
}
