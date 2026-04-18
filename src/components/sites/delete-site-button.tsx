'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2, AlertTriangle, RotateCcw } from 'lucide-react';
import Modal from '@/components/ui/modal';

/**
 * Customer delete: removes the site's line item from their subscription.
 *   - If it's the last site, the entire subscription gets cancelled.
 *   - wp.cloud site is preserved for 30 days (recovery window).
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
        {isAdmin ? 'Permanently Delete' : 'Delete Site'}
      </button>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={isAdmin ? 'Permanently Delete Site' : 'Delete Site'}>
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
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">This will remove the site from your subscription.</p>
                <p className="text-sm text-red-700 mt-1">
                  <strong>{siteName}</strong> will be removed from your billing immediately. Your other sites are not affected.
                </p>
                <p className="text-sm text-red-700 mt-2">
                  You have <strong>30 days</strong> to reactivate this site before it&apos;s permanently deleted.
                </p>
              </div>
            </div>
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
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {isAdmin ? 'Deleting...' : 'Removing...'}</>
              ) : (
                isAdmin ? 'Yes, Permanently Delete' : 'Yes, Delete Site'
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

/**
 * Reactivate a cancelled site — re-adds it as a line item on the subscription.
 * Only shown during the 30-day recovery window.
 */
export function ReactivateSiteButton({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  async function handleReactivate() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/reactivate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error ?? 'Reactivation failed');
        setLoading(false);
        return;
      }

      setShowModal(false);
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
        className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Reactivate Site
      </button>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Reactivate Site">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <RotateCcw className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Reactivate {siteName}?</p>
              <p className="text-sm text-blue-700 mt-1">
                This will add <strong>{siteName}</strong> back to your subscription. Billing will resume immediately at your previous plan rate.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleReactivate}
              disabled={loading}
              className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reactivating...</>
              ) : (
                'Yes, Reactivate & Resume Billing'
              )}
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="btn-secondary text-sm py-2 px-4"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
