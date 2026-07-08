'use client';

/**
 * Local Domination Scorecard opt-in form (rebuild brief Phase 2.4).
 * Fields per spec: name, business, industry (from config), city, URL, phone.
 * Turnstile renders when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; the API
 * verifies server-side when the secret is configured. POSTs to
 * /api/scorecard → ticket + sales email (a human sees every lead).
 */
import { useEffect, useRef, useState } from 'react';
import type { Industry } from '@/config/industries';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (token: string) => void; 'error-callback'?: () => void }) => string;
    };
  }
}

export function ScorecardForm({ industries }: { industries: Pick<Industry, 'slug' | 'name'>[] }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey || !turnstileRef.current) return;
    const el = turnstileRef.current;
    const render = () => {
      if (window.turnstile && el.childElementCount === 0) {
        window.turnstile.render(el, {
          sitekey: siteKey,
          callback: (token) => setTurnstileToken(token),
          'error-callback': () => setTurnstileToken(''),
        });
      }
    };
    if (window.turnstile) {
      render();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = render;
    document.head.appendChild(script);
  }, [siteKey]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const data = new FormData(e.currentTarget);
    const payload = {
      name: String(data.get('name') ?? '').trim(),
      business: String(data.get('business') ?? '').trim(),
      industry: String(data.get('industry') ?? '').trim(),
      city: String(data.get('city') ?? '').trim(),
      website: String(data.get('website') ?? '').trim(),
      phone: String(data.get('phone') ?? '').trim(),
      turnstileToken,
    };

    if (!payload.name || !payload.business || !payload.industry || !payload.city || !payload.phone) {
      setError('Name, business, industry, city, and phone are required.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/scorecard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error ?? 'Submission failed. Please try again.');
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="panel panel--framed" style={{ padding: '44px 36px', textAlign: 'center' }}>
        <span className="eyebrow">Request received</span>
        <h2 style={{ margin: '12px 0' }}>Your scorecard is being built.</h2>
        <p style={{ maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
          A member of the team runs your city&apos;s teardown by hand and sends it within one
          business day, with a short walkthrough of what it means. Keep an eye on your phone —
          we confirm by call or text, the same way we work.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="panel" style={{ padding: '36px 32px' }}>
      <div className="sc-row">
        <div>
          <label htmlFor="sc-name">Your name</label>
          <input id="sc-name" name="name" type="text" required autoComplete="name" />
        </div>
        <div>
          <label htmlFor="sc-business">Business name</label>
          <input id="sc-business" name="business" type="text" required autoComplete="organization" />
        </div>
      </div>
      <div className="sc-row">
        <div>
          <label htmlFor="sc-industry">Industry</label>
          <select id="sc-industry" name="industry" required defaultValue="">
            <option value="" disabled>Select your industry…</option>
            {industries.map((i) => (
              <option key={i.slug} value={i.slug}>{i.name}</option>
            ))}
            <option value="other">Something else</option>
          </select>
        </div>
        <div>
          <label htmlFor="sc-city">City</label>
          <input id="sc-city" name="city" type="text" required placeholder="Calgary" autoComplete="address-level2" />
        </div>
      </div>
      <div className="sc-row">
        <div>
          <label htmlFor="sc-website">Current website (if any)</label>
          <input id="sc-website" name="website" type="text" inputMode="url" placeholder="example.com" />
        </div>
        <div>
          <label htmlFor="sc-phone">Phone</label>
          <input id="sc-phone" name="phone" type="tel" required autoComplete="tel" />
        </div>
      </div>

      {siteKey ? <div ref={turnstileRef} style={{ margin: '18px 0 4px' }} /> : null}

      {error && <p className="field-error" role="alert">{error}</p>}

      <button type="submit" disabled={submitting} className="btn btn--primary" style={{ width: '100%', marginTop: 20 }}>
        {submitting ? 'Sending…' : 'Send me my scorecard'}
      </button>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.7rem', color: 'var(--steel-dim)', textAlign: 'center', marginTop: 14 }}>
        Free. No obligation. We never share your details.
      </p>
    </form>
  );
}
