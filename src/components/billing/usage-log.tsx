'use client';

import { useState, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const SERVICE_LABELS: Record<string, string> = {
  wordpress: 'Hosting',
  ai_tokens: 'AI',
  manual: 'Adjustment',
};

const PAGE_SIZE = 20;

export function UsageLog() {
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/usage/history?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
      .then(r => r.json())
      .then(data => {
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && page === 0) return <div className="animate-pulse h-32 bg-gray-100 rounded" />;

  if (entries.length === 0 && page === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No usage recorded yet</p>
      </div>
    );
  }

  return (
    <div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Date</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Description</th>
            <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Type</th>
            <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Usage</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {entries.map((e: any) => (
            <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                {new Date(e.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="px-4 py-2.5 text-sm text-gray-700 max-w-[300px] truncate">{e.description}</td>
              <td className="px-4 py-2.5">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {SERVICE_LABELS[e.service_type] ?? e.service_type}
                </span>
              </td>
              <td className="px-4 py-2.5 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                +{Number(e.amount).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(page - 1)} disabled={page === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
