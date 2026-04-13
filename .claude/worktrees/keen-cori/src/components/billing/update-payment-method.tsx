'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Check, CreditCard } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

function CardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) { setLoading(false); return; }

    const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(
      (window as any).__setupClientSecret,
      { payment_method: { card: cardElement } }
    );

    if (confirmError) {
      setError(confirmError.message ?? 'Card verification failed');
      setLoading(false);
      return;
    }

    // Set as default payment method
    const res = await fetch('/api/billing-portal', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethodId: setupIntent?.payment_method }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? 'Failed to save payment method');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => onSuccess(), 1500);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 mb-3">
        <CardElement options={{
          style: {
            base: {
              fontSize: '15px',
              fontFamily: '"DM Sans", system-ui, sans-serif',
              color: '#111827',
              '::placeholder': { color: '#9ca3af' },
            },
          },
        }} />
      </div>

      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!stripe || loading || success}
          className="btn-primary text-sm py-2 px-4"
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
          ) : success ? (
            <><Check className="w-3.5 h-3.5" /> Saved</>
          ) : (
            'Save Card'
          )}
        </button>
      </div>
    </form>
  );
}

export function UpdatePaymentMethod() {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function openForm() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const data = await res.json();
      if (data.clientSecret) {
        (window as any).__setupClientSecret = data.clientSecret;
        setShowForm(true);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  if (showForm) {
    return (
      <div>
        <Elements stripe={stripePromise}>
          <CardForm onSuccess={() => window.location.reload()} />
        </Elements>
        <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:text-gray-600 mt-2">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={openForm} disabled={loading} className="btn-secondary inline-flex items-center gap-2">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
      Update Card
    </button>
  );
}
