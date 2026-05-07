'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, CheckCircle, AlertCircle, CreditCard, Lock, Shield } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PendingState = {
  clientSecret: string;
  intentType: 'setup' | 'payment';
  subscriptionId: string;
};

export default function ActivatePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}>
      <ActivateInner />
    </Suspense>
  );
}

function ActivateInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [pending, setPending] = useState<PendingState | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('activated') === '1') {
      setState('success');
      return;
    }

    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('metadata')
        .eq('id', user.id)
        .maybeSingle();

      const meta = (profile?.metadata as any) ?? {};
      const subId = meta.pending_subscription_id;
      const clientSecret = meta.pending_setup_intent_client_secret;

      if (!subId || !clientSecret) {
        // Nothing pending — bounce to dashboard
        router.replace('/dashboard');
        return;
      }

      // Determine intent type from the client_secret prefix
      const intentType: 'setup' | 'payment' = clientSecret.startsWith('seti_') ? 'setup' : 'payment';

      setPending({ clientSecret, intentType, subscriptionId: subId });
      setState('ready');
    })().catch(e => {
      setErrorMsg(e?.message ?? 'Failed to load activation');
      setState('error');
    });
  }, [router, searchParams]);

  if (state === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Couldn&rsquo;t load activation</h1>
          <p className="text-sm text-gray-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="max-w-lg mx-auto py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">You&rsquo;re all set!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Payment method saved. Your 14-day free trial is running — your site is being built and we&rsquo;ll email you when it&rsquo;s ready.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!pending) return null;

  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="text-center mb-6">
        <CreditCard className="w-10 h-10 text-gray-700 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-900 mb-1">One last step</h1>
        <p className="text-sm text-gray-500">
          Add a payment method to start your 14-day free trial. You won&rsquo;t be charged today.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: pending.clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                fontFamily: '"DM Sans", system-ui, sans-serif',
                borderRadius: '12px',
                colorPrimary: '#111827',
              },
            },
          }}
        >
          <ActivateForm intentType={pending.intentType} />
        </Elements>
      </div>
    </div>
  );
}

function ActivateForm({ intentType }: { intentType: 'setup' | 'payment' }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [ready, setReady] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr('');

    const returnUrl = `${window.location.origin}/dashboard/activate?activated=1`;

    const result = intentType === 'setup'
      ? await stripe.confirmSetup({ elements, confirmParams: { return_url: returnUrl } })
      : await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl } });

    if (result.error) {
      setErr(result.error.message ?? 'Payment failed');
      setSubmitting(false);
    }
    // Success path redirects via return_url.
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        onReady={() => setReady(true)}
        options={{ layout: 'accordion', paymentMethodOrder: ['card'] }}
      />

      <div className="flex justify-center gap-5 mt-5 mb-5 flex-wrap">
        {[
          { icon: <Lock className="w-3 h-3" />, label: 'SSL Encrypted' },
          { icon: <Shield className="w-3 h-3" />, label: 'PCI Compliant' },
          { icon: <CreditCard className="w-3 h-3" />, label: 'Powered by Stripe' },
        ].map(b => (
          <span key={b.label} className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
            {b.icon} {b.label}
          </span>
        ))}
      </div>

      {err && (
        <p className="text-xs text-red-600 flex items-center gap-1 mb-3">
          <AlertCircle className="w-3 h-3" /> {err}
        </p>
      )}

      <button
        type="submit"
        disabled={!stripe || !ready || submitting}
        className="w-full py-3 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : 'Start my 14-day free trial'}
      </button>

      <p className="text-[11px] text-gray-400 text-center mt-4">
        We&rsquo;ll authorize your card but won&rsquo;t charge until your trial ends. Cancel anytime.
      </p>
    </form>
  );
}
