import { createClient } from '@/lib/supabase-server';
import { formatDateTime } from '@/lib/utils';
import { ScrollText, Search } from 'lucide-react';

const LEVELS = ['info', 'warn', 'error', 'debug'] as const;

const levelBadge: Record<string, string> = {
  info: 'badge-blue',
  warn: 'badge-yellow',
  error: 'badge-red',
  debug: 'badge-gray',
};

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const levelFilter = params.level ?? '';
  const search = params.q ?? '';

  const supabase = await createClient();

  let query = supabase
    .from('logs')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (levelFilter) {
    query = query.eq('level', levelFilter);
  }

  if (search) {
    query = query.or(`action.ilike.%${search}%,message.ilike.%${search}%`);
  }

  const { data: logs } = await query;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">System Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Activity and event logs across the platform.</p>
        </div>
      </div>

      {/* Filters */}
      <form className="card p-4 mb-6">
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

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
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
                    <td className="px-5 py-3.5 text-gray-500" title={message}>{truncated || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{log.ip_address ?? '—'}</td>
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
