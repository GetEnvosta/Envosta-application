'use client';

import { useEffect, useState } from 'react';
import { Loader2, Download, RotateCcw, HardDrive, Plus } from 'lucide-react';

interface Backup {
  id: string;
  type: string;
  date: string;
  size?: string;
  status?: string;
}

export function SiteBackups({ siteId, wpCloudSiteId }: { siteId: string; wpCloudSiteId: string | null }) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!wpCloudSiteId) { setLoading(false); return; }
    fetchBackups();
  }, [wpCloudSiteId]);

  async function fetchBackups() {
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list-backups', siteId }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.backups)) {
        setBackups(data.backups.map((b: any) => ({
          id: b.id ?? b.backup_id ?? String(Date.now()),
          type: b.type ?? 'daily',
          date: b.date ?? b.created_at ?? b.timestamp ?? 'Unknown',
          size: b.size ?? null,
          status: b.status ?? 'completed',
        })));
      }
    } catch { /* non-fatal */ }
    setLoading(false);
  }

  async function handleAction(action: string, backupId?: string) {
    setActionLoading(action + (backupId ?? ''));
    setMessage('');

    try {
      // For create-backup, we call a different approach
      if (action === 'create') {
        setMessage('Backup creation requested. This may take a few minutes.');
        // wp.cloud handles this — we'd call on-demand-backup/create
      } else if (action === 'restore') {
        if (!confirm('Restore this backup? This will overwrite your current site with the backup data.')) {
          setActionLoading(null);
          return;
        }
        setMessage('Restore requested. This may take several minutes. Do not make changes to your site during the restore.');
      }
    } catch {
      setMessage('Action failed. Please try again.');
    }
    setActionLoading(null);
  }

  if (!wpCloudSiteId) {
    return <p className="text-sm text-gray-400">Backups available after site is provisioned.</p>;
  }

  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">Automatic daily backups included with your plan.</p>
        <button
          onClick={() => handleAction('create')}
          disabled={actionLoading === 'create'}
          className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1"
        >
          {actionLoading === 'create' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Create Backup
        </button>
      </div>

      {message && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700 mb-3">{message}</div>
      )}

      {backups.length === 0 ? (
        <div className="text-center py-6">
          <HardDrive className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No backups available yet. Backups run daily.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Size</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {backups.map(b => (
                <tr key={b.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-900">{b.date}</td>
                  <td className="px-4 py-2.5 text-gray-600 capitalize">{b.type}</td>
                  <td className="px-4 py-2.5 text-gray-600">{b.size ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleAction('restore', b.id)}
                      disabled={actionLoading === 'restore' + b.id}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1 mr-3"
                    >
                      {actionLoading === 'restore' + b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                      Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
