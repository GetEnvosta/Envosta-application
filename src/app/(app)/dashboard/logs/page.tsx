import { getUserLogs } from '@/services/admin';
import { formatDateTime } from '@/lib/utils';

const levelStyles: Record<string, string> = {
  info: 'text-blue-600 bg-blue-50',
  warn: 'text-amber-600 bg-amber-50',
  error: 'text-red-600 bg-red-50',
  debug: 'text-gray-600 bg-gray-100',
};

export default async function LogsPage() {
  const logs = await getUserLogs(50);

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-1">Activity</h1>
      <p className="text-sm text-gray-500 mb-6">Recent actions on your account</p>

      <div className="card overflow-hidden">
        {(!logs || logs.length === 0) ? (
          <div className="p-12 text-center text-sm text-gray-400">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((l: any) => (
              <div key={l.id} className="px-5 py-3.5 flex items-start gap-3">
                <span className={`text-[10px] font-mono font-medium uppercase px-1.5 py-0.5 rounded ${levelStyles[l.level] ?? levelStyles.info}`}>
                  {l.level}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-mono text-xs text-gray-500">{l.action}</span>
                    {l.message && <span className="ml-2 text-gray-600">{l.message}</span>}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{formatDateTime(l.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
