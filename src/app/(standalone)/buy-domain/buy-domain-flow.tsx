'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Globe, Lock, Shield, CreditCard, Check, Loader2, ArrowRight } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function BuyDomainFlow() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain') ?? '';
  const [step, setStep] = useState<'account' | 'payment' | 'success'>('account');

  // Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Payment
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [price, setPrice] = useState<number | null>(null);

  // Sign out any existing session
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.auth.signOut();
    });
  }, []);

  // Fetch domain price
  useEffect(() => {
    if (!domain) return;
    const tld = domain.split('.').pop()?.toLowerCase() ?? '';
    const supabase = createClient();
    supabase.from('products').select('price_cad, metadata')
      .eq('type', 'domain_tld').eq('slug', `tld-${tld}`).maybeSingle()
      .then(({ data }) => {
        if (data) setPrice(((data.metadata as any)?.registration_price_cad ?? data.price_cad ?? 0) / 100);
      });
  }, [domain]);

  async function handleCreateAccount() {
    if (!name || !email || password.length < 8 || !termsAccepted) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/domain-only-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, domainName: domain }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); setLoading(false); return; }

      setClientSecret(data.clientSecret);
      setStep('payment');
    } catch { setError('Connection error'); }
    setLoading(false);
  }

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

        {/* Step: Account */}
        {step === 'account' && (
          <div style={{ textAlign: 'center', maxWidth: 440, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(1.4rem,3vw,1.8rem)', fontWeight: 400, letterSpacing: '-.5px', marginBottom: 12, color: 'var(--t1)' }}>
              Create your account
            </h2>
            <p style={{ color: 'var(--t2)', marginBottom: 28, fontSize: '.92rem' }}>
              Just the basics — we&apos;ll set up your domain right after.
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
                onClick={handleCreateAccount}
                disabled={!name || !email || password.length < 8 || password !== confirmPassword || !termsAccepted || loading}
                style={{
                  padding: '14px 24px', background: '#fff', color: '#03060e', borderRadius: 100, border: 'none',
                  fontSize: '.88rem', fontWeight: 500, cursor: 'pointer', marginTop: 8,
                  opacity: (!name || !email || password.length < 8 || password !== confirmPassword || !termsAccepted || loading) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Setting up...</> : <>Continue to Payment <ArrowRight style={{ width: 16, height: 16 }} /></>}
              </button>
            </div>
            <p style={{ fontSize: '.82rem', color: 'var(--t3)', marginTop: 20 }}>
              Already have an account? <a href="https://my.envosta.com/auth/login" style={{ color: '#2563EB', textDecoration: 'underline' }}>Sign in</a>
            </p>
          </div>
        )}

        {/* Step: Payment */}
        {step === 'payment' && clientSecret && (
          <div>
            {/* Order summary */}
            <div style={{
              borderRadius: 16, padding: '20px 24px', marginBottom: 24,
              background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '.95rem', fontWeight: 600, color: '#fff' }}>{domain}</span>
                  <p style={{ fontSize: '.76rem', color: 'rgba(255,255,255,.35)', marginTop: 2 }}>1 year registration &middot; auto-renews annually</p>
                </div>
                <span style={{
                  fontSize: '.82rem', fontWeight: 600, padding: '4px 12px', borderRadius: 100,
                  background: 'rgba(255,255,255,.06)', color: '#fff',
                }}>
                  ${price ?? '...'} CAD/yr
                </span>
              </div>
            </div>

            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: 'night' as const,
                variables: {
                  fontFamily: '"DM Sans", system-ui, sans-serif',
                  borderRadius: '12px',
                  colorPrimary: '#2563EB',
                  colorBackground: '#0a0e1a',
                  colorText: '#e2e8f0',
                  colorTextSecondary: '#64748b',
                },
                rules: {
                  '.Input': { backgroundColor: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0', padding: '12px 14px' },
                  '.Input:focus': { borderColor: '#2563EB', boxShadow: '0 0 0 1px #2563EB' },
                  '.Label': { color: '#94a3b8', fontSize: '13px' },
                  '.Tab': { backgroundColor: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '10px' },
                  '.Tab--selected': { backgroundColor: 'rgba(37,99,235,.12)', borderColor: 'rgba(37,99,235,.3)' },
                  '.AccordionItem': { backgroundColor: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px' },
                },
              },
            }}>
              <DomainPaymentForm domain={domain} price={price} onSuccess={() => setStep('success')} />
            </Elements>
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
              Your domain has been registered. Sign in to manage DNS, connect hosting, and more.
            </p>
            <a href={`/auth/login?email=${encodeURIComponent(email)}`} style={{
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

function DomainPaymentForm({ domain, price, onSuccess }: { domain: string; price: number | null; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/buy-domain?domain=${encodeURIComponent(domain)}&success=1` },
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message ?? 'Payment failed');
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 20 }}>
        <PaymentElement onReady={() => setReady(true)} options={{
          layout: 'accordion',
          paymentMethodOrder: ['card', 'link'],
          defaultValues: { billingDetails: { address: { country: 'CA' } } },
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { icon: <Lock style={{ width: 12, height: 12 }} />, label: 'SSL Encrypted' },
          { icon: <Shield style={{ width: 12, height: 12 }} />, label: 'PCI Compliant' },
          { icon: <CreditCard style={{ width: 12, height: 12 }} />, label: 'Powered by Stripe' },
        ].map(b => (
          <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.72rem', color: 'rgba(255,255,255,.3)' }}>
            {b.icon} {b.label}
          </span>
        ))}
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: '.82rem', textAlign: 'center', marginBottom: 16 }}>{error}</p>}

      <button type="submit" disabled={!stripe || !ready || loading} style={{
        width: '100%', padding: '16px 24px', borderRadius: 100, border: 'none',
        fontSize: '.92rem', fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
        background: '#fff', color: '#03060e', opacity: !stripe || !ready || loading ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {loading ? <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> Processing...</> : <>Register {domain} — ${price ?? '...'} CAD</>}
      </button>

      <p style={{ fontSize: '.68rem', color: 'rgba(255,255,255,.25)', marginTop: 16, textAlign: 'center', lineHeight: 1.6 }}>
        By completing this purchase you agree to our <a href="/legal/terms" target="_blank" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'underline' }}>Terms</a> and <a href="/legal/privacy" target="_blank" style={{ color: 'rgba(255,255,255,.4)', textDecoration: 'underline' }}>Privacy Policy</a>.
      </p>
    </form>
  );
}
