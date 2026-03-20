import { createClient } from '@/lib/supabase-server';
import { formatDate, formatDateTime, statusColor } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Globe,
  HardDrive,
  Server,
  User,
  Wifi,
} from 'lucide-react';

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: service } = await supabase
    .from('services')
    .select('*, users(id, full_name, email, company_name), plans(name, slug)')
    .eq('id', id)
    .single();

  if (!service) {
    return (
      <div>
        <Link
          href="/admin/services"
          className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </Link>
        <div className="card p-12 text-center">
          <Server className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Service not found.</p>
        </div>
      </div>
    );
  }

  const [{ data: domains }, { data: logs }] = await Promise.all([
    supabase
      .from('domains')
      .select('*')
      .eq('service_id', service.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('logs')
      .select('*')
      .eq('service_id', service.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const owner = service.users as any;

  return (
    <div>
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Services
      </Link>

      {/* Service info card */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">
                {service.label}
              </h1>
              <span className={statusColor(service.status)}>
                {service.status}
              </span>
            </div>
            {service.type && (
              <p className="text-sm text-gray-500 mt-0.5">
                Type: {service.type}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Server className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">Plan:</span>{' '}
            {(service.plans as any)?.name ?? '—'}
          </div>
          {service.region && (
            <div className="flex items-center gap-2 text-gray-600">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Region:</span> {service.region}
            </div>
          )}
          {service.php_version && (
            <div className="flex items-center gap-2 text-gray-600">
              <span className="text-gray-500">PHP:</span> {service.php_version}
            </div>
          )}
          {service.disk_usage_mb != null && (
            <div className="flex items-center gap-2 text-gray-600">
              <HardDrive className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Disk:</span>{' '}
              {service.disk_usage_mb} MB
            </div>
          )}
          {service.bandwidth_usage_mb != null && (
            <div className="flex items-center gap-2 text-gray-600">
              <Wifi className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Bandwidth:</span>{' '}
              {service.bandwidth_usage_mb} MB
            </div>
          )}
          {service.wp_cloud_url && (
            <div className="flex items-center gap-2 text-gray-600">
              <ExternalLink className="w-4 h-4 text-gray-400" />
              <a
                href={service.wp_cloud_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-admin-600 hover:text-admin-700 underline"
              >
                WP Cloud URL
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">Provisioned:</span>{' '}
            {formatDate(service.provisioned_at ?? service.created_at)}
          </div>
        </div>
      </div>

      {/* Owner card */}
      {owner && (
        <div className="card p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-admin-100 text-admin-700 flex items-center justify-center text-sm font-semibold shrink-0">
              {(owner.full_name?.[0] || owner.email?.[0] || '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/admin/customers/${owner.id}`}
                className="text-sm font-medium text-admin-600 hover:text-admin-700"
              >
                {owner.full_name || 'Unnamed'}
              </Link>
              <p className="text-xs text-gray-500">
                {owner.email}
                {owner.company_name ? ` — ${owner.company_name}` : ''}
              </p>
            </div>
            <User className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* Domains */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">
            Domains ({domains?.length ?? 0})
          </h2>
        </div>
        {!domains || domains.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            No domains linked to this service.
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

      {/* Recent logs */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent logs</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {!logs || logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              No logs recorded.
            </div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {log.action}
                  </p>
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
