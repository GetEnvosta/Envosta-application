'use client';

import { useState } from 'react';

interface Props {
  type?: string;
  subject?: string;
  successMessage?: string;
  buttonText?: string;
  showName?: boolean;
  showSubject?: boolean;
  showMessage?: boolean;
  /** Minimal mode: just email + submit (for newsletter-style forms) */
  minimal?: boolean;
  className?: string;
}

export function ContactForm({
  type = 'support',
  subject,
  successMessage = "We've received your message and will be in touch soon.",
  buttonText = 'Submit',
  showName = true,
  showSubject = false,
  showMessage = true,
  minimal = false,
  className,
}: Props) {
  const [form, setForm] = useState({ name: '', email: '', subject: subject ?? '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || undefined,
          email: form.email.trim().toLowerCase(),
          subject: form.subject || subject || undefined,
          message: form.message || `${type} inquiry from ${form.email}`,
          type,
        }),
      });

      if (res.ok) {
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
      <div style={{ textAlign: 'center', padding: minimal ? '8px 0' : '24px 0' }}>
        <p style={{ color: '#86efac', fontSize: '.9rem', fontWeight: 500 }}>{successMessage}</p>
      </div>
    );
  }

  // Minimal mode: just email + button (newsletter style)
  if (minimal) {
    return (
      <form onSubmit={handleSubmit} className={className}>
        <input
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={e => update('email', e.target.value)}
          required
        />
        <button type="submit" className="bp" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending...' : buttonText}
        </button>
        {status === 'error' && (
          <p style={{ position: 'absolute', bottom: -24, left: 0, right: 0, textAlign: 'center', color: '#ef4444', fontSize: '.75rem' }}>
            Something went wrong. Try again.
          </p>
        )}
      </form>
    );
  }

  // Full form
  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showName && (
        <div>
          <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Name</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            placeholder="Jane Smith"
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem' }} />
        </div>
      )}
      <div>
        <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Email *</label>
        <input type="email" required value={form.email} onChange={e => update('email', e.target.value)}
          placeholder="jane@business.com"
          style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem' }} />
      </div>
      {showSubject && (
        <div>
          <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Subject</label>
          <input type="text" value={form.subject} onChange={e => update('subject', e.target.value)}
            placeholder="What's this about?"
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem' }} />
        </div>
      )}
      {showMessage && (
        <div>
          <label style={{ fontSize: '.75rem', color: 'var(--t3)', marginBottom: 4, display: 'block' }}>Message *</label>
          <textarea required value={form.message} onChange={e => update('message', e.target.value)}
            placeholder="Tell us more..."
            rows={4}
            style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: 'var(--t1)', fontSize: '.88rem', resize: 'vertical' }} />
        </div>
      )}
      <button type="submit" disabled={status === 'loading'}
        style={{ padding: '12px 28px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none', fontSize: '.88rem', fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-start', opacity: status === 'loading' ? 0.6 : 1 }}>
        {status === 'loading' ? 'Sending...' : buttonText}
      </button>
      {status === 'error' && (
        <p style={{ color: '#ef4444', fontSize: '.8rem' }}>Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
