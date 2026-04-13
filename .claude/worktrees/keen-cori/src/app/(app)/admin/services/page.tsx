export const revalidate = 5;
import { getAllServices } from '@/services/sites';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { Search, Server, ExternalLink, Globe } from 'lucide-react';
import { ProvisionButton } from '@/components/admin/provision-button';
import { ImpersonateButton } from '@/components/admin/impersonate-button';

const STATUSES = [
  'active',
  'suspended',
  'cancelled',
  'pending',
  'provisioning',
  'failed',
] as const;

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { q, status } = await searchParams;
  const services = await getAllServices({ q, status });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and monitor all provisioned services.
          </p>
        </div>
        <a
          href="https://atomic-api.wordpress.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          wp.cloud Dashboard
        </a>
      </div>

      {/* Search + Filter */}
      <form method="GET" className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6"><div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by site name or email..."
            className="input pl-9 w-full"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ''}
          className="input w-auto"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-admin">
          Filter
        </button>
      </div></form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Site name
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Owner
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Plan
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Domain
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Region
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Created
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!services || services.length === 0) ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Server className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {q || status
                        ? 'No services match your filters.'
                        : 'No services yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                services.map((s: any) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/services/${s.id}`}
                        className="font-medium text-admin-600 hover:text-admin-700"
                      >
                        {s.label}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {(s.users as any)?.email ?? '\u2014'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {s.products?.name ?? '\u2014'}
                    </td>
                    <td className="px-5 py-3.5">
                      {(() => {
                        const domains = (s as any).domains as any[] | null;
                        const domain = domains?.[0];
                        return domain ? (
                          <span className="text-xs font-medium text-gray-700 inline-flex items-center gap-1">
                            <Globe className="w-3 h-3 text-gray-400" />
                            {domain.domain_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">&mdash;</span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {s.region ?? '\u2014'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={statusColor(s.status)}>{s.status}</span>
                        {s.status === 'failed' && <span className="badge-red text-[10px]">!</span>}
                        {s.status === 'provisioning' && new Date(s.created_at) < new Date(Date.now() - 3600000) && <span className="badge-yellow text-[10px]">Stuck</span>}
                        {!s.subscription_id && s.status === 'active' && <span className="badge-yellow text-[10px]">No sub</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {formatDate(s.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {s.status === 'provisioning' && (
                          <ProvisionButton siteId={s.id} label={s.label} />
                        )}
                        <Link href={`/admin/services/${s.id}`} className="text-xs text-admin-600 hover:text-admin-700">
                          View
                        </Link>
                        {(s as any).user_id && (
                          <ImpersonateButton userId={(s as any).user_id} label={(s.users as any)?.email} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
