'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, XCircle, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

const ALT_TLDS = ['net', 'ca', 'org', 'dev'];
const SUGGEST_PREFIXES = ['get', 'try', 'my', 'the', 'go'];

interface DomainResult {
  domain: string;
  available: boolean;
  price?: number; // cents CAD
}

export function DomainSearch() {
  const [query, setQuery] = useState('');
  const [checking, setChecking] = useState(false);
  const [primaryResult, setPrimaryResult] = useState<DomainResult | null>(null);
  const [altResults, setAltResults] = useState<DomainResult[]>([]);
  const [suggestions, setSuggestions] = useState<DomainResult[]>([]);
  const [error, setError] = useState('');
  const [tldPrices, setTldPrices] = useState<Record<string, number>>({});

  // Fetch TLD prices from products table on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.from('products').select('slug, price_cad, metadata').eq('type', 'domain_tld').eq('is_active', true).then(({ data }) => {
      const prices: Record<string, number> = {};
      for (const p of data ?? []) {
        const tld = (p.metadata as any)?.tld ?? p.slug?.replace('tld-', '');
        prices[tld] = ((p.metadata as any)?.registration_price_cad ?? p.price_cad ?? 0) / 100;
      }
      setTldPrices(prices);
    });
  }, []);

  async function checkSingle(domain: string): Promise<DomainResult> {
    const res = await fetch('/api/domain-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    const data = await res.json();
    return { domain, available: res.ok && data.available };
  }

  async function handleSearch() {
    const raw = query.trim().toLowerCase();
    if (!raw) return;

    setChecking(true);
    setPrimaryResult(null);
    setAltResults([]);
    setSuggestions([]);
    setError('');

    const hasTld = raw.includes('.');
    const primaryDomain = hasTld ? raw : `${raw}.com`;
    const baseName = primaryDomain.split('.')[0];
    const searchedTld = hasTld ? raw.split('.').pop()! : 'com';

    try {
      // 1. Check the primary domain
      const primary = await checkSingle(primaryDomain);
      setPrimaryResult(primary);

      // 2. Check alternative TLDs (in parallel)
      const altDomains = ALT_TLDS
        .filter(tld => tld !== searchedTld)
        .map(tld => `${baseName}.${tld}`);

      const altPromises = altDomains.map(d => checkSingle(d));

      // 3. Generate suggestions with same TLD (in parallel)
      const suggestDomains = SUGGEST_PREFIXES
        .map(prefix => `${prefix}${baseName}.${searchedTld}`)
        .filter(d => d !== primaryDomain);

      const suggestPromises = suggestDomains.map(d => checkSingle(d));

      // Run all in parallel
      const [alts, suggs] = await Promise.all([
        Promise.all(altPromises),
        Promise.all(suggestPromises),
      ]);

      setAltResults(alts);
      setSuggestions(suggs.filter(s => s.available));
    } catch {
      setError('Connection error. Please try again.');
    }

    setChecking(false);
  }

  function handleRegister(domain: string) {
    window.location.href = `/get-started?domain=${encodeURIComponent(domain)}&plan=choose`;
  }

  return (
    <>
      <div className="dom-search">
        <input
          type="text"
          placeholder="Search for a domain name..."
          value={query}
          onChange={e => { setQuery(e.target.value); setPrimaryResult(null); setAltResults([]); setSuggestions([]); setError(''); }}
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

      {/* Primary result */}
      {primaryResult && (
        <div style={{
          maxWidth: 560, margin: '20px auto 0', padding: '16px 24px', borderRadius: 14,
          border: `1px solid ${primaryResult.available ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.2)'}`,
          background: primaryResult.available ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {primaryResult.available
              ? <CheckCircle style={{ width: 20, height: 20, color: '#22c55e', flexShrink: 0 }} />
              : <XCircle style={{ width: 20, height: 20, color: '#ef4444', flexShrink: 0 }} />}
            <div>
              <span style={{ fontWeight: 600, color: 'var(--t1)', fontSize: '.95rem' }}>{primaryResult.domain}</span>
              <span style={{ color: primaryResult.available ? '#22c55e' : '#ef4444', fontSize: '.85rem', marginLeft: 10 }}>
                {primaryResult.available ? 'is available!' : 'is taken'}
              </span>
              {primaryResult.available && tldPrices[primaryResult.domain.split('.').pop()!] && (
                <span style={{ fontSize: '.8rem', color: 'var(--t3)', marginLeft: 8 }}>
                  ${tldPrices[primaryResult.domain.split('.').pop()!]}/yr
                </span>
              )}
            </div>
          </div>
          {primaryResult.available && (
            <button onClick={() => handleRegister(primaryResult.domain)} className="bp" style={{ fontSize: '.82rem', padding: '10px 20px' }}>
              Register
            </button>
          )}
        </div>
      )}

      {/* Alternative TLDs */}
      {altResults.length > 0 && (
        <div style={{ maxWidth: 560, margin: '12px auto 0' }}>
          <p style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Also available
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {altResults.map(r => (
              <div key={r.domain} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', borderRadius: 10,
                background: r.available ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.015)',
                border: `1px solid ${r.available ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.available ? '#22c55e' : '#ef4444' }} />
                  <span style={{ fontSize: '.88rem', fontWeight: 500, color: r.available ? 'var(--t1)' : 'var(--t3)' }}>{r.domain}</span>
                  {r.available && tldPrices[r.domain.split('.').pop()!] && (
                    <span style={{ fontSize: '.75rem', color: 'var(--t3)', marginLeft: 6 }}>${tldPrices[r.domain.split('.').pop()!]}/yr</span>
                  )}
                </div>
                {r.available ? (
                  <button onClick={() => handleRegister(r.domain)} style={{
                    fontSize: '.75rem', fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,.1)',
                    border: '1px solid rgba(34,197,94,.2)', borderRadius: 100, padding: '5px 14px', cursor: 'pointer',
                  }}>
                    Register
                  </button>
                ) : (
                  <span style={{ fontSize: '.75rem', color: 'var(--t3)' }}>Taken</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested similar names */}
      {suggestions.length > 0 && (
        <div style={{ maxWidth: 560, margin: '20px auto 0' }}>
          <p style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Suggested alternatives
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {suggestions.map(s => (
              <button key={s.domain} onClick={() => handleRegister(s.domain)} style={{
                fontSize: '.82rem', fontWeight: 500, color: 'var(--t1)', background: 'rgba(255,255,255,.04)',
                border: '1px solid rgba(255,255,255,.08)', borderRadius: 100, padding: '8px 16px', cursor: 'pointer',
                transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Globe style={{ width: 12, height: 12, color: 'var(--gold)' }} />
                {s.domain}
              </button>
            ))}
          </div>
        </div>
      )}

      {checking && primaryResult && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', color: 'var(--t3)', margin: '0 auto' }} />
        </div>
      )}

      {error && (
        <p style={{ textAlign: 'center', color: '#ef4444', fontSize: '.85rem', marginTop: 16 }}>{error}</p>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  );
}
