import { getAllDomains } from '@/services/domains';
import { formatDate, statusColor } from '@/lib/utils';
import { Globe, Search, DollarSign, ExternalLink } from 'lucide-react';
import Link from 'next/link';

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

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Domains</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage all registered domains across the platform.</p>
        </div>
        <a
          href="https://rr-n1-tor.opensrs.net/openSRS"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <ExternalLink className="w-4 h-4" />
          OpenSRS Dashboard
        </a>
      </div>

      {/* Filters */}
      <form className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search by domain name..."
              className="input pl-9 w-full"
            />
          </div>
          <div>
            <select name="status" defaultValue={statusFilter} className="input w-full sm:w-44">
              <option value="">All statuses</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-admin">Filter</button>
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Auto-renew</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {domains.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <Globe className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No domains found.</p>
                  </td>
                </tr>
              ) : domains.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{d.domain_name}</td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {(d.users as any)?.email ?? '\u2014'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={statusColor(d.status)}>{d.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDate(d.registered_at)}</td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDate(d.expires_at)}</td>
                  <td className="px-5 py-3.5 text-gray-500">{d.auto_renew ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
