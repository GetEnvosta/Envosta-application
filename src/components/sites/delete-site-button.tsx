'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import Modal from '@/components/ui/modal';

/**
 * Customer delete: soft-delete (cancels billing, hides from dashboard, wp.cloud site kept 30 days)
 * Admin delete: hard-delete (permanently removes from wp.cloud, no recovery)
 */
export function DeleteSiteButton({ siteId, siteName, redirectTo = '/dashboard/sites', isAdmin = false }: {
  siteId: string;
  siteName: string;
  redirectTo?: string;
  isAdmin?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  const action = isAdmin ? 'hard-delete-site' : 'delete-site';

  async function handleDelete() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/delete-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, siteId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Delete failed');
        setLoading(false);
        return;
      }

      setShowModal(false);
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-danger text-sm py-2 px-4 inline-flex items-center gap-1.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
        {isAdmin ? 'Permanently Delete' : 'Cancel & Delete Site'}
      </button>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isAdmin ? 'Permanently Delete Site' : 'Cancel Site'}>
        <div className="space-y-4">
          {isAdmin ? (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">This is permanent and cannot be undone.</p>
                <p className="text-sm text-red-700 mt-1">This will permanently delete <strong>{siteName}</strong> from wp.cloud. All files, database, and backups will be destroyed.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Are you sure you want to cancel <strong>{siteName}</strong>?
              </p>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Your subscription will be cancelled immediately</li>
                <li>The site will be removed from your dashboard</li>
                <li>Your site data is preserved for 30 days in case you change your mind</li>
                <li>Contact support within 30 days to restore your site</li>
              </ul>
            </>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="btn-danger text-sm py-2 px-4 inline-flex items-center gap-1.5"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {isAdmin ? 'Deleting...' : 'Cancelling...'}</>
              ) : (
                isAdmin ? 'Yes, Permanently Delete' : 'Yes, Cancel Site'
              )}
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="btn-secondary text-sm py-2 px-4"
            >
              Keep Site
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
