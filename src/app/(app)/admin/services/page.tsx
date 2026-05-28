export const revalidate = 5;
import { getAllServices } from '@/services/sites';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { Search, Globe, ExternalLink, CheckCircle, XCircle, Shield, AlertTriangle, Server, Zap, Eye, Trash2 } from 'lucide-react';
import { ProvisionButton } from '@/components/admin/provision-button';
import { StatCard } from '@/components/admin/stat-card';
import { AdminCreateSite } from '@/components/admin/admin-create-site';
import { SyncInfo } from '@/components/admin/sync-info';
import { CleanupActions } from '@/components/admin/cleanup-actions';

const STATUSES = ['active', 'suspended', 'cancelled', 'deleted', 'pending', 'provisioning', 'failed'] as const;

/**
 * /admin/services — combined sites listing + cleanup queue.
 *
 * Default view: all sites with status filter chips.
 * Cleanup view (?view=cleanup): only sites in the cleanup workflow
 *   (status='paused' or flagged_for_deletion_at IS NOT NULL).
 *   Replaces the former dedicated /admin/sites/cleanup page.
 */
export default async function SitesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { q, status, view } = await searchParams;
  const isCleanupView = view === 'cleanup';

  // For the chip count + main list, run both queries in parallel.
  const [services, cleanupRows] = await Promise.all([
    getAllServices({
      q,
      status: isCleanupView ? undefined : status,
      queue: isCleanupView ? 'cleanup' : undefined,
    }),
    isCleanupView ? Promise.resolve([]) : getAllServices({ queue: 'cleanup' }),
  ]);

  const cleanupCount = isCleanupView ? services.length : cleanupRows.length;

  // Compute stats from data (when not in cleanup view).
  const totalSites = services.length;
  const activeSites = services.filter((s: any) => s.status === 'active').length;
  const provisioningSites = services.filter((s: any) => s.status === 'provisioning').length;
  const suspendedSites = services.filter((s: any) => s.status === 'suspended').length;

  // Helper: a row is "in the cleanup queue's deletion stage" if it has
  // flagged_for_deletion_at set OR the legacy status='flagged_for_deletion'.
  const isInDeleteStage = (r: any) =>
    r.status === 'flagged_for_deletion' ||
    (r.status === 'cancelled' && r.flagged_for_deletion_at != null);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isCleanupView ? 'Cleanup Queue' : 'Sites'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isCleanupView
              ? 'Paused sites + sites flagged for deletion. Flag, unflag, or confirm permanent deletion.'
              : 'Monitor and manage all customer WordPress sites.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isCleanupView && <AdminCreateSite />}
          <a href="https://atomic-api.wordpress.com" target="_blank" rel="noopener noreferrer"
            className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <ExternalLink className="w-4 h-4" /> wp.cloud
          </a>
        </div>
      </div>

      {/* View chips: All sites vs Cleanup queue */}
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/admin/services"
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            !isCleanupView
              ? 'bg-admin-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Server className="w-3 h-3" /> All sites
        </Link>
        <Link
          href="/admin/services?view=cleanup"
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            isCleanupView
              ? 'bg-amber-600 text-white'
              : cleanupCount > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Trash2 className="w-3 h-3" />
          Cleanup queue
          {cleanupCount > 0 && (
            <span className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
              isCleanupView ? 'bg-white text-amber-700' : 'bg-amber-600 text-white'
            }`}>{cleanupCount}</span>
          )}
        </Link>
      </div>

      {!isCleanupView && (
        <>
          {/* Sync info */}
          <div className="mb-4">
            <SyncInfo type="sites" dbCount={totalSites} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Sites" value={totalSites} icon={Server} color="blue" />
            <StatCard label="Active" value={activeSites} icon={CheckCircle} color="green" />
            <StatCard label="Provisioning" value={provisioningSites} icon={Zap} color="amber" />
            <StatCard label="Suspended" value={suspendedSites} icon={AlertTriangle} color="red" />
          </div>
        </>
      )}

      {/* Banner: cleanup queue context */}
      {isCleanupView && cleanupCount > 0 && (
        <div className="rounded-xl bg-amber-50/60 border border-amber-200 px-4 py-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-medium text-amber-800">
              {cleanupCount} site{cleanupCount === 1 ? '' : 's'} awaiting cleanup action
            </p>
            <p className="text-[11px] text-amber-700/80 mt-0.5">
              Paused sites can be flagged for deletion. Flagged sites stay alive until you confirm — deletion is permanent.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Search + Filter inside card (hide status filter in cleanup view) */}
        <form method="GET" className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          {isCleanupView && <input type="hidden" name="view" value="cleanup" />}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" name="q" defaultValue={q ?? ''} placeholder="Search by site name..." className="input pl-9 w-full" />
            </div>
            {!isCleanupView && (
              <select name="status" defaultValue={status ?? ''} className="input w-auto">
                <option value="">All statuses</option>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            )}
            <button type="submit" className="btn-admin">Filter</button>
          </div>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Site</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Owner</th>
                {!isCleanupView && <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</th>}
                {!isCleanupView && <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Domain</th>}
                {!isCleanupView && <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">Health</th>}
                {!isCleanupView && <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">SSL</th>}
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                {isCleanupView && <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Paused</th>}
                {isCleanupView && <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Flagged</th>}
                {!isCleanupView && <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>}
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!services || services.length === 0) ? (
                <tr>
                  <td colSpan={isCleanupView ? 6 : 9} className="px-5 py-12 text-center">
                    <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {isCleanupView
                        ? 'No sites awaiting cleanup. Nothing to do here.'
                        : q || status ? 'No sites match your filters.' : 'No sites yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                services.map((s: any) => {
                  const owner = s.users as any;
                  const domains = (s.domains as any[]) ?? [];
                  const domain = domains[0];
                  const isUp = s.status === 'active';
                  const isDeleted = s.status === 'deleted' || s.status === 'cancelled';
                  const hasDomain = !!domain?.domain_name;

                  // Plan info (skipped in cleanup view to reduce columns).
                  const userSubs = (owner?.subscriptions as any[]) ?? [];
                  const activeSub = userSubs.find((sub: any) => sub.status === 'active' || sub.status === 'trialing');
                  const planName = activeSub?.products?.name ?? null;
                  const subStatus = activeSub?.status ?? null;

                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/services/${s.id}`} className="font-medium text-admin-600 hover:text-admin-700">
                          {s.label}
                        </Link>
                        {s.wp_cloud_url && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[180px]">{s.wp_cloud_url.replace('https://', '')}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {owner ? (
                          <Link href={`/admin/customers/${owner.id ?? s.user_id}`} className="text-xs text-gray-600 hover:text-admin-600">
                            {owner.full_name || owner.email}
                          </Link>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>

                      {!isCleanupView && (
                        <td className="px-5 py-3.5">
                          {activeSub ? (
                            <div>
                              <span className="text-xs font-medium text-gray-700">{planName || 'Plan'}</span>
                              <span className={`ml-1.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                subStatus === 'active' ? 'bg-emerald-50 text-emerald-700' :
                                subStatus === 'trialing' ? 'bg-blue-50 text-blue-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{subStatus}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No plan</span>
                          )}
                        </td>
                      )}

                      {!isCleanupView && (
                        <td className="px-5 py-3.5">
                          {hasDomain ? (
                            <span className="text-xs font-medium text-gray-700 inline-flex items-center gap-1">
                              <Globe className="w-3 h-3 text-gray-400" /> {domain.domain_name}
                            </span>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                      )}

                      {!isCleanupView && (
                        <td className="px-5 py-3.5 text-center">
                          {isUp ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600" title="Site is up">
                              <CheckCircle className="w-3.5 h-3.5" /> Up
                            </span>
                          ) : isDeleted ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400" title="Deleted">
                              <XCircle className="w-3.5 h-3.5" /> Deleted
                            </span>
                          ) : s.status === 'provisioning' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600" title="Provisioning">
                              <AlertTriangle className="w-3.5 h-3.5" /> Setup
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-500" title="Site is down">
                              <XCircle className="w-3.5 h-3.5" /> Down
                            </span>
                          )}
                        </td>
                      )}

                      {!isCleanupView && (
                        <td className="px-5 py-3.5 text-center">
                          {isUp && hasDomain ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600" title="SSL active">
                              <Shield className="w-3.5 h-3.5" /> ✓
                            </span>
                          ) : isUp ? (
                            <span className="text-xs text-gray-400" title="No custom domain">—</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      )}

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={statusColor(isDeleted ? 'deleted' : s.status)}>
                            {isInDeleteStage(s) ? 'flagged for deletion' : (isDeleted ? 'deleted' : s.status)}
                          </span>
                          {s.status === 'failed' && <span className="badge-red text-[10px]">!</span>}
                          {s.status === 'provisioning' && new Date(s.created_at) < new Date(Date.now() - 3600000) && <span className="badge-yellow text-[10px]">Stuck</span>}
                        </div>
                      </td>

                      {isCleanupView && (
                        <td className="px-5 py-3.5 text-xs text-gray-500">{s.paused_at ? formatDate(s.paused_at) : '—'}</td>
                      )}
                      {isCleanupView && (
                        <td className="px-5 py-3.5 text-xs text-gray-500">{s.flagged_for_deletion_at ? formatDate(s.flagged_for_deletion_at) : '—'}</td>
                      )}

                      {!isCleanupView && (
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(s.created_at)}</td>
                      )}

                      <td className="px-5 py-3.5">
                        {isCleanupView ? (
                          <CleanupActions
                            siteId={s.id}
                            status={s.status}
                            label={s.label || s.domain_name || 'this site'}
                            isFlagged={isInDeleteStage(s)}
                          />
                        ) : (
                          <div className="flex items-center gap-3">
                            {s.status === 'provisioning' && <ProvisionButton siteId={s.id} label={s.label} />}
                            <Link href={`/admin/services/${s.id}`} className="text-xs text-admin-600 hover:text-admin-700 font-medium inline-flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> View
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
