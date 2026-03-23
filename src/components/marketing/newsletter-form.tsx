'use client';

import { useState } from 'react';

export function NewsletterForm({ source = 'blog' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), source }),
      });

      if (res.ok || res.status === 201) {
        setStatus('success');
        setEmail('');
      } else {
        const data = await res.json().catch(() => null);
        // Duplicate email is fine — treat as success
        if (data?.code === '23505') {
          setStatus('success');
          setEmail('');
        } else {
          setStatus('error');
        }
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <p style={{ color: '#86efac', fontSize: '.9rem', fontWeight: 500 }}>You&apos;re subscribed! Check your inbox.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="nl-form">
      <input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <button type="submit" className="bp" disabled={status === 'loading'}>
        {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
      </button>
      {status === 'error' && (
        <p style={{ position: 'absolute', bottom: -24, left: 0, right: 0, textAlign: 'center', color: '#ef4444', fontSize: '.75rem' }}>
          Something went wrong. Try again.
        </p>
      )}
    </form>
  );
}
