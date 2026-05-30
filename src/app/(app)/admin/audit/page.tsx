/**
 * /admin/audit — legacy route. The observability dashboard merged into the
 * Health page (/admin/diagnostics) as the api / webhooks / sync / audit tabs.
 * This redirect keeps old bookmarks and the tab/resourceId deep links working.
 */
import { redirect } from 'next/navigation';

type SP = { [key: string]: string | undefined };

export default async function AuditRedirect({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = sp.tab && ['api', 'webhooks', 'sync', 'audit'].includes(sp.tab) ? sp.tab : 'api';
  const params = new URLSearchParams({ tab });
  if (sp.resourceId) params.set('resourceId', sp.resourceId);
  redirect(`/admin/diagnostics?${params.toString()}`);
}
