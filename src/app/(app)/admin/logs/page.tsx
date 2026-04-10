export const revalidate = 5;
import { getAdminLogs } from '@/services/admin';
import { formatDateTime } from '@/lib/utils';
import { ScrollText, Search, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { SystemHealthChecks } from './health-checks';

const LEVELS = ['info', 'warn', 'error', 'debug'] as const;

const levelBadge: Record<string, string> = {
  info: 'badge-blue',
  warn: 'badge-yellow',
  error: 'badge-red',
  debug: 'badge-gray',
};

export default async function SystemHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const levelFilter = params.level ?? '';
  const search = params.q ?? '';

  const logs = await getAdminLogs({ level: levelFilter, q: search }, 50);

  // Count errors in last 24h
  const now = Date.now();
  const recentErrors = logs?.filter((l: any) => l.level === 'error' && (now - new Date(l.created_at).getTime()) < 86400000).length ?? 0;
  const recentWarns = logs?.filter((l: any) => l.level === 'warn' && (now - new Date(l.created_at).getTime()) < 86400000).length ?? 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">System Health</h1>
          <p className="text-sm text-gray-500 mt-0.5">Service status, integrations, and platform logs.</p>
        </div>
      </div>

      {/* Health Checks */}
      <SystemHealthChecks />

      {/* Error summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          {recentErrors === 0 ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <div>
            <p className="text-2xl font-semibold text-gray-900">{recentErrors}</p>
            <p className="text-xs text-gray-500">Errors (24h)</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          {recentWarns === 0 ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <div>
            <p className="text-2xl font-semibold text-gray-900">{recentWarns}</p>
            <p className="text-xs text-gray-500">Warnings (24h)</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <ScrollText className="w-5 h-5 text-gray-400 shrink-0" />
          <div>
            <p className="text-2xl font-semibold text-gray-900">{logs?.length ?? 0}</p>
            <p className="text-xs text-gray-500">Total log entries</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form className="filter-bar">
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <select name="level" defaultValue={levelFilter} className="input w-full sm:w-40">
              <option value="">All levels</option>
              {LEVELS.map(l => (
                <option key={l} value={l}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              name="q"
              defaultValue={search}
              placeholder="Search action or message..."
              className="input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn-admin">Filter</button>
        </div>
      </form>

      {/* Logs table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Platform Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!logs || logs.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <ScrollText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No logs found.</p>
                  </td>
                </tr>
              ) : logs.map((log: any) => {
                const user = log.users as any;
                const message = log.message ?? '';
                const truncated = message.length > 80 ? message.slice(0, 80) + '...' : message;

                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                    <td className="px-5 py-3.5">
                      {user ? (
                        <div>
                          <p className="text-gray-900 font-medium">{user.full_name || 'Unnamed'}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">System</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={levelBadge[log.level] ?? 'badge-gray'}>{log.level}</span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">{log.action}</td>
                    <td className="px-5 py-3.5 text-gray-500" title={message}>{truncated || '\u2014'}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{log.ip_address ?? '\u2014'}</td>
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
