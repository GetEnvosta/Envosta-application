/**
 * /admin/audit — legacy route. The observability dashboard merged into the
 * Health page (/admin/diagnostics) as the api / webhooks / sync / audit tabs.
 * This redirect keeps old bookmarks and the tab/resourceId deep links working.
 */
import { redirect } from 'next/navigation';

type SP = { [key: string]: string | undefined };

export default async function AuditRedirect({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  if (sp.tab === 'audit') {
    // Audit Log is now Logs → Audit trail.
    params.set('tab', 'logs');
    params.set('logView', 'audit');
  } else if (sp.tab && ['api', 'webhooks', 'sync'].includes(sp.tab)) {
    params.set('tab', sp.tab);
  } else {
    params.set('tab', 'api');
  }
  if (sp.resourceId) params.set('resourceId', sp.resourceId);
  redirect(`/admin/diagnostics?${params.toString()}`);
}
