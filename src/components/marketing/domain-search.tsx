'use client';

import { useState } from 'react';
import { Search, Loader2, CheckCircle, XCircle } from 'lucide-react';

export function DomainSearch() {
  const [query, setQuery] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ domain: string; available: boolean } | null>(null);
  const [error, setError] = useState('');

  async function handleSearch() {
    const domain = query.trim().toLowerCase();
    if (!domain) return;

    // Add .com if no TLD provided
    const fullDomain = domain.includes('.') ? domain : `${domain}.com`;

    setChecking(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch('/api/domain-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: fullDomain }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ domain: fullDomain, available: data.available });
      } else {
        setError(data.error ?? 'Could not check availability');
      }
    } catch {
      setError('Connection error. Please try again.');
    }

    setChecking(false);
  }

  function handleRegister() {
    if (!result) return;
    // Send to login with redirect to domain registration in dashboard
    window.location.href = `https://my.envosta.com/auth/login?redirect=${encodeURIComponent(`/dashboard/domains/register?domain=${result.domain}`)}`;
  }

  return (
    <>
      <div className="dom-search">
        <input
          type="text"
          placeholder="Search for a domain name..."
          value={query}
          onChange={e => { setQuery(e.target.value); setResult(null); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        />
        <button
          onClick={handleSearch}
          disabled={checking || !query.trim()}
          className="bp lg"
          style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: checking || !query.trim() ? 0.6 : 1 }}
        >
          {checking ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : <Search style={{ width: 18, height: 18 }} />}
          Search
        </button>
      </div>

      {/* Results */}
      {result && (
        <div style={{
          maxWidth: 560,
          margin: '20px auto 0',
          padding: '16px 24px',
          borderRadius: 14,
          border: `1px solid ${result.available ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.2)'}`,
          background: result.available ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {result.available
              ? <CheckCircle style={{ width: 20, height: 20, color: '#22c55e', flexShrink: 0 }} />
              : <XCircle style={{ width: 20, height: 20, color: '#ef4444', flexShrink: 0 }} />
            }
            <div>
              <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '.95rem' }}>{result.domain}</span>
              <span style={{ color: result.available ? '#22c55e' : '#ef4444', fontSize: '.85rem', marginLeft: 10 }}>
                {result.available ? 'is available!' : 'is taken'}
              </span>
            </div>
          </div>
          {result.available && (
            <button
              onClick={handleRegister}
              className="bp"
              style={{ fontSize: '.82rem', padding: '10px 20px' }}
            >
              Log in to register
            </button>
          )}
        </div>
      )}

      {error && (
        <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '.85rem', marginTop: 16 }}>{error}</p>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
