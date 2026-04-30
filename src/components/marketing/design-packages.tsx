'use client';

/**
 * <DesignPackages> — "More options for your business" section on the
 * pricing page. Two cards (Starter $500 and Premium $15,000) each open
 * a small inline modal to collect a name + email + message and post it
 * through the existing /api/contact endpoint as a sales-type ticket.
 *
 * No new API surface needed — /api/contact already creates a ticket and
 * emails sales@envosta.com.
 */

import { useEffect, useState } from 'react';

type Pkg = {
  id: 'starter' | 'premium';
  name: string;
  price: string;
  blurb: string;
  cta: string;
};

const PACKAGES: Pkg[] = [
  {
    id: 'starter',
    name: 'Studio Lite',
    price: '$500',
    blurb: 'Curated wireframing, a setup-ready template tailored to your brand, performance tuning, and an SEO baseline — built specifically for small businesses and solo entrepreneurs ready to launch fast.',
    cta: 'Get in touch',
  },
  {
    id: 'premium',
    name: 'Studio Premium',
    price: '$15,000',
    blurb: 'The whole everything for established brands. Industry-specific design, deep competitor analysis, full brand strategy, custom illustration, advanced integrations, ongoing performance + SEO work, and a dedicated team that ships until it ships.',
    cta: 'Get in touch',
  },
];

export function DesignPackages() {
  const [activePkg, setActivePkg] = useState<Pkg | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (activePkg) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [activePkg]);

  function reset() {
    setActivePkg(null);
    setName(''); setEmail(''); setMessage('');
    setSending(false); setDone(false); setError('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes('@')) { setError('Valid email required'); return; }
    if (!message.trim()) { setError('Tell us a bit about your project'); return; }
    if (!activePkg) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sales',
          subject: `${activePkg.name} (${activePkg.price}) inquiry`,
          name: name.trim() || undefined,
          email: email.trim(),
          message: `Package: ${activePkg.name} (${activePkg.price})\n\n${message.trim()}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? 'Something went wrong');
        setSending(false);
        return;
      }
      setDone(true);
    } catch {
      setError('Network error — try again in a moment');
    }
    setSending(false);
  }

  return (
    <>
      <style>{`
        .design-packages{padding:0 0 100px}
        .design-packages-header{text-align:center;margin-bottom:56px}
        .dp-eyebrow{display:inline-flex;align-items:center;gap:7px;background:rgba(201,164,92,.08);border:1px solid rgba(201,164,92,.22);border-radius:100px;padding:5px 12px;font-size:.66rem;font-weight:500;color:#c9a45c;text-transform:uppercase;letter-spacing:1.4px;margin-bottom:20px;align-self:flex-start}
        .dp-eyebrow-dot{width:5px;height:5px;border-radius:50%;background:#c9a45c;animation:dpPulse 2s ease-in-out infinite}
        @keyframes dpPulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(201,164,92,.4)}50%{opacity:.7;box-shadow:0 0 0 6px rgba(201,164,92,0)}}
        .design-packages-header h2{font-size:clamp(2rem,4vw,3rem);font-weight:600;letter-spacing:-1.5px;line-height:1.15;margin-bottom:14px}
        .design-packages-header p{font-size:.95rem;color:var(--t3);font-weight:300;max-width:580px;margin:0 auto;line-height:1.7}
        .design-packages-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px;max-width:920px;margin:0 auto}
        .dp-card{background:var(--card);border:1px solid var(--bdr);border-radius:18px;padding:36px 32px;display:flex;flex-direction:column;transition:border-color .3s,transform .3s}
        .dp-card:hover{transform:translateY(-4px);border-color:var(--bdr2)}
        .dp-card.premium{border-color:rgba(201,164,92,.35);background:linear-gradient(180deg,rgba(201,164,92,.04),var(--card) 60%)}
        .dp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:14px}
        .dp-name{font-size:1.35rem;font-weight:600;color:var(--t1);letter-spacing:-.4px;line-height:1.2}
        .dp-price{flex-shrink:0;text-align:right;font-size:1.8rem;font-weight:700;letter-spacing:-1px;color:var(--t1);line-height:1}
        .dp-price .dp-price-period{display:block;font-size:.7rem;color:var(--t3);font-weight:400;margin-top:6px;letter-spacing:.2px;text-transform:uppercase}
        .dp-blurb{font-size:.92rem;color:var(--t3);font-weight:300;line-height:1.7;margin-bottom:28px;flex:1}
        .dp-card .bp{width:100%;justify-content:center;padding:14px 24px;font-size:.92rem;font-weight:500;cursor:pointer;border:none;font-family:inherit}
        @media(max-width:768px){.design-packages-grid{grid-template-columns:1fr}.dp-card{padding:32px 28px}}

        /* — Modal — */
        .dp-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .25s ease}
        .dp-modal{background:#0d1424;border:1px solid var(--bdr2);border-radius:20px;max-width:480px;width:100%;padding:36px;position:relative;animation:slideUp .35s cubic-bezier(.22,1,.36,1)}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        .dp-modal-close{position:absolute;top:16px;right:16px;background:none;border:none;color:var(--t3);width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s,color .2s}
        .dp-modal-close:hover{background:rgba(255,255,255,.06);color:var(--t1)}
        .dp-modal h3{font-size:1.3rem;font-weight:600;color:var(--t1);margin-bottom:6px;letter-spacing:-.3px}
        .dp-modal-sub{font-size:.86rem;color:var(--t3);font-weight:300;margin-bottom:24px;line-height:1.5}
        .dp-modal-sub strong{color:var(--t1);font-weight:500}
        .dp-modal label{display:block;font-size:.74rem;font-weight:500;color:var(--t2);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px}
        .dp-modal input,.dp-modal textarea{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--bdr);border-radius:10px;padding:12px 14px;color:var(--t1);font-size:.92rem;font-family:inherit;font-weight:300;outline:none;transition:border-color .2s,background .2s}
        .dp-modal input:focus,.dp-modal textarea:focus{border-color:var(--gold);background:rgba(255,255,255,.06)}
        .dp-modal textarea{resize:vertical;min-height:110px;line-height:1.5}
        .dp-modal-field{margin-bottom:16px}
        .dp-modal-error{color:#f87171;font-size:.82rem;margin-top:-8px;margin-bottom:14px}
        .dp-modal-actions{display:flex;gap:10px;margin-top:8px}
        .dp-modal-actions .bp{flex:1;justify-content:center;padding:13px 20px;font-size:.9rem;font-weight:500;cursor:pointer;border:none;font-family:inherit}
        .dp-modal-actions .ghost-btn{flex:none;background:transparent;border:1px solid var(--bdr);color:var(--t2);padding:13px 18px;border-radius:10px;cursor:pointer;font-size:.9rem;font-family:inherit}
        .dp-modal-actions .ghost-btn:hover{border-color:var(--bdr2);color:var(--t1)}
        .dp-modal-success{text-align:center;padding:20px 0 8px}
        .dp-modal-success svg{width:48px;height:48px;color:#22c55e;margin:0 auto 16px;display:block}
        .dp-modal-success h3{margin-bottom:8px}
        .dp-modal-success p{font-size:.88rem;color:var(--t3);font-weight:300;line-height:1.6}
      `}</style>

      <section className="design-packages rv">
        <div className="c">
          <div className="design-packages-header">
            <h2>Studio</h2>
            <p>Beyond hosting — a complete custom-designed website built by our team. To keep quality high we only accept a limited number of new Studio clients every month.</p>
          </div>

          <div className="design-packages-grid">
            {PACKAGES.map((pkg) => (
              <div key={pkg.id} className={pkg.id === 'premium' ? 'dp-card premium' : 'dp-card'}>
                {pkg.id === 'premium' && (
                  <div className="dp-eyebrow" aria-label="Limited spots each month">
                    <span className="dp-eyebrow-dot" />
                    Limited spots each month
                  </div>
                )}
                <div className="dp-head">
                  <h3 className="dp-name">{pkg.name}</h3>
                  <div className="dp-price">
                    {pkg.price}
                    <span className="dp-price-period">USD · one-time</span>
                  </div>
                </div>
                <p className="dp-blurb">{pkg.blurb}</p>
                <button
                  type="button"
                  onClick={() => { reset(); setActivePkg(pkg); }}
                  className={pkg.id === 'premium' ? 'bp blue' : 'bp ghost'}
                >
                  {pkg.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Email submission modal */}
      {activePkg && (
        <div
          className="dp-modal-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) reset(); }}
        >
          <div className="dp-modal" role="dialog" aria-modal="true" aria-labelledby="dp-modal-title">
            <button type="button" className="dp-modal-close" aria-label="Close" onClick={reset}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>

            {done ? (
              <div className="dp-modal-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M7 12l3.5 3.5L17 9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 id="dp-modal-title">Got it — we&rsquo;ll be in touch</h3>
                <p>
                  Your inquiry about the <strong style={{ color: 'var(--t1)' }}>{activePkg.name}</strong> package
                  has been submitted. Expect a reply from our team within one business day.
                </p>
                <div className="dp-modal-actions" style={{ marginTop: 24 }}>
                  <button type="button" className="bp ghost" onClick={reset} style={{ flex: 1 }}>Close</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3 id="dp-modal-title">{activePkg.name}</h3>
                <p className="dp-modal-sub">
                  Tell us about your project and we&rsquo;ll send a tailored quote for the <strong>{activePkg.name}</strong> package ({activePkg.price}).
                </p>

                <div className="dp-modal-field">
                  <label htmlFor="dp-name">Your name</label>
                  <input
                    id="dp-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    autoComplete="name"
                    maxLength={200}
                  />
                </div>
                <div className="dp-modal-field">
                  <label htmlFor="dp-email">Email *</label>
                  <input
                    id="dp-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    autoComplete="email"
                    required
                    maxLength={320}
                  />
                </div>
                <div className="dp-modal-field">
                  <label htmlFor="dp-message">Tell us about your project *</label>
                  <textarea
                    id="dp-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What kind of business is it, what's the goal of the site, anything we should know..."
                    rows={4}
                    required
                    maxLength={5000}
                  />
                </div>

                {error && <div className="dp-modal-error">{error}</div>}

                <div className="dp-modal-actions">
                  <button type="button" className="ghost-btn" onClick={reset}>Cancel</button>
                  <button type="submit" className="bp blue" disabled={sending}>
                    {sending ? 'Sending…' : 'Send inquiry'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
