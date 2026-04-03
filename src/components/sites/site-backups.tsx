'use client';

import { useEffect, useState } from 'react';
import { Loader2, Download, RotateCcw, HardDrive, Plus } from 'lucide-react';

interface Backup {
  id: string;
  type: string;
  date: string;
  size?: string;
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
      // wp.cloud returns various formats — normalize
      const rawBackups = data?.backups ?? data?.data?.backups ?? (Array.isArray(data) ? data : []);
      if (Array.isArray(rawBackups)) {
        setBackups(rawBackups.map((b: any, i: number) => ({
          id: b.id ?? b.backup_id ?? b.name ?? String(i),
          type: b.type ?? b.backup_type ?? 'daily',
          date: b.date ?? b.created_at ?? b.timestamp ?? b.name ?? 'Unknown',
          size: b.size ?? b.file_size ?? null,
        })));
      }
    } catch { /* non-fatal */ }
    setLoading(false);
  }

  async function handleCreate() {
    setActionLoading('create');
    setMessage('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-backup', siteId, value: 'fs' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Backup started. It may take a few minutes to complete.');
        setTimeout(() => fetchBackups(), 10000);
      } else {
        setMessage(data.error ?? 'Failed to create backup');
      }
    } catch { setMessage('Connection error'); }
    setActionLoading(null);
  }

  async function handleDownload(backupId: string) {
    setActionLoading('download-' + backupId);
    setMessage('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download-backup', siteId, value: backupId }),
      });
      const data = await res.json();
      if (res.ok && data?.url) {
        window.open(data.url, '_blank');
      } else if (res.ok) {
        setMessage('Backup download link retrieved. Check your browser downloads.');
      } else {
        setMessage(data.error ?? 'Failed to get download link');
      }
    } catch { setMessage('Connection error'); }
    setActionLoading(null);
  }

  if (!wpCloudSiteId) {
    return <p className="text-sm text-gray-400">Backups available after site is provisioned.</p>;
  }

  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">Automatic daily backups included.</p>
        <button
          onClick={handleCreate}
          disabled={!!actionLoading}
          className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1"
        >
          {actionLoading === 'create' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Create Backup
        </button>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm mb-3 ${message.includes('fail') || message.includes('error') ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
          {message}
        </div>
      )}

      {backups.length === 0 ? (
        <div className="text-center py-6">
          <HardDrive className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No backups yet. Daily backups will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {backups.slice(0, 10).map(b => (
            <div key={b.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{b.date}</p>
                <p className="text-xs text-gray-500 capitalize">{b.type}{b.size ? ` · ${b.size}` : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(b.id)}
                  disabled={!!actionLoading}
                  className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                >
                  {actionLoading === 'download-' + b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
