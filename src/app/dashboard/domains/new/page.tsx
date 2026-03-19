'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Loader2, Check, X } from 'lucide-react';
import Link from 'next/link';

export default function NewDomainPage() {
  const [domain, setDomain] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function callFunction(body: any) {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Please log in first'); return null; }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-domain`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify(body),
      }
    );
    return res.json();
  }

  async function checkAvailability(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.includes('.')) { setError('Enter a full domain like example.com'); return; }
    setChecking(true);
    setError('');
    setAvailable(null);

    const data = await callFunction({ action: 'check', domainName: domain.toLowerCase().trim() });
    setChecking(false);
    if (!data || data.error) { setError(data?.error ?? 'Check failed'); return; }
    setAvailable(data.available);
  }

  async function handleRegister() {
    setRegistering(true);
    setError('');
    const data = await callFunction({ action: 'register', domainName: domain.toLowerCase().trim(), years: 1 });
    if (!data || data.error) {
      setError(data?.error ?? 'Registration failed');
      setRegistering(false);
      return;
    }
    router.push('/dashboard/domains');
    router.refresh();
  }

  return (
    <div>
      <Link href="/dashboard/domains" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to domains
      </Link>

      <h1 className="text-xl font-semibold text-gray-900 mb-1">Register a domain</h1>
      <p className="text-sm text-gray-500 mb-6">Search for available domain names and register them instantly.</p>

      <div className="card p-6 max-w-lg">
        <form onSubmit={checkAvailability} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="label">Domain name</label>
            <div className="flex gap-2">
              <input type="text" className="input flex-1" value={domain}
                onChange={e => { setDomain(e.target.value); setAvailable(null); }}
                placeholder="example.com" required />
              <button type="submit" className="btn-secondary shrink-0" disabled={checking}>
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Check
              </button>
            </div>
          </div>
        </form>

        {available !== null && (
          <div className={`mt-4 rounded-lg p-4 flex items-center justify-between ${
            available ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center gap-2.5">
              {available ? (
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-600" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-red-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{domain}</p>
                <p className="text-xs text-gray-500">{available ? 'Available for registration' : 'Not available'}</p>
              </div>
            </div>
            {available && (
              <button onClick={handleRegister} className="btn-primary text-sm" disabled={registering}>
                {registering ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</> : 'Register'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
