'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface HealthStatus {
  name: string;
  status: 'checking' | 'healthy' | 'degraded' | 'down';
  latency?: number;
  detail?: string;
}

export function SystemHealthChecks() {
  const [checks, setChecks] = useState<HealthStatus[]>([
    { name: 'Supabase', status: 'checking' },
    { name: 'Stripe', status: 'checking' },
    { name: 'wp.cloud Proxy', status: 'checking' },
    { name: 'Edge Functions', status: 'checking' },
    { name: 'Vercel (App)', status: 'checking' },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  function updateCheck(name: string, update: Partial<HealthStatus>) {
    setChecks(prev => prev.map(c => c.name === name ? { ...c, ...update } : c));
  }

  async function runChecks() {
    setChecks(prev => prev.map(c => ({ ...c, status: 'checking' as const })));

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
      // 400 = "Unknown sync type" which means Stripe connected fine, auth passed
      updateCheck('Stripe', res.status === 400 || res.ok
        ? { status: 'healthy', latency: Date.now() - t2 }
        : { status: 'degraded', detail: `HTTP ${res.status}`, latency: Date.now() - t2 }
      );
    } catch (e: any) {
      updateCheck('Stripe', { status: 'down', detail: e.message, latency: Date.now() - t2 });
    }

    // wp.cloud proxy + Edge Functions — check via site-info datacenters action (uses auth session)
    const t3 = Date.now();
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ action: 'datacenters' }),
        });
        const data = await res.json();
        const lat = Date.now() - t3;
        if (res.ok) {
          updateCheck('wp.cloud Proxy', { status: 'healthy', latency: lat, detail: `${data.datacenters?.length ?? 0} DCs` });
          updateCheck('Edge Functions', { status: 'healthy', latency: lat });
        } else {
          updateCheck('wp.cloud Proxy', { status: 'degraded', detail: data.error ?? `HTTP ${res.status}`, latency: lat });
          updateCheck('Edge Functions', { status: 'degraded', detail: `HTTP ${res.status}`, latency: lat });
        }
      } else {
        // Try without auth — just ping the function to see if edge functions are up
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-domain`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
          body: JSON.stringify({ action: 'check', domainName: 'test.com' }),
        });
        const lat = Date.now() - t3;
        updateCheck('Edge Functions', { status: res.ok || res.status < 500 ? 'healthy' : 'down', latency: lat });
        updateCheck('wp.cloud Proxy', { status: 'degraded', detail: 'No session — proxy not tested', latency: lat });
      }
    } catch (e: any) {
      const lat = Date.now() - t3;
      updateCheck('wp.cloud Proxy', { status: 'down', detail: e.message, latency: lat });
      updateCheck('Edge Functions', { status: 'down', detail: e.message, latency: lat });
    }

    // Vercel — just check if we can reach our own API
    const t5 = Date.now();
    try {
      const res = await fetch('/api/domain-check?health=1');
      updateCheck('Vercel (App)', res.status !== 500
        ? { status: 'healthy', latency: Date.now() - t5 }
        : { status: 'down', detail: `HTTP ${res.status}`, latency: Date.now() - t5 }
      );
    } catch (e: any) {
      updateCheck('Vercel (App)', { status: 'down', detail: e.message, latency: Date.now() - t5 });
    }

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

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Service Status</h2>
        <button onClick={runChecks} className="btn-admin-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Recheck
        </button>
      </div>
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
      {lastChecked && (
        <p className="text-xs text-gray-400 mt-2">Last checked: {lastChecked.toLocaleTimeString()}</p>
      )}
    </div>
  );
}
