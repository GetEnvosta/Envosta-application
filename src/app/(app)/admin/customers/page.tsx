import { getAllCustomers } from '@/services/admin';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';

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
      <form method="GET" className="mb-6">
        <div className="relative max-w-md">
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
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Joined
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!users || users.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
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
                    <td className="px-5 py-3.5">
                      <span className={u.role === 'admin' ? 'badge-indigo' : 'badge-gray'}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {formatDate(u.created_at)}
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
