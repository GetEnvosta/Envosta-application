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
      <div style={{
        borderRadius: 16, padding: '20px 24px', marginBottom: 24,
        background: dark ? 'rgba(255,255,255,.03)' : '#f9fafb',
        border: `1px solid ${dark ? 'rgba(255,255,255,.06)' : '#e5e7eb'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isTrial ? 12 : 0 }}>
          <span style={{ fontSize: '.95rem', fontWeight: 600, color: dark ? '#fff' : '#111827' }}>{planName}</span>
          <span style={{
            fontSize: '.82rem', fontWeight: 600, padding: '4px 12px', borderRadius: 100,
            background: isTrial ? 'rgba(34,197,94,.1)' : dark ? 'rgba(255,255,255,.06)' : '#e5e7eb',
            color: isTrial ? '#22c55e' : dark ? '#fff' : '#111827',
          }}>
            {planPrice}
          </span>
        </div>
        {isTrial && (
          <div style={{
            borderTop: `1px solid ${dark ? 'rgba(255,255,255,.06)' : '#e5e7eb'}`,
            paddingTop: 12,
          }}>
            <p style={{ fontSize: '.8rem', color: '#22c55e', fontWeight: 500, marginBottom: 4 }}>
              14-day free trial — no charge today
            </p>
            {fullPrice && (
              <p style={{ fontSize: '.76rem', color: dark ? 'rgba(255,255,255,.35)' : '#9ca3af' }}>
                Then {fullPrice} when your trial ends. Cancel anytime.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Payment Element */}
      <div className="mb-5">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{
            layout: 'accordion',
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
      colorBackground: '#0a0e1a',
      colorText: '#e2e8f0',
      colorTextSecondary: '#64748b',
      colorDanger: '#ef4444',
      spacingUnit: '4px',
      spacingGridRow: '16px',
      spacingGridColumn: '16px',
      spacingTab: '12px',
    },
    rules: {
      '.Input': { backgroundColor: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#e2e8f0', padding: '12px 14px', fontSize: '14px' },
      '.Input:focus': { borderColor: '#2563EB', boxShadow: '0 0 0 1px #2563EB' },
      '.Label': { color: '#94a3b8', fontSize: '13px', fontWeight: '400' },
      '.Tab': { backgroundColor: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '10px', padding: '10px 14px' },
      '.Tab:hover': { backgroundColor: 'rgba(255,255,255,.06)', borderColor: 'rgba(255,255,255,.12)' },
      '.Tab--selected': { backgroundColor: 'rgba(37,99,235,.12)', borderColor: 'rgba(37,99,235,.3)', color: '#fff' },
      '.TabIcon': { fill: '#94a3b8' },
      '.TabIcon--selected': { fill: '#2563EB' },
      '.TabLabel': { fontSize: '13px', fontWeight: '500' },
      '.Block': { backgroundColor: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px' },
      '.AccordionItem': { backgroundColor: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px' },
    },
  } : {
    theme: 'stripe',
    variables: {
      fontFamily: '"DM Sans", system-ui, sans-serif',
      borderRadius: '12px',
      colorPrimary: '#111827',
      spacingUnit: '4px',
      spacingGridRow: '16px',
    },
    rules: {
      '.Tab': { borderRadius: '10px', padding: '10px 14px' },
      '.Tab--selected': { backgroundColor: '#f0f7ff', borderColor: '#2563EB' },
      '.Input': { padding: '12px 14px', fontSize: '14px' },
      '.Label': { fontSize: '13px' },
      '.Block': { borderRadius: '12px' },
      '.AccordionItem': { borderRadius: '12px' },
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
