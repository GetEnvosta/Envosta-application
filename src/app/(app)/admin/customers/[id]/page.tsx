import { getCustomerById, getCustomerRelatedData } from '@/services/admin';
import { cn, formatDate, formatDateTime, statusColor } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Clock,
  Globe,
  Mail,
  Phone,
  Server,
  Shield,
  User,
} from 'lucide-react';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCustomerById(id);

  if (!user) {
    return (
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
        <div className="card p-12 text-center">
          <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Customer not found.</p>
        </div>
      </div>
    );
  }

  const { services, domains, subscriptions, logs } = await getCustomerRelatedData(user.id);

  return (
    <div>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </Link>

      {/* Profile card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-admin-100 text-admin-700 flex items-center justify-center text-lg font-semibold shrink-0">
            {(user.full_name?.[0] || user.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-gray-900">
                {user.full_name || 'Unnamed'}
              </h1>
              <span className={user.role === 'admin' ? 'badge-indigo' : 'badge-gray'}>
                {user.role}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {user.email}
              </div>
              {user.company_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {user.company_name}
                </div>
              )}
              {user.phone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {user.phone}
                </div>
              )}
              {user.timezone && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {user.timezone}
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="w-4 h-4 text-gray-400" />
                Joined {formatDate(user.created_at)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Services + Domains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Services */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Services ({services.length})
            </h2>
          </div>
          {services.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No services.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Label
                    </th>
                    <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Plan
                    </th>
                    <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {services.map((s: any) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/services/${s.id}`}
                          className="font-medium text-admin-600 hover:text-admin-700"
                        >
                          {s.label}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {(s.plans as any)?.name ?? '\u2014'}
                      </td>
                      <td className="px-5 py-3">
                        <span className={statusColor(s.status)}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Domains */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">
              Domains ({domains.length})
            </h2>
          </div>
          {domains.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No domains.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Domain
                    </th>
                    <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Added
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {domains.map((d: any) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {d.name}
                      </td>
                      <td className="px-5 py-3">
                        <span className={statusColor(d.status)}>{d.status}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {formatDate(d.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No activity recorded.
            </div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{log.action}</p>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
                {log.message && (
                  <p className="text-xs text-gray-500 mt-0.5">{log.message}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
