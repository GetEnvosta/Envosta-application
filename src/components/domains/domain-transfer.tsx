'use client';

import { useState, useEffect } from 'react';
import { Loader2, Lock, Unlock, Copy, Check, AlertTriangle } from 'lucide-react';

export function DomainTransfer({ domainName }: { domainName: string }) {
  const [locked, setLocked] = useState<boolean | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [eppCode, setEppCode] = useState<string | null>(null);
  const [eppLoading, setEppLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [statusLoading, setStatusLoading] = useState(true);

  // Fetch lock status on mount
  useEffect(() => {
    async function fetchLockStatus() {
      try {
        const res = await fetch('/api/domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-lock-status', domainName }),
        });
        const data = await res.json();
        if (res.ok) {
          setLocked(data.locked);
        }
      } catch { /* ignore */ }
      setStatusLoading(false);
    }
    fetchLockStatus();
  }, [domainName]);

  async function toggleLock() {
    if (locked === null) return;
    const newValue = !locked;
    setLockLoading(true);
    setError('');

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-lock', domainName, locked: newValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to update lock');
        setLockLoading(false);
        return;
      }
      setLocked(newValue);
      // Clear EPP code when re-locking (transfers blocked)
      if (newValue) setEppCode(null);
    } catch {
      setError('Connection error');
    }
    setLockLoading(false);
  }

  async function fetchEppCode() {
    setEppLoading(true);
    setError('');

    try {
      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-epp-code', domainName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to get EPP code');
        setEppLoading(false);
        return;
      }
      setEppCode(data.eppCode);
    } catch {
      setError('Connection error');
    }
    setEppLoading(false);
  }

  function copyCode() {
    if (!eppCode) return;
    navigator.clipboard.writeText(eppCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Domain Lock & Transfer</h2>
      <p className="text-sm text-gray-500 mb-4">
        Manage the transfer lock and get your EPP authorization code to transfer this domain to another registrar.
      </p>

      {/* Domain Lock */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {locked ? (
            <Lock className="w-4 h-4 text-green-600" />
          ) : (
            <Unlock className="w-4 h-4 text-amber-500" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">Transfer Lock</p>
            <p className="text-xs text-gray-500">
              {statusLoading
                ? 'Checking lock status...'
                : locked
                  ? 'Domain is locked — transfers are blocked.'
                  : 'Domain is unlocked — transfers are allowed.'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleLock}
          disabled={lockLoading || statusLoading || locked === null}
          className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
          style={{
            background: locked ? '#22c55e' : '#f59e0b',
            opacity: lockLoading || statusLoading ? 0.5 : 1,
          }}
        >
          {lockLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-white absolute left-1/2 -translate-x-1/2" />
          ) : (
            <span
              className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
              style={{ transform: locked ? 'translateX(22px)' : 'translateX(4px)' }}
            />
          )}
        </button>
      </div>

      {/* EPP Code */}
      <div className="py-3">
        <p className="text-sm font-medium text-gray-900 mb-1">EPP Authorization Code</p>
        <p className="text-xs text-gray-500 mb-3">
          You need this code to transfer your domain to another registrar. The domain must be unlocked first.
        </p>

        {eppCode ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 font-mono text-sm text-gray-900 select-all">
              {eppCode}
            </div>
            <button
              onClick={copyCode}
              className="btn-secondary text-xs py-2.5 px-3"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <button
            onClick={fetchEppCode}
            disabled={eppLoading || locked === true}
            className="btn-secondary text-sm"
          >
            {eppLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Retrieving...
              </>
            ) : locked ? (
              'Unlock domain first'
            ) : (
              'Get EPP Code'
            )}
          </button>
        )}

        {locked === false && !eppCode && !eppLoading && (
          <div className="flex items-start gap-2 mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              Your domain is currently unlocked. If you are not transferring, re-enable the transfer lock to protect your domain.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">{error}</div>
      )}
    </div>
  );
}
