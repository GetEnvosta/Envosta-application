'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, RefreshCw, Server, Globe, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface HealthStatus {
  name: string;
  status: 'checking' | 'healthy' | 'degraded' | 'down';
  latency?: number;
  detail?: string;
}

interface SyncResult {
  checkedAt: string;
  wpcloud: { apiCount: number; dbCount: number; matched: number; inApiNotDb: string[]; inDbNotApi: string[]; sitesNoUser: string[]; error?: string };
  domains: { total: number; noUser: string[]; orphanedUser: string[] };
}

export function SystemHealthChecks() {
  const [checks, setChecks] = useState<HealthStatus[]>([
    { name: 'Supabase', status: 'checking' },
    { name: 'Stripe', status: 'checking' },
    { name: 'wp.cloud Proxy', status: 'checking' },
    { name: 'Edge Functions', status: 'checking' },
    { name: 'OpenSRS', status: 'checking' },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  function updateCheck(name: string, update: Partial<HealthStatus>) {
    setChecks(prev => prev.map(c => c.name === name ? { ...c, ...update } : c));
  }

  async function runChecks() {
    setChecks(prev => prev.map(c => ({ ...c, status: 'checking' as const })));
    setSyncLoading(true);

    // Supabase — query products table
    const t1 = Date.now();
    try {
      const supabase = createClient();
      const { error } = await supabase.from('products').select('id').limit(1);
      updateCheck('Supabase', error
        ? { status: 'down', detail: error.message, latency: Date.now() - t1 }
        : { status: 'healthy', latency: Date.now() - t1 }
      );
    } catch (e: any) {
      updateCheck('Supabase', { status: 'down', detail: e.message, latency: Date.now() - t1 });
    }

    // Stripe — hit /api/admin/sync-stripe with a noop
    const t2 = Date.now();
    try {
      const res = await fetch('/api/admin/sync-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'health_check' }),
      });
      updateCheck('Stripe', res.status === 400 || res.ok
        ? { status: 'healthy', latency: Date.now() - t2 }
        : { status: 'degraded', detail: `HTTP ${res.status}`, latency: Date.now() - t2 }
      );
    } catch (e: any) {
      updateCheck('Stripe', { status: 'down', detail: e.message, latency: Date.now() - t2 });
    }

    // wp.cloud Proxy — test via our own API route
    const t3 = Date.now();
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'datacenters', siteId: 'health-check' }),
      });
      const data = await res.json();
      const lat = Date.now() - t3;
      if (res.ok && data.datacenters) {
        updateCheck('Edge Functions', { status: 'healthy', latency: lat });
        if (data.proxyOk) {
          updateCheck('wp.cloud Proxy', { status: 'healthy', latency: lat, detail: `${data.datacenters?.length ?? 0} DCs` });
        } else {
          updateCheck('wp.cloud Proxy', { status: 'down', detail: 'Proxy unreachable', latency: lat });
        }
      } else if (res.status < 500) {
        updateCheck('Edge Functions', { status: 'healthy', latency: lat });
        updateCheck('wp.cloud Proxy', { status: 'degraded', detail: data.error ?? `HTTP ${res.status}`, latency: lat });
      } else {
        updateCheck('wp.cloud Proxy', { status: 'down', detail: data.error ?? `HTTP ${res.status}`, latency: lat });
        updateCheck('Edge Functions', { status: 'down', detail: `HTTP ${res.status}`, latency: lat });
      }
    } catch (e: any) {
      const lat = Date.now() - t3;
      updateCheck('wp.cloud Proxy', { status: 'down', detail: e.message, latency: lat });
      updateCheck('Edge Functions', { status: 'down', detail: e.message, latency: lat });
    }

    // OpenSRS — domain availability check via our API route
    const t5 = Date.now();
    try {
      const res = await fetch('/api/domain-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: 'envosta.com' }),
      });
      const data = await res.json();
      const lat = Date.now() - t5;
      if (res.ok && data.domain) {
        updateCheck('OpenSRS', { status: 'healthy', latency: lat, detail: 'Domain lookup OK' });
      } else {
        updateCheck('OpenSRS', { status: 'degraded', detail: data.error ?? `HTTP ${res.status}`, latency: lat });
      }
    } catch (e: any) {
      updateCheck('OpenSRS', { status: 'down', detail: e.message, latency: Date.now() - t5 });
    }

    // Sync check — compare wp.cloud + domains against DB
    try {
      const syncRes = await fetch('/api/admin/sync-check', { method: 'POST' });
      if (syncRes.ok) {
        const data = await syncRes.json();
        setSyncResult(data);
      }
    } catch { /* non-fatal */ }

    setSyncLoading(false);
    setLastChecked(new Date());
  }

  useEffect(() => { runChecks(); }, []);

  const statusIcon = (s: HealthStatus['status']) => {
    switch (s) {
      case 'checking': return <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />;
      case 'healthy': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'degraded': return <XCircle className="w-4 h-4 text-amber-500" />;
      case 'down': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const statusColor = (s: HealthStatus['status']) => {
    switch (s) {
      case 'checking': return 'text-gray-400';
      case 'healthy': return 'text-emerald-600';
      case 'degraded': return 'text-amber-600';
      case 'down': return 'text-red-600';
    }
  };

  const syncIssues = syncResult
    ? syncResult.wpcloud.inApiNotDb.length + syncResult.wpcloud.inDbNotApi.length +
      syncResult.wpcloud.sitesNoUser.length + syncResult.domains.noUser.length +
      syncResult.domains.orphanedUser.length
    : 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Service Status</h2>
        <button onClick={runChecks} disabled={syncLoading} className="btn-admin-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          {syncLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {syncLoading ? 'Checking...' : 'Recheck All'}
        </button>
      </div>

      {/* Service health cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {checks.map(c => (
          <div key={c.name} className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              {statusIcon(c.status)}
              <span className="text-sm font-medium text-gray-900">{c.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium capitalize ${statusColor(c.status)}`}>{c.status}</span>
              {c.latency !== undefined && (
                <span className="text-xs text-gray-400">{c.latency}ms</span>
              )}
            </div>
            {c.detail && c.status !== 'healthy' && (
              <p className="text-xs text-gray-400 mt-1 truncate" title={c.detail}>{c.detail}</p>
            )}
          </div>
        ))}
      </div>

      {/* Sync results */}
      {syncResult && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* wp.cloud sync */}
          <div className={`rounded-xl border px-4 py-3 ${syncResult.wpcloud.inApiNotDb.length + syncResult.wpcloud.inDbNotApi.length > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-900">wp.cloud Sites</span>
              <span className="text-[10px] text-gray-400 ml-auto">
                {syncResult.wpcloud.apiCount} in API · {syncResult.wpcloud.dbCount} in DB · {syncResult.wpcloud.matched} matched
              </span>
            </div>
            {syncResult.wpcloud.inApiNotDb.length > 0 && (
              <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 shrink-0" /> {syncResult.wpcloud.inApiNotDb.length} in wp.cloud but not in DB
              </p>
            )}
            {syncResult.wpcloud.inDbNotApi.length > 0 && (
              <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 shrink-0" /> {syncResult.wpcloud.inDbNotApi.length} in DB but not in wp.cloud
              </p>
            )}
            {syncResult.wpcloud.inApiNotDb.length === 0 && syncResult.wpcloud.inDbNotApi.length === 0 && (
              <p className="text-xs text-emerald-700 flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3" /> All synced
              </p>
            )}
            {syncResult.wpcloud.error && (
              <p className="text-xs text-gray-400 mt-1 truncate" title={syncResult.wpcloud.error}>
                {syncResult.wpcloud.error}
              </p>
            )}
          </div>

          {/* Domains sync */}
          <div className={`rounded-xl border px-4 py-3 ${syncResult.domains.noUser.length + syncResult.domains.orphanedUser.length > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-900">Domains</span>
              <span className="text-[10px] text-gray-400 ml-auto">{syncResult.domains.total} total</span>
            </div>
            {syncResult.domains.noUser.length > 0 && (
              <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 shrink-0" /> {syncResult.domains.noUser.length} with no customer
              </p>
            )}
            {syncResult.domains.orphanedUser.length > 0 && (
              <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 shrink-0" /> {syncResult.domains.orphanedUser.length} with deleted customer
              </p>
            )}
            {syncResult.domains.noUser.length === 0 && syncResult.domains.orphanedUser.length === 0 && (
              <p className="text-xs text-emerald-700 flex items-center gap-1 mt-1">
                <CheckCircle className="w-3 h-3" /> All domains have valid customers
              </p>
            )}
          </div>
        </div>
      )}

      {lastChecked && (
        <p className="text-xs text-gray-400 mt-2">Last checked: {lastChecked.toLocaleTimeString()}</p>
      )}
    </div>
  );
}
