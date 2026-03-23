'use client';

import { useState } from 'react';

export function StudioWaitlistForm() {
  const [form, setForm] = useState({
    name: '', email: '', business_name: '', website_url: '', description: '', budget: '', timeline: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.description) return;

    setStatus('loading');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/studio_waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email.toLowerCase(),
          business_name: form.business_name || null,
          website_url: form.website_url || null,
          description: form.description,
          budget: form.budget || null,
          timeline: form.timeline || null,
          source: 'website',
        }),
      });

      if (res.ok || res.status === 201) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(201,164,92,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <span style={{ fontSize: '1.5rem' }}>&#10003;</span>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 500, color: '#fff', marginBottom: 8 }}>You&apos;re on the list!</h3>
        <p style={{ color: 'var(--t2)', fontSize: '.9rem', maxWidth: 400, margin: '0 auto' }}>
          We&apos;ll reach out when a spot opens up. In the meantime, we&apos;ll review your project details and be ready to hit the ground running.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Name *</label>
          <input type="text" required value={form.name} onChange={e => update('name', e.target.value)}
            placeholder="Jane Smith"
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(201,164,92,.15)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Email *</label>
          <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
            placeholder="jane@business.com"
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(201,164,92,.15)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Business Name</label>
          <input type="text" value={form.business_name} onChange={e => update('business_name', e.target.value)}
            placeholder="Your Business"
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(201,164,92,.15)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Current Website</label>
          <input type="url" value={form.website_url} onChange={e => update('website_url', e.target.value)}
            placeholder="https://..."
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(201,164,92,.15)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem' }} />
        </div>
      </div>

      <div>
        <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>What do you need? *</label>
        <textarea required value={form.description} onChange={e => update('description', e.target.value)}
          placeholder="Tell us about your project — what kind of website, features, goals..."
          rows={4}
          style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(201,164,92,.15)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem', resize: 'vertical' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Budget Range</label>
          <select value={form.budget} onChange={e => update('budget', e.target.value)}
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(201,164,92,.15)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem' }}>
            <option value="">Select...</option>
            <option value="under-5k">Under $5,000</option>
            <option value="5k-10k">$5,000 – $10,000</option>
            <option value="10k-25k">$10,000 – $25,000</option>
            <option value="25k+">$25,000+</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Timeline</label>
          <select value={form.timeline} onChange={e => update('timeline', e.target.value)}
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(201,164,92,.15)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem' }}>
            <option value="">Select...</option>
            <option value="asap">ASAP</option>
            <option value="1-2-weeks">1–2 weeks</option>
            <option value="1-month">Within a month</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>

      <button type="submit" disabled={status === 'loading'}
        style={{ padding: '12px 28px', background: 'linear-gradient(135deg,#c9a45c,#b8943f)', color: '#0a0e1a', borderRadius: 100, border: 'none', fontSize: '.88rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start', opacity: status === 'loading' ? 0.6 : 1 }}>
        {status === 'loading' ? 'Submitting...' : 'Join the Waitlist'}
      </button>

      {status === 'error' && (
        <p style={{ color: '#ef4444', fontSize: '.8rem' }}>Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
