/**
 * Legacy redirect — the dedicated cleanup queue page was folded into
 * /admin/services as a `?view=cleanup` filter chip. Anyone hitting the
 * old URL gets redirected to the unified view.
 */
import { redirect } from 'next/navigation';

export default function LegacyCleanupRedirect() {
  redirect('/admin/services?view=cleanup');
}
