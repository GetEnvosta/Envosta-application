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
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function CheckoutForm({ type, planName, planPrice, isTrial, onSuccess, onError }: CheckoutFormProps) {
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
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 mb-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-900">{planName}</span>
          <span className="text-sm font-semibold text-gray-900">{planPrice}</span>
        </div>
        {isTrial && (
          <p className="text-xs text-emerald-600 font-medium">14-day free trial — you won&apos;t be charged today</p>
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
      <div className="flex items-center gap-4 mb-5 text-xs text-gray-400">
        <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> SSL encrypted</span>
        <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> PCI compliant</span>
        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Powered by Stripe</span>
      </div>

      <button
        type="submit"
        disabled={!stripe || !ready || loading}
        className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
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
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function EmbeddedCheckout({ clientSecret, type, planName, planPrice, isTrial, onSuccess, onError }: EmbeddedCheckoutProps) {
  if (!clientSecret) return null;

  const appearance: any = {
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
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
