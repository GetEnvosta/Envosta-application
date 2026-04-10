'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, Loader2, Check, X, ArrowRightLeft, ShieldCheck, Lock, Shield, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function RegisterDomainPage() {
  const [domain, setDomain] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [domainPrice, setDomainPrice] = useState<number | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isTransfer = searchParams.get('transfer') === 'true';

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setDomain(q);
  }, [searchParams]);

  async function callFunction(body: any) {
    const res = await fetch('/api/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async function checkAvailability(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.includes('.')) { setError('Enter a full domain like example.com'); return; }
    setChecking(true);
    setError('');
    setAvailable(null);

    try {
      const data = await callFunction({ action: 'check', domainName: domain.toLowerCase().trim() });
      if (!data || data.error) { setError(data?.error ?? 'Check failed'); return; }

      if (isTransfer) {
        setAvailable(!data.available);
      } else {
        setAvailable(data.available);
      }
    } catch {
      setError('Connection error — please try again');
    } finally {
      setChecking(false);
    }
  }

  async function handleRegister() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/domain-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName: domain.toLowerCase().trim() }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { setError('Server error'); return; }
      if (!res.ok) { setError(data?.error ?? 'Checkout failed'); return; }
      setClientSecret(data.clientSecret);
      setDomainPrice(data.price ?? null);
    } catch {
      setError('Connection error — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTransfer() {
    if (!authCode.trim()) { setError('EPP/authorization code is required'); return; }
    setSubmitting(true);
    setError('');
    const data = await callFunction({
      action: 'transfer',
      domainName: domain.toLowerCase().trim(),
      authInfo: authCode.trim(),
      years: 1,
    });
    if (!data || data.error) {
      setError(data?.error ?? 'Transfer failed');
      setSubmitting(false);
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

      <h1 className="text-xl font-semibold text-gray-900 mb-1">
        {isTransfer ? 'Transfer a Domain' : 'Register a Domain'}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {isTransfer
          ? 'Move a domain from another registrar to Envosta. You\'ll need the EPP/authorization code from your current registrar.'
          : 'Search for available domain names and register them instantly.'}
      </p>

      <div className="card p-6 max-w-lg">
        <form onSubmit={checkAvailability} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label className="label">Domain name</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                value={domain}
                onChange={e => { setDomain(e.target.value); setAvailable(null); setError(''); }}
                placeholder="example.com"
                required
              />
              <button type="submit" className="btn-secondary shrink-0 inline-flex items-center gap-1.5" disabled={checking}>
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Check
              </button>
            </div>
          </div>
        </form>

        {/* Registration result */}
        {!isTransfer && available !== null && (
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
              <button onClick={handleRegister} className="btn-primary text-sm" disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</> : 'Register'}
              </button>
            )}
          </div>
        )}

        {/* Transfer result */}
        {isTransfer && available !== null && (
          <div className={`mt-4 rounded-lg p-4 ${
            available ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-center gap-2.5 mb-3">
              {available ? (
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                </div>
              ) : (
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-amber-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">{domain}</p>
                <p className="text-xs text-gray-500">
                  {available ? 'Eligible for transfer' : 'This domain appears to be unregistered — try registering it instead.'}
                </p>
              </div>
            </div>

            {available && (
              <div className="space-y-3">
                <div>
                  <label className="label">EPP / Authorization Code</label>
                  <input
                    type="text"
                    className="input font-mono text-sm"
                    value={authCode}
                    onChange={e => setAuthCode(e.target.value)}
                    placeholder="Enter the code from your current registrar"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Get this from your current registrar&apos;s domain management panel.</p>
                </div>
                <button onClick={handleTransfer} className="btn-primary text-sm w-full" disabled={submitting || !authCode.trim()}>
                  {submitting ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Initiating transfer...</span>
                  ) : (
                    <span className="inline-flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Transfer Domain</span>
                  )}
                </button>
              </div>
            )}

            {!available && (
              <div className="mt-2">
                <Link href="/dashboard/domains/register" className="text-sm text-brand-600 font-medium hover:underline">
                  Register this domain instead &rarr;
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Transfer info */}
        {isTransfer && available === null && (
          <div className="mt-5 rounded-lg bg-gray-50 border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-500" /> Before you transfer
            </h3>
            <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
              <li>Unlock the domain at your current registrar</li>
              <li>Disable WHOIS privacy (temporarily)</li>
              <li>Get the EPP/authorization code from your registrar</li>
              <li>The domain must have been registered for at least 60 days</li>
              <li>Transfers typically complete within 5-7 days</li>
            </ul>
          </div>
        )}
        {/* Embedded Payment */}
        {clientSecret && !paymentSuccess && (
          <div className="card p-6 mt-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Complete Payment</h2>
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{domain}</p>
                  <p className="text-xs text-gray-500">1 year registration &middot; renews annually</p>
                </div>
                {domainPrice && <span className="text-sm font-semibold text-gray-900">${domainPrice} CAD/yr</span>}
              </div>
            </div>
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: { fontFamily: '"DM Sans", system-ui, sans-serif', borderRadius: '12px', colorPrimary: '#111827' },
                rules: { '.Input': { padding: '12px 14px' }, '.Tab': { borderRadius: '10px' }, '.AccordionItem': { borderRadius: '12px' } },
              },
            }}>
              <DomainPaymentForm domain={domain} price={domainPrice} onSuccess={() => { setPaymentSuccess(true); router.push('/dashboard/domains?checkout=success'); }} />
            </Elements>
          </div>
        )}

        {paymentSuccess && (
          <div className="card p-8 mt-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-gray-900">Domain registered!</p>
            <p className="text-xs text-gray-500 mt-1">Redirecting to your domains...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DomainPaymentForm({ domain, price, onSuccess }: { domain: string; price: number | null; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      if (!stripe || !elements) return;
      setLoading(true);
      setError('');
      const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: `${window.location.origin}/dashboard/domains?checkout=success` }, redirect: 'if_required' });
      if (result.error) { setError(result.error.message ?? 'Payment failed'); setLoading(false); } else { onSuccess(); }
    }}>
      <div className="mb-4">
        <PaymentElement onReady={() => setReady(true)} options={{ layout: 'accordion', paymentMethodOrder: ['card'], defaultValues: { billingDetails: { address: { country: 'CA' } } } }} />
      </div>
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <button type="submit" disabled={!stripe || !ready || loading} className="btn-primary w-full text-sm py-3">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <>Register {domain} {price ? `— $${price} CAD` : ''}</>}
      </button>
    </form>
  );
}
