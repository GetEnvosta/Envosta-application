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
  isTrial: boolean;
  dark?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function CheckoutForm({ type, planName, planPrice, isTrial, dark, onSuccess, onError }: CheckoutFormProps) {
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
          <p className="text-xs text-emerald-400 font-medium">14-day free trial — you won&apos;t be charged today</p>
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
      <div className={`flex items-center gap-4 mb-5 text-xs ${dark ? 'text-white/30' : 'text-gray-400'}`}>
        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL encrypted</span>
        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> PCI compliant</span>
        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Powered by Stripe</span>
      </div>

      <button
        type="submit"
        disabled={!stripe || !ready || loading}
        className={`w-full py-3.5 rounded-xl font-medium text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${dark ? 'bg-white text-gray-900 hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
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
  isTrial: boolean;
  dark?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function EmbeddedCheckout({ clientSecret, type, planName, planPrice, isTrial, dark, onSuccess, onError }: EmbeddedCheckoutProps) {
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
        dark={dark}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
