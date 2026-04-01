'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Check, Lock, CreditCard, Shield } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutFormProps {
  type: 'payment' | 'setup';
  planName: string;
  planPrice: string;
  fullPrice?: string;
  isTrial: boolean;
  dark?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function CheckoutForm({ type, planName, planPrice, fullPrice, isTrial, dark, onSuccess, onError }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    let result;
    if (type === 'setup') {
      result = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: `${window.location.origin}/dashboard/sites?checkout=success` },
        redirect: 'if_required',
      });
    } else {
      result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: `${window.location.origin}/dashboard/sites?checkout=success` },
        redirect: 'if_required',
      });
    }

    if (result.error) {
      onError(result.error.message ?? 'Payment failed');
      setLoading(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Order summary */}
      <div className={`rounded-xl p-4 mb-5 ${dark ? 'bg-white/[.04] border border-white/[.08]' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-900'}`}>{planName}</span>
          <span className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{planPrice}</span>
        </div>
        {isTrial && (
          <div>
            <p className="text-xs text-emerald-400 font-medium">14-day free trial — $0 today</p>
            {fullPrice && <p className={`text-xs mt-1 ${dark ? 'text-white/40' : 'text-gray-500'}`}>Then {fullPrice} after your trial ends.</p>}
          </div>
        )}
      </div>

      {/* Payment Element */}
      <div className="mb-5">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{
            layout: 'tabs',
            defaultValues: { billingDetails: { address: { country: 'CA' } } },
          }}
        />
      </div>

      {/* Security badges */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap',
      }}>
        {[
          { icon: <Lock style={{ width: 12, height: 12 }} />, label: 'SSL Encrypted' },
          { icon: <Shield style={{ width: 12, height: 12 }} />, label: 'PCI Compliant' },
          { icon: <CreditCard style={{ width: 12, height: 12 }} />, label: 'Powered by Stripe' },
        ].map(b => (
          <span key={b.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '.72rem', fontWeight: 400, letterSpacing: '.3px',
            color: dark ? 'rgba(255,255,255,.3)' : '#9ca3af',
          }}>
            {b.icon} {b.label}
          </span>
        ))}
      </div>

      <button
        type="submit"
        disabled={!stripe || !ready || loading}
        style={{
          width: '100%',
          padding: '16px 24px',
          borderRadius: 100,
          border: 'none',
          fontSize: '.92rem',
          fontWeight: 600,
          cursor: !stripe || !ready || loading ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'all .2s',
          opacity: !stripe || !ready || loading ? 0.5 : 1,
          background: dark ? '#fff' : '#111827',
          color: dark ? '#03060e' : '#fff',
        }}
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
        ) : isTrial ? (
          <>Start Free Trial</>
        ) : (
          <><Lock className="w-4 h-4" /> Pay {planPrice}</>
        )}
      </button>
    </form>
  );
}

interface EmbeddedCheckoutProps {
  clientSecret: string;
  type: 'payment' | 'setup';
  planName: string;
  planPrice: string;
  fullPrice?: string;
  isTrial: boolean;
  dark?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function EmbeddedCheckout({ clientSecret, type, planName, planPrice, fullPrice, isTrial, dark, onSuccess, onError }: EmbeddedCheckoutProps) {
  if (!clientSecret) return null;

  const appearance: any = dark ? {
    theme: 'night',
    variables: {
      fontFamily: '"DM Sans", system-ui, sans-serif',
      borderRadius: '12px',
      colorPrimary: '#2563EB',
      colorBackground: '#0c0f1a',
      colorText: '#e2e8f0',
      colorTextSecondary: '#94a3b8',
      colorDanger: '#ef4444',
    },
    rules: {
      '.Input': { backgroundColor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#e2e8f0' },
      '.Input:focus': { borderColor: '#2563EB', boxShadow: '0 0 0 1px #2563EB' },
      '.Label': { color: '#94a3b8' },
    },
  } : {
    theme: 'stripe',
    variables: {
      fontFamily: '"DM Sans", system-ui, sans-serif',
      borderRadius: '12px',
      colorPrimary: '#111827',
    },
  };

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
      <CheckoutForm
        type={type}
        planName={planName}
        planPrice={planPrice}
        isTrial={isTrial}
        fullPrice={fullPrice}
        dark={dark}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
