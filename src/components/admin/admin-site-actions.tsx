'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Server, RefreshCw, CheckCircle } from 'lucide-react';

export function AdminSiteActions({
  siteId,
  wpCloudSiteId,
  userId,
  subscriptionId,
  status,
}: {
  siteId: string;
  wpCloudSiteId: string | null;
  userId: string;
  subscriptionId: string | null;
  status: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function handleProvision() {
    setLoading('provision');
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/provision-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Provisioning failed');
      setSuccess(data.warning ?? 'Site provisioned on wp.cloud');
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(null);
  }

  async function handleSyncStripe() {
    setLoading('sync');
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/sync-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Sync failed');
      setSuccess(`Synced: ${data.subscriptions ?? 0} subs, ${data.invoices ?? 0} invoices`);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(null);
  }

  return (
    <div className="space-y-4">
      {/* Provision on wp.cloud */}
      {!wpCloudSiteId && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleProvision}
            disabled={loading === 'provision'}
            className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-1.5"
          >
            {loading === 'provision' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
            Provision on wp.cloud
          </button>
          <span className="text-xs text-gray-400">Creates the WordPress site if webhook failed</span>
        </div>
      )}
      {wpCloudSiteId && (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <CheckCircle className="w-3.5 h-3.5" />
          wp.cloud site provisioned ({wpCloudSiteId})
        </div>
      )}

      {/* Sync Stripe data */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSyncStripe}
          disabled={loading === 'sync'}
          className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-1.5"
        >
          {loading === 'sync' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Sync Stripe Data
        </button>
        <span className="text-xs text-gray-400">Pull latest subscriptions, invoices, payment methods from Stripe</span>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
      {success && <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg p-2">{success}</p>}
    </div>
  );
}
