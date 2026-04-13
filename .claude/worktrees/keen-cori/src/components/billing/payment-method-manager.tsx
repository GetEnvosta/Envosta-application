'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Plus, Trash2, Check, CreditCard } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const brandLabels: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  diners: 'Diners',
  jcb: 'JCB',
  unionpay: 'UnionPay',
};

function AddCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) { setLoading(false); return; }

    // Get SetupIntent client secret
    const res = await fetch('/api/payment-methods', { method: 'POST' });
    const { clientSecret } = await res.json();

    const { setupIntent, error: confirmErr } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (confirmErr) {
      setError(confirmErr.message ?? 'Card verification failed');
      setLoading(false);
      return;
    }

    // Set as default
    const setRes = await fetch('/api/payment-methods', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethodId: setupIntent?.payment_method }),
    });

    if (!setRes.ok) {
      setError('Failed to save card');
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-brand-200 bg-brand-50/30 p-4">
      <p className="text-sm font-medium text-gray-900 mb-3">Add new card</p>
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
      <div className="flex items-center gap-2">
        <button type="submit" disabled={!stripe || loading} className="btn-primary text-sm py-2 px-4">
          {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding...</> : 'Add Card'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm py-2 px-4">Cancel</button>
      </div>
    </form>
  );
}

export function PaymentMethodManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payment-methods');
      const data = await res.json();
      let cards: PaymentMethod[] = data.methods ?? [];
      // If only 1 card and it's not default, auto-set it as default
      if (cards.length === 1 && !cards[0].isDefault) {
        await fetch('/api/payment-methods', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethodId: cards[0].id }),
        });
        cards = [{ ...cards[0], isDefault: true }];
      }
      setMethods(cards);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchMethods(); }, [fetchMethods]);

  async function setDefault(pmId: string) {
    setActionId(pmId);
    try {
      await fetch('/api/payment-methods', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      await fetchMethods();
    } catch { /* ignore */ }
    setActionId(null);
  }

  async function removeCard(pmId: string) {
    if (!confirm('Remove this card? If it\'s your only payment method, your subscriptions may fail to renew.')) return;
    setActionId(pmId);
    try {
      await fetch('/api/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      await fetchMethods();
    } catch { /* ignore */ }
    setActionId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-6 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading payment methods...
      </div>
    );
  }

  return (
    <div>
      {methods.length === 0 && !showAdd ? (
        <div className="text-center py-6">
          <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-3">No payment methods on file.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm py-2 px-4">
            <Plus className="w-3.5 h-3.5" /> Add Payment Method
          </button>
        </div>
      ) : (
        <>
          {/* Card list */}
          <div className="space-y-2 mb-4">
            {methods.map((pm) => (
              <div
                key={pm.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
                  pm.isDefault ? 'border-brand-200 bg-brand-50/30' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                    pm.isDefault ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {brandLabels[pm.brand] ? brandLabels[pm.brand].slice(0, 4) : 'Card'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {brandLabels[pm.brand] ?? 'Card'} ending in {pm.last4}
                      {pm.isDefault && (
                        <span className="ml-2 text-[10px] font-semibold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded-full uppercase">Default</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!pm.isDefault && (
                    <button
                      onClick={() => setDefault(pm.id)}
                      disabled={!!actionId}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50"
                    >
                      {actionId === pm.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Make Default'}
                    </button>
                  )}
                  {!pm.isDefault && (
                    <button
                      onClick={() => removeCard(pm.id)}
                      disabled={!!actionId}
                      className="text-xs text-gray-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {actionId === pm.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add card form or button */}
          {showAdd ? (
            <Elements stripe={stripePromise}>
              <AddCardForm
                onSuccess={() => { setShowAdd(false); fetchMethods(); }}
                onCancel={() => setShowAdd(false)}
              />
            </Elements>
          ) : (
            <button onClick={() => setShowAdd(true)} className="btn-secondary text-sm py-2 px-4 w-full">
              <Plus className="w-3.5 h-3.5" /> Add Another Card
            </button>
          )}
        </>
      )}
    </div>
  );
}
