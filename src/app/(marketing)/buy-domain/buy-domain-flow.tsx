'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Globe, Check, Loader2, ArrowRight } from 'lucide-react';

/**
 * Phase 3 — domain-only buy flow.
 *
 * The previous flow used Stripe Elements + a domain-renewal subscription
 * with embedded payment. Phase 3 collapses this into a single redirect to
 * a Stripe Checkout Session (mode='payment', inline price_data) created
 * by /api/domain-only-checkout. On return the URL carries ?success=1.
 */
export function BuyDomainFlow() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain') ?? '';
  const success = searchParams.get('success') === '1';
  const cancelled = searchParams.get('cancelled') === '1';

  const [step, setStep] = useState<'account' | 'success'>('account');

  // Account form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [price, setPrice] = useState<number | null>(null);

  // Stripe success redirect → flip to success step.
  useEffect(() => {
    if (success) setStep('success');
  }, [success]);

  // If already signed in, send them to the dashboard's domain register flow.
  useEffect(() => {
    if (!domain) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        window.location.href = `/dashboard/domains/register?q=${encodeURIComponent(domain)}`;
      }
    });
  }, [domain]);

  // Fetch domain price from public.tlds.
  useEffect(() => {
    if (!domain) return;
    const tld = domain.split('.').pop()?.toLowerCase() ?? '';
    const supabase = createClient();
    supabase.from('tlds').select('register_price_cad_cents').eq('tld', tld).eq('is_active', true).maybeSingle()
      .then(({ data }) => {
        if (data) setPrice((data.register_price_cad_cents ?? 0) / 100);
      });
  }, [domain]);

  async function handleCreateAccountAndCheckout() {
    if (!name || !email || password.length < 8 || !termsAccepted) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/domain-only-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, domainName: domain }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { setError(`Server error: ${text.substring(0, 200) || 'Empty response'}`); setLoading(false); return; }
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); setLoading(false); return; }

      if (!data.url) { setError('No checkout URL returned'); setLoading(false); return; }

      // Stash credentials so we can auto-sign-in on return.
      try {
        sessionStorage.setItem(`envosta_buy_domain_${domain}`, JSON.stringify({ email, password }));
      } catch { /* private mode */ }

      window.location.href = data.url;
    } catch (e: any) { setError(e.message ?? 'Connection error'); setLoading(false); }
  }

  // On success step, auto sign in from the stashed creds (best-effort).
  useEffect(() => {
    if (step !== 'success' || !domain) return;
    try {
      const stashed = sessionStorage.getItem(`envosta_buy_domain_${domain}`);
      if (!stashed) return;
      const { email: storedEmail, password: storedPass } = JSON.parse(stashed);
      sessionStorage.removeItem(`envosta_buy_domain_${domain}`);
      const sb = createClient();
      sb.auth.signInWithPassword({ email: storedEmail, password: storedPass }).catch(() => { /* fall back to login page */ });
    } catch { /* ignore */ }
  }, [step, domain]);

  if (!domain) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,.5)' }}>No domain specified. <a href="/domains" style={{ color: '#2563EB' }}>Search for a domain</a></p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,.06)',
    border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, color: '#f5f7fb', fontSize: '.9rem',
    fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{ paddingTop: 100, paddingBottom: 80, minHeight: '100vh' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '0 24px' }}>

        {/* Domain header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,.08)',
            border: '1px solid rgba(34,197,94,.2)', borderRadius: 100, padding: '6px 16px',
            fontSize: '.78rem', fontWeight: 600, color: '#22c55e', marginBottom: 16,
          }}>
            <Globe style={{ width: 14, height: 14 }} /> Available
          </div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: '1.8rem', fontWeight: 600, letterSpacing: '-1px', color: '#fff', marginBottom: 8 }}>
            {domain}
          </h1>
          <p style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.4)', fontWeight: 300 }}>
            {price !== null ? `$${price} CAD/year` : 'Loading price...'} &middot; Free WHOIS privacy &middot; Easy DNS management
          </p>
        </div>

        {/* Cancelled banner */}
        {cancelled && step === 'account' && (
          <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 10, padding: '10px 14px', fontSize: '.82rem', color: '#fbbf24', marginBottom: 16 }}>
            Checkout cancelled — you can try again any time.
          </div>
        )}

        {/* Step: Account + redirect to checkout */}
        {step === 'account' && (
          <div style={{ textAlign: 'center', maxWidth: 440, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 12, color: 'var(--t1)' }}>
              Create your account
            </h2>
            <p style={{ color: 'var(--t2)', marginBottom: 28, fontSize: '.92rem' }}>
              We&apos;ll create your account and take you to secure checkout.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
              <div>
                <label style={{ fontSize: '.78rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Full Name *</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '.78rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@business.com" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: '.78rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Password *</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters"
                  style={{ ...inputStyle, ...(password && password.length < 8 ? { borderColor: '#ef4444' } : {}) }} />
                {password && password.length < 8 && (
                  <p style={{ fontSize: '.72rem', color: '#ef4444', marginTop: 4 }}>Password must be at least 8 characters</p>
                )}
              </div>
              <div>
                <label style={{ fontSize: '.78rem', color: 'var(--t2)', marginBottom: 6, display: 'block' }}>Confirm Password *</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password"
                  style={{ ...inputStyle, ...(confirmPassword && confirmPassword !== password ? { borderColor: '#ef4444' } : {}) }} />
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ fontSize: '.72rem', color: '#ef4444', marginTop: 4 }}>Passwords don&apos;t match</p>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 4 }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} style={{ marginTop: 3, accentColor: '#2563EB' }} />
                <span style={{ fontSize: '.78rem', color: 'var(--t2)', lineHeight: 1.6 }}>
                  I agree to the <a href="/legal/terms" target="_blank" style={{ color: '#2563EB', textDecoration: 'underline' }}>Terms of Service</a> and <a href="/legal/privacy" target="_blank" style={{ color: '#2563EB', textDecoration: 'underline' }}>Privacy Policy</a>.
                </span>
              </label>

              {error && <p style={{ color: '#ef4444', fontSize: '.82rem' }}>{error}</p>}

              <button
                onClick={handleCreateAccountAndCheckout}
                disabled={!name || !email || password.length < 8 || password !== confirmPassword || !termsAccepted || loading}
                style={{
                  padding: '14px 24px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                  fontSize: '.88rem', fontWeight: 500, cursor: 'pointer', marginTop: 8,
                  opacity: (!name || !email || password.length < 8 || password !== confirmPassword || !termsAccepted || loading) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Redirecting...</> : <>Continue to Payment <ArrowRight style={{ width: 16, height: 16 }} /></>}
              </button>
            </div>
            <p style={{ fontSize: '.82rem', color: 'var(--t3)', marginTop: 20 }}>
              Already have an account? <a href="https://my.envosta.com/auth/login" style={{ color: '#2563EB', textDecoration: 'underline' }}>Sign in</a>
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check style={{ width: 28, height: 28, color: '#16a34a' }} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#fff', marginBottom: 8 }}>{domain} is yours!</h2>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '.9rem', marginBottom: 24 }}>
              Your domain has been registered. Manage DNS, connect hosting, and more from your dashboard.
            </p>
            <a href="/dashboard/domains" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px',
              background: '#fff', color: '#03060e', borderRadius: 100, fontSize: '.88rem', fontWeight: 600, textDecoration: 'none',
            }}>
              Go to Dashboard <ArrowRight style={{ width: 16, height: 16 }} />
            </a>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
