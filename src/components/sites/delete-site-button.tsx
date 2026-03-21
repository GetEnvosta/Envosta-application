'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import Modal from '@/components/ui/modal';

export function DeleteSiteButton({ serviceId, siteName, redirectTo = '/dashboard/sites' }: {
  serviceId: string;
  siteName: string;
  redirectTo?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); setLoading(false); return; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ action: 'delete-site', siteId: serviceId }),
        }
      );

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
        Delete Site
      </button>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Delete Site">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{siteName}</strong>? This will:
          </p>
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            <li>Permanently delete the WordPress site and all its data</li>
            <li>Remove the site from wp.cloud</li>
            <li>Disconnect any linked domains</li>
            <li>This action cannot be undone</li>
          </ul>

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
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...</>
              ) : (
                'Yes, Delete Site'
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
