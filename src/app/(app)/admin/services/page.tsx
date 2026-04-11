export const revalidate = 5;
import { getAllServices } from '@/services/sites';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { Search, Globe, ExternalLink, CheckCircle, XCircle, Shield, AlertTriangle } from 'lucide-react';
import { ProvisionButton } from '@/components/admin/provision-button';
import { ImpersonateButton } from '@/components/admin/impersonate-button';

const STATUSES = ['active', 'suspended', 'cancelled', 'pending', 'provisioning', 'failed'] as const;

export default async function SitesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { q, status } = await searchParams;
  const services = await getAllServices({ q, status });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sites</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor and manage all customer WordPress sites.</p>
        </div>
        <a href="https://atomic-api.wordpress.com" target="_blank" rel="noopener noreferrer"
          className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <ExternalLink className="w-4 h-4" /> wp.cloud
        </a>
      </div>

      {/* Search + Filter */}
      <form method="GET" className="filter-bar"><div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" name="q" defaultValue={q ?? ''} placeholder="Search by site name or email..." className="input pl-9 w-full" />
        </div>
        <select name="status" defaultValue={status ?? ''} className="input w-auto">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <button type="submit" className="btn-admin">Filter</button>
      </div></form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Site</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Owner</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Subscription</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Domain</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">Health</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">SSL</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!services || services.length === 0) ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center">
                    <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">{q || status ? 'No sites match your filters.' : 'No sites yet.'}</p>
                  </td>
                </tr>
              ) : (
                services.map((s: any) => {
                  const owner = s.users as any;
                  const domains = (s.domains as any[]) ?? [];
                  const domain = domains[0];
                  const isUp = s.status === 'active';
                  const hasDomain = !!domain?.domain_name;

                  // Determine subscription status from the owner's payment_status
                  const paymentStatus = s.payment_status ?? 'current';

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
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          paymentStatus === 'current' ? 'bg-emerald-50 text-emerald-700' :
                          paymentStatus === 'grace' ? 'bg-amber-50 text-amber-700' :
                          paymentStatus === 'suspended' ? 'bg-red-50 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{paymentStatus}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {hasDomain ? (
                          <span className="text-xs font-medium text-gray-700 inline-flex items-center gap-1">
                            <Globe className="w-3 h-3 text-gray-400" /> {domain.domain_name}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {isUp ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600" title="Site is up">
                            <CheckCircle className="w-3.5 h-3.5" /> Up
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
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={statusColor(s.status)}>{s.status}</span>
                          {s.status === 'failed' && <span className="badge-red text-[10px]">!</span>}
                          {s.status === 'provisioning' && new Date(s.created_at) < new Date(Date.now() - 3600000) && <span className="badge-yellow text-[10px]">Stuck</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(s.created_at)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {s.status === 'provisioning' && <ProvisionButton siteId={s.id} label={s.label} />}
                          <Link href={`/admin/services/${s.id}`} className="text-xs text-admin-600 hover:text-admin-700">View</Link>
                          {s.user_id && <ImpersonateButton userId={s.user_id} label={owner?.email} />}
                        </div>
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
