'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface ResourceControlsProps {
  siteId: string;
  wpCloudSiteId: string;
  currentPlan: {
    max_php_workers: number;
    default_php_workers: number;
    php_memory_mb: number;
    slug: string;
  };
}

const PHP_MEMORY_OPTIONS = [512, 1024, 1536, 2048];

export function ResourceControls({
  siteId,
  wpCloudSiteId,
  currentPlan,
}: ResourceControlsProps) {
  const [phpWorkers, setPhpWorkers] = useState(
    currentPlan.default_php_workers,
  );
  const [bursting, setBursting] = useState(false);
  const [phpMemory, setPhpMemory] = useState(currentPlan.php_memory_mb);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function updateMeta(key: string, value: string | number) {
    setLoading(key);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(null);
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'update-meta',
            siteId: siteId,
            key,
            value: String(value),
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update');
      } else {
        setSuccess(`Updated ${key} successfully`);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(null);
    }
  }

  // Generate worker options: 1 through max
  const workerOptions = Array.from(
    { length: currentPlan.max_php_workers },
    (_, i) => i + 1,
  );

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Resources</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage PHP workers, memory, and bursting for this site
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {/* PHP Workers */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900">PHP Workers</p>
            <p className="text-xs text-gray-500">
              Concurrent PHP processes (max {currentPlan.max_php_workers} on{' '}
              {currentPlan.slug} plan)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={phpWorkers}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPhpWorkers(val);
                updateMeta('default_php_conns', val);
              }}
              disabled={loading === 'default_php_conns'}
              className="input-field w-24"
            >
              {workerOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {loading === 'default_php_conns' && (
              <span className="text-xs text-gray-400">Saving...</span>
            )}
          </div>
        </div>

        {/* Bursting */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              PHP Worker Bursting
            </p>
            <p className="text-xs text-gray-500">
              Allow temporary spikes beyond the PHP worker limit
            </p>
            <p className="text-xs text-amber-600 font-medium mt-1">
              $350 CAD/mo add-on
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !bursting;
                setBursting(next);
                updateMeta('burst_php_conns', next ? 1 : 0);
              }}
              disabled={loading === 'burst_php_conns'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                bursting ? 'bg-admin-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  bursting ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-gray-500">
              {bursting ? 'On' : 'Off'}
            </span>
            {loading === 'burst_php_conns' && (
              <span className="text-xs text-gray-400">Saving...</span>
            )}
          </div>
        </div>

        {/* PHP Memory */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900">
              PHP Memory Limit
            </p>
            <p className="text-xs text-gray-500">
              Maximum memory per PHP process
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={phpMemory}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPhpMemory(val);
                updateMeta('php_memory_limit', val);
              }}
              disabled={loading === 'php_memory_limit'}
              className="input-field w-32"
            >
              {PHP_MEMORY_OPTIONS.map((mb) => (
                <option key={mb} value={mb}>
                  {mb} MB
                </option>
              ))}
            </select>
            {loading === 'php_memory_limit' && (
              <span className="text-xs text-gray-400">Saving...</span>
            )}
          </div>
        </div>

        {/* Storage (read-only) */}
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Storage Quota</p>
            <p className="text-xs text-gray-500">
              Included with {currentPlan.slug} plan (read-only)
            </p>
          </div>
          <p className="text-sm font-medium text-gray-700">
            Contact support to adjust
          </p>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="px-5 py-3 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="px-5 py-3 bg-green-50 border-t border-green-100">
          <p className="text-xs text-green-600">{success}</p>
        </div>
      )}
    </div>
  );
}
