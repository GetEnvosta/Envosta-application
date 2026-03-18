import { createClient } from '@/lib/supabase-server';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { Search, Server } from 'lucide-react';

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
  const supabase = await createClient();

  let query = supabase
    .from('services')
    .select('*, users(full_name, email), plans(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (status) {
    query = query.eq('status', status);
  }

  if (q) {
    query = query.or(`label.ilike.%${q}%,users.email.ilike.%${q}%`);
  }

  const { data: services } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Services</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and monitor all provisioned services.
          </p>
        </div>
      </div>

      {/* Search + Filter */}
      <form method="GET" className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
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
      </form>

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
                  Region
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!services || services.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
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
                      {(s.users as any)?.email ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {(s.plans as any)?.name ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {s.region ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={statusColor(s.status)}>{s.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {formatDate(s.created_at)}
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
