'use client';

import { useEffect, useState } from 'react';
import { Loader2, Lock, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';

export function SslStatus({ siteId, domain }: { siteId: string; domain: string | null }) {
  const [ssl, setSsl] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!domain) { setLoading(false); return; }
    fetchSsl();
  }, [domain]);

  async function fetchSsl() {
    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ssl-info', siteId, domain }),
      });
      const data = await res.json();
      if (res.ok) setSsl(data);
    } catch { /* non-fatal */ }
    setLoading(false);
  }

  async function handleRetry() {
    setRetrying(true);
    setError('');
    try {
      // ssl-retry endpoint
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ssl-info', siteId, domain }),
      });
      const data = await res.json();
      if (res.ok) setSsl(data);
    } catch {
      setError('Failed to refresh');
    }
    setRetrying(false);
  }

  if (!domain) {
    return (
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-gray-400" />
        <p className="text-sm text-gray-500">Connect a domain to provision SSL.</p>
      </div>
    );
  }

  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;

  // wp.cloud ssl-info response: { data: { certificate_expiration_date, force_ssl, ca_provider, ... } }
  const sslData = ssl?.data ?? ssl;
  const certExpiry = sslData?.certificate_expiration_date ?? sslData?.not_after ?? sslData?.expiry ?? null;
  const isActive = !!(certExpiry && new Date(certExpiry) > new Date()) || sslData?.force_ssl === '1' || !!sslData?.ssl_certificate_id;
  const expiry = certExpiry;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <div>
                <p className="text-sm text-gray-900 font-medium">SSL active</p>
                <p className="text-xs text-gray-500">
                  {sslData?.ca_provider === 'letsencrypt' ? "Let's Encrypt" : sslData?.ca_provider ?? 'Certificate'}
                  {expiry ? ` — expires ${new Date(expiry).toLocaleDateString()}, auto-renews` : ''}
                </p>
              </div>
            </>
          ) : ssl ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <div>
                <p className="text-sm text-amber-700 font-medium">SSL provisioning</p>
                <p className="text-xs text-gray-500">Certificate is being issued. This usually takes a few minutes.</p>
              </div>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <Lock className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">SSL status unknown</p>
            </>
          )}
        </div>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
