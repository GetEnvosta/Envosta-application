'use client';

import { useState, useEffect } from 'react';
import { Loader2, Lock, Unlock, Copy, Check, AlertTriangle, RefreshCw, Eye, EyeOff, ChevronDown } from 'lucide-react';

function Toggle({ enabled, loading, color, onToggle }: {
  enabled: boolean;
  loading: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0"
      style={{ background: enabled ? color : '#d1d5db', opacity: loading ? 0.5 : 1 }}
    >
      {loading ? (
        <Loader2 className="w-2.5 h-2.5 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
      ) : (
        <span
          className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
          style={{ transform: enabled ? 'translateX(17px)' : 'translateX(3px)' }}
        />
      )}
    </button>
  );
}

export function DomainSettings({ domainName, initialAutoRenew, initialWhoisPrivacy, expiresAt }: {
  domainName: string;
  initialAutoRenew: boolean;
  initialWhoisPrivacy: boolean;
  expiresAt?: string | null;
}) {
  // Auto-renew
  const [autoRenew, setAutoRenew] = useState(initialAutoRenew);
  const [arLoading, setArLoading] = useState(false);

  // WHOIS privacy
  const [whois, setWhois] = useState(initialWhoisPrivacy);
  const [wpLoading, setWpLoading] = useState(false);

  // Transfer lock
  const [locked, setLocked] = useState<boolean | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockFetching, setLockFetching] = useState(true);

  // EPP code
  const [showTransfer, setShowTransfer] = useState(false);
  const [eppCode, setEppCode] = useState<string | null>(null);
  const [eppLoading, setEppLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [error, setError] = useState('');

  // Fetch lock status on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-lock-status', domainName }),
        });
        const data = await res.json();
        if (res.ok) setLocked(data.locked);
      } catch { /* ignore */ }
      setLockFetching(false);
    })();
  }, [domainName]);

  async function apiCall(body: any): Promise<any> {
    setError('');
    const res = await fetch('/api/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Request failed');
    return data;
  }

  async function toggleAutoRenew() {
    setArLoading(true);
    try {
      await apiCall({ action: 'set-auto-renew', domainName, autoRenew: !autoRenew });
      setAutoRenew(!autoRenew);
    } catch (e: any) { setError(e.message); }
    setArLoading(false);
  }

  async function toggleWhois() {
    setWpLoading(true);
    try {
      await apiCall({ action: 'set-whois-privacy', domainName, enabled: !whois });
      setWhois(!whois);
    } catch (e: any) { setError(e.message); }
    setWpLoading(false);
  }

  async function toggleLock() {
    if (locked === null) return;
    setLockLoading(true);
    try {
      await apiCall({ action: 'set-lock', domainName, locked: !locked });
      setLocked(!locked);
      if (!locked) setEppCode(null); // re-locking clears EPP
    } catch (e: any) { setError(e.message); }
    setLockLoading(false);
  }

  async function fetchEppCode() {
    setEppLoading(true);
    setError('');
    try {
      const data = await apiCall({ action: 'get-epp-code', domainName });
      setEppCode(data.eppCode);
    } catch (e: any) { setError(e.message); }
    setEppLoading(false);
  }

  function copyCode() {
    if (!eppCode) return;
    navigator.clipboard.writeText(eppCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-5">
      {/* Quick settings row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Auto-Renew */}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3.5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <RefreshCw className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900">Auto-Renew</p>
              <p className="text-[11px] text-gray-500 truncate">
                {autoRenew ? 'Enabled' : expiresAt ? `Expires ${new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Disabled'}
              </p>
            </div>
          </div>
          <Toggle enabled={autoRenew} loading={arLoading} color="#22c55e" onToggle={toggleAutoRenew} />
        </div>

        {/* WHOIS Privacy */}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3.5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {whois ? <EyeOff className="w-4 h-4 text-gray-400 shrink-0" /> : <Eye className="w-4 h-4 text-gray-400 shrink-0" />}
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900">WHOIS Privacy</p>
              <p className="text-[11px] text-gray-500 truncate">{whois ? 'Protected' : 'Visible'}</p>
            </div>
          </div>
          <Toggle enabled={whois} loading={wpLoading} color="#2563eb" onToggle={toggleWhois} />
        </div>

        {/* Transfer Lock */}
        <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3.5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {locked ? <Lock className="w-4 h-4 text-gray-400 shrink-0" /> : <Unlock className="w-4 h-4 text-gray-400 shrink-0" />}
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900">Transfer Lock</p>
              <p className="text-[11px] text-gray-500 truncate">
                {lockFetching ? 'Loading...' : locked ? 'Locked' : 'Unlocked'}
              </p>
            </div>
          </div>
          <Toggle
            enabled={locked ?? true}
            loading={lockLoading || lockFetching}
            color="#22c55e"
            onToggle={toggleLock}
          />
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</div>
      )}

      {/* Transfer / EPP code expandable section */}
      <div className="mt-3">
        <button
          onClick={() => setShowTransfer(!showTransfer)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTransfer ? 'rotate-180' : ''}`} />
          Transfer domain to another registrar
        </button>

        {showTransfer && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-3">
              To transfer your domain, unlock the transfer lock above, then get your EPP code below.
            </p>

            {eppCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 font-mono text-sm text-gray-900 select-all">
                  {eppCode}
                </div>
                <button onClick={copyCode} className="btn-secondary text-xs py-2 px-2.5">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <button
                onClick={fetchEppCode}
                disabled={eppLoading || locked === true}
                className="btn-secondary text-xs"
              >
                {eppLoading ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Retrieving...</>
                ) : locked ? (
                  'Unlock domain first'
                ) : (
                  'Get EPP Code'
                )}
              </button>
            )}

            {locked === false && !eppCode && !eppLoading && (
              <div className="flex items-start gap-2 mt-3 rounded-lg bg-amber-50 border border-amber-200 p-2.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-700">
                  Domain is unlocked. Re-enable the lock if you are not transferring.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
