export const revalidate = 5;
import { getAllDomains } from '@/services/domains';
import { formatDate, statusColor } from '@/lib/utils';
import { Globe, Search, ExternalLink, Server, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { StatCard } from '@/components/admin/stat-card';
import { AdminCreateDomain } from '@/components/admin/admin-create-domain';
import { SyncInfo } from '@/components/admin/sync-info';

const STATUSES = ['available', 'registered', 'transferring', 'expired', 'pending_dns', 'failed'] as const;

export default async function DomainsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ?? '';
  const search = params.q ?? '';

  const domains = await getAllDomains({ q: search, status: statusFilter });

  // Compute stats
  const totalDomains = domains.length;
  const registered = domains.filter((d: any) => d.status === 'registered').length;
  const transferring = domains.filter((d: any) => d.status === 'transferring').length;
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = domains.filter((d: any) => {
    if (d.status !== 'registered' || !d.expiry_date) return false;
    const exp = new Date(d.expiry_date);
    return exp <= thirtyDays && exp >= now;
  }).length;
  const autoRenew = domains.filter((d: any) => (d.metadata as any)?.auto_renew).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Domains</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all registered domains across the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <AdminCreateDomain />
          <a
            href="https://rr-n1-tor.opensrs.net/openSRS"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-4 h-4" />
            OpenSRS
          </a>
        </div>
      </div>

      {/* Sync info */}
      <div className="mb-4">
        <SyncInfo type="domains" dbCount={totalDomains} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Domains" value={totalDomains} icon={Globe} color="blue" />
        <StatCard label="Registered" value={registered} icon={CheckCircle} color="green" />
        <StatCard label="Transferring" value={transferring} icon={Clock} color="amber" />
        <StatCard label="Expiring Soon" value={expiringSoon} icon={AlertTriangle} color={expiringSoon > 0 ? 'red' : 'gray'} sub={expiringSoon > 0 ? 'Within 30 days' : ''} />
        <StatCard label="Auto-Renew" value={autoRenew} icon={RefreshCw} color="purple" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Search + Filter inside card */}
        <form className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" name="q" defaultValue={search} placeholder="Search by domain name..." className="input pl-9 w-full" />
            </div>
            <select name="status" defaultValue={statusFilter} className="input w-auto sm:w-44">
              <option value="">All statuses</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-admin">Filter</button>
          </div>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Connected Site</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Renewal</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Auto-renew</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No domains found.</p>
                  </td>
                </tr>
              ) : domains.map((d: any) => {
                const site = d.sites;
                return (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{d.domain_name}</td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {(d.users as any)?.email ?? '\u2014'}
                  </td>
                  <td className="px-5 py-3.5">
                    {site ? (
                      <Link href={`/admin/services/${site.id}`} className="text-admin-600 hover:text-admin-700 font-medium text-xs inline-flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        {site.label}
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-xs">&mdash;</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {/* Phase 3: renewals are cron-fired off-session charges. */}
                    {d.auto_renew === false ? (
                      <span className="text-xs text-amber-600 inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Off
                      </span>
                    ) : (
                      <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Auto
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className={statusColor(d.status)}>{d.status.replace('_', ' ')}</span>
                      {d.status === 'failed' && <span className="badge-red text-[10px]">!</span>}
                      {d.status === 'pending' && <span className="badge-yellow text-[10px]">Pending</span>}
                      {d.status === 'registered' && !site && <span className="badge-blue text-[10px]">No site</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDate(d.expiry_date)}</td>
                  <td className="px-5 py-3.5 text-gray-500">{d.auto_renew ? 'Yes' : 'No'}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/domains/${d.id}`} className="text-xs text-admin-600 hover:text-admin-700 font-medium">
                        Manage
                      </Link>
                      {(d.users as any)?.id && (
                        <Link href={`/admin/customers/${(d.users as any).id}`} className="text-xs text-gray-500 hover:text-gray-700">
                          Customer
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
