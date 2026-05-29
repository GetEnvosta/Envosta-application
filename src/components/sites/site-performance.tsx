'use client';

import { useState, useEffect } from 'react';
import { Loader2, Zap, Shield, Trash2 } from 'lucide-react';

export function SitePerformance({ siteId, domain }: { siteId: string; domain: string }) {
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);
  const [defensiveMode, setDefensiveMode] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!domain) { setLoading(false); return; }
    const post = (body: Record<string, unknown>) =>
      fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json());

    // Load edge cache + defensive mode status in parallel.
    Promise.all([
      post({ action: 'edge-cache', siteId, key: 'status', domain })
        .then(data => setCacheStatus(data?.enabled ? 'enabled' : data?.disabled ? 'disabled' : 'unknown'))
        .catch(() => {}),
      post({ action: 'defensive-mode', siteId, domain })
        .then(data => { if (typeof data?.enabled === 'boolean') setDefensiveMode(data.enabled); })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [siteId, domain]);

  async function siteAction(action: string, extra: Record<string, unknown> = {}) {
    setActionLoading(action);
    setMsg('');
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, siteId, domain, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error ?? 'Failed'); return; }
      return data;
    } catch { setMsg('Connection error'); }
    finally { setActionLoading(''); }
  }

  async function toggleCache() {
    const newState = cacheStatus === 'enabled' ? 'disable' : 'enable';
    const data = await siteAction('edge-cache', { key: newState });
    if (data) {
      setCacheStatus(newState === 'enable' ? 'enabled' : 'disabled');
      setMsg(`Edge cache ${newState}d`);
    }
  }

  async function purgeCache() {
    const data = await siteAction('edge-cache', { key: 'purge' });
    if (data) setMsg('Cache purged successfully');
  }

  async function toggleDefensive() {
    const newVal = defensiveMode ? 0 : -1; // -1 = indefinite, 0 = off
    const data = await siteAction('defensive-mode', { value: newVal });
    if (data) {
      setDefensiveMode(!defensiveMode);
      setMsg(defensiveMode ? 'Defensive mode disabled' : 'Defensive mode enabled');
    }
  }

  if (!domain) return <p className="text-sm text-gray-400">Connect a domain to manage caching.</p>;

  return (
    <div>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading cache status...
        </div>
      ) : (
        <div className="space-y-3">
          {/* Edge Cache */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Edge Cache</p>
                <p className="text-xs text-gray-500">Global CDN caching for faster page loads</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleCache}
                disabled={!!actionLoading}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0"
                style={{ background: cacheStatus === 'enabled' ? '#22c55e' : '#d1d5db', opacity: actionLoading ? 0.5 : 1 }}
              >
                <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                  style={{ transform: cacheStatus === 'enabled' ? 'translateX(17px)' : 'translateX(3px)' }} />
              </button>
            </div>
          </div>

          {/* Purge Cache */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Purge Cache</p>
                <p className="text-xs text-gray-500">Clear all cached pages to see latest changes</p>
              </div>
            </div>
            <button onClick={purgeCache} disabled={!!actionLoading} className="btn-secondary text-xs py-1.5 px-3">
              {actionLoading === 'edge-cache' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Purge'}
            </button>
          </div>

          {/* Defensive Mode */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Shield className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Defensive Mode</p>
                <p className="text-xs text-gray-500">Extra DDoS protection — may add challenge pages for visitors</p>
              </div>
            </div>
            <button
              onClick={toggleDefensive}
              disabled={!!actionLoading}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0"
              style={{ background: defensiveMode ? '#f59e0b' : '#d1d5db', opacity: actionLoading ? 0.5 : 1 }}
            >
              <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                style={{ transform: defensiveMode ? 'translateX(17px)' : 'translateX(3px)' }} />
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p className={`text-xs mt-3 ${msg.includes('fail') || msg.includes('error') ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
      )}
    </div>
  );
}
