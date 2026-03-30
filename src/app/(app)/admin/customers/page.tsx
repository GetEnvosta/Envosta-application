export const revalidate = 5;
import { getAllCustomers } from '@/services/admin';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Search, Users, Server, Globe } from 'lucide-react';
import { ImpersonateButton } from '@/components/admin/impersonate-button';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { q } = await searchParams;
  const users = await getAllCustomers(q);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and view all customer accounts.
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name or email..."
            className="input pl-9 w-full"
          />
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Name
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Email
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Company
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">
                  Sites
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">
                  Domains
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Joined
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!users || users.length === 0) ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {q ? 'No customers match your search.' : 'No customers yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/customers/${u.id}`}
                        className="text-sm font-medium text-admin-600 hover:text-admin-700"
                      >
                        {u.full_name || 'Unnamed'}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3.5 text-gray-600">
                      {u.company_name || '\u2014'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {u.site_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                          <Server className="w-3 h-3 text-gray-400" />
                          {u.site_count}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {u.domain_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                          <Globe className="w-3 h-3 text-gray-400" />
                          {u.domain_count}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={u.role === 'admin' ? 'badge-indigo' : 'badge-gray'}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {formatDate(u.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.role !== 'admin' && (
                        <ImpersonateButton userId={u.id} label={u.full_name || u.email} />
                      )}
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
