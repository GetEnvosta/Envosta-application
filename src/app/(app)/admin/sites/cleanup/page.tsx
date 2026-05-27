import { createClient } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';
import { AlertTriangle, Server } from 'lucide-react';
import Link from 'next/link';
import { CleanupActions } from './cleanup-actions';

export const dynamic = 'force-dynamic';

export default async function SitesCleanupPage() {
  const supabase = await createClient();

  // Cleanup queue includes:
  //   - status='paused' sites (admin can flag them for deletion)
  //   - any site with flagged_for_deletion_at set (legacy
  //     status='flagged_for_deletion' OR new workflow path
  //     status='cancelled' + flagged_for_deletion_at)
  // It explicitly EXCLUDES subscription-paused-then-cancelled sites
  // (those have recovery_deadline instead of flagged_for_deletion_at
  // and are auto-handled by the delete-expired-sites cron).
  const { data: sites } = await supabase
    .from('sites')
    .select('id, label, domain_name, status, paused_at, flagged_for_deletion_at, flag_reason, users:user_id(id, full_name, email)')
    .or('status.eq.paused,flagged_for_deletion_at.not.is.null')
    .order('flagged_for_deletion_at', { ascending: true, nullsFirst: false })
    .order('paused_at', { ascending: true });

  const rows = sites ?? [];
  const isInDeleteQueue = (r: any) =>
    r.status === 'flagged_for_deletion' ||
    (r.status === 'cancelled' && r.flagged_for_deletion_at != null);
  const flaggedCount = rows.filter(isInDeleteQueue).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Cleanup queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Sites whose subscription has been cancelled. Flag for deletion, then confirm — sites are never auto-deleted.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <Server className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No sites to clean up</p>
          <p className="text-xs text-gray-500">Paused sites and sites flagged for deletion show up here for review.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {flaggedCount > 0 && (
            <div className="px-5 py-3 border-b border-gray-100 bg-amber-50/40 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-xs font-medium text-amber-800">
                {flaggedCount} site{flaggedCount === 1 ? '' : 's'} flagged for deletion. Confirming deletion is permanent.
              </p>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Paused</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Flagged</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((site: any) => {
                const owner = site.users;
                const isFlagged = isInDeleteQueue(site);
                return (
                  <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/services/${site.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {site.label || site.domain_name || 'Unnamed'}
                      </Link>
                      {site.domain_name && site.label && <p className="text-xs text-gray-500 mt-0.5">{site.domain_name}</p>}
                    </td>
                    <td className="px-5 py-3">
                      {owner ? (
                        <Link href={`/admin/customers/${owner.id}`} className="text-sm text-gray-700 hover:text-blue-600">
                          {owner.full_name || owner.email}
                        </Link>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isFlagged ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isFlagged ? 'Flagged for deletion' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{site.paused_at ? formatDate(site.paused_at) : '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{site.flagged_for_deletion_at ? formatDate(site.flagged_for_deletion_at) : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <CleanupActions siteId={site.id} status={site.status} label={site.label || site.domain_name || 'this site'} isFlagged={isFlagged} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
