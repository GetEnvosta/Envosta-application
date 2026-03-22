'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { formatCents } from '@/lib/utils';
import { Check, Loader2, Search, X, ChevronRight, Globe, CreditCard, LayoutGrid } from 'lucide-react';

/* ---------- Types ---------- */
interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  stripe_price_id_monthly: string;
  price_monthly: number;
  storage_gb: number;
  features: string[];
  onboarding_type: string;
  support_response_hours: number;
  has_staging: boolean;
  has_backups: boolean;
  has_cdn: boolean;
  has_waf: boolean;
  sort_order: number;
}

interface DomainCheckResult {
  available: boolean;
  domain: string;
  tld: string;
  priceCents: number;
}

/* ---------- Helpers ---------- */
const STEPS = [
  { label: 'Choose Plan', icon: LayoutGrid },
  { label: 'Domain', icon: Globe },
  { label: 'Checkout', icon: CreditCard },
];

function onboardingLabel(type: string) {
  switch (type) {
    case 'concierge':
      return 'Concierge onboarding';
    case 'guided':
      return 'Guided onboarding';
    default:
      return 'Standard onboarding';
  }
}

function supportLabel(hours: number) {
  if (hours <= 4) return 'Dedicated support (4 hr response)';
  if (hours <= 24) return 'Priority support (24 hr response)';
  return 'Email support (48 hr response)';
}

/* ================================================================
   Main Component
   ================================================================ */
export default function AddSitePage() {
  const supabase = createClient();

  /* --- state --- */
  const [step, setStep] = useState(1);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Step 1
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Step 2
  const [domainQuery, setDomainQuery] = useState('');
  const [domainChecking, setDomainChecking] = useState(false);
  const [domainResult, setDomainResult] = useState<DomainCheckResult | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<{ name: string; priceCents: number } | null>(null);

  // Step 3
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  /* --- Fetch plans on mount --- */
  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setPlans((data as Plan[]) ?? []);
      setLoading(false);
    }
    fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- Domain check --- */
  async function handleDomainCheck() {
    if (!domainQuery.trim()) return;
    setDomainChecking(true);
    setDomainResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/register-domain`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ action: 'check', domain: domainQuery.trim() }),
        },
      );
      const json = await res.json();
      setDomainResult(json);
    } catch {
      setDomainResult(null);
    } finally {
      setDomainChecking(false);
    }
  }

  /* --- Checkout --- */
  async function handleCheckout() {
    if (!selectedPlan) return;
    setCheckoutLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('Please log in first');
      setCheckoutLoading(false);
      return;
    }

    const body: Record<string, unknown> = {
      priceId: selectedPlan.stripe_price_id_monthly,
    };
    if (selectedDomain) {
      body.domainName = selectedDomain.name;
      body.domainPriceCents = selectedDomain.priceCents;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok || !data?.url) {
        alert(data?.error ?? 'Checkout failed');
        setCheckoutLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      alert('Something went wrong. Please try again.');
      setCheckoutLoading(false);
    }
  }

  /* ================================================================
     RENDER
     ================================================================ */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const totalCents =
    (selectedPlan?.price_monthly ?? 0) + (selectedDomain?.priceCents ?? 0);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Add a Site</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Choose a plan, optionally register a domain, and check out.
        </p>
      </div>

      {/* ---- Stepper ---- */}
      <nav className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
        {STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isActive = step === stepNum;
          const isCompleted = step > stepNum;

          return (
            <div key={s.label} className="flex items-center gap-2 sm:gap-3">
              {i > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              )}
              <button
                onClick={() => {
                  if (isCompleted) setStep(stepNum);
                }}
                disabled={!isCompleted}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-brand-600'
                    : isCompleted
                    ? 'text-gray-700 hover:text-brand-600 cursor-pointer'
                    : 'text-gray-400 cursor-default'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* ================================================================
         STEP 1 — Choose Plan
         ================================================================ */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto animate-fade-in">
          {plans.map((plan) => {
            const isPopular = plan.slug === 'growth';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-sm border p-6 flex flex-col ${
                  isPopular
                    ? 'border-blue-500 ring-2 ring-blue-500/20'
                    : 'border-gray-200'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge-blue text-xs px-3 py-0.5">
                    Most Popular
                  </span>
                )}

                {/* Plan name + price */}
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCents(plan.price_monthly)}
                  </span>
                  <span className="text-sm text-gray-500">/mo</span>
                </div>

                {/* Storage highlight */}
                <p className="mt-3 text-sm font-medium text-brand-600">
                  {plan.storage_gb} GB SSD Storage
                </p>

                {/* Description */}
                <p className="mt-2 text-sm text-gray-500">
                  {plan.description}
                </p>

                {/* Features list */}
                <ul className="mt-5 space-y-2.5 flex-1">
                  {(plan.features as string[]).map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* Onboarding + support */}
                <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                  <p>{onboardingLabel(plan.onboarding_type)}</p>
                  <p>{supportLabel(plan.support_response_hours)}</p>
                </div>

                {/* CTA */}
                <button
                  onClick={() => {
                    setSelectedPlan(plan);
                    setStep(2);
                  }}
                  className={`mt-5 w-full ${isPopular ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Choose Plan
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================
         STEP 2 — Domain (optional)
         ================================================================ */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">
            Do you have a domain?
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {/* Already have a domain */}
            <button
              onClick={() => {
                setSelectedDomain(null);
                setStep(3);
              }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:border-brand-300 transition-colors group"
            >
              <Globe className="w-8 h-8 text-gray-400 group-hover:text-brand-500 mb-3 transition-colors" />
              <p className="text-sm font-semibold text-gray-900">
                I already have a domain
              </p>
              <p className="text-xs text-gray-500 mt-1">
                You can connect it after checkout.
              </p>
            </button>

            {/* Register new domain */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <Search className="w-8 h-8 text-gray-400 mb-3" />
              <p className="text-sm font-semibold text-gray-900 mb-3">
                Register a new domain
              </p>

              {/* Search input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={domainQuery}
                  onChange={(e) => setDomainQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDomainCheck()}
                  placeholder="example.com"
                  className="input flex-1"
                />
                <button
                  onClick={handleDomainCheck}
                  disabled={domainChecking || !domainQuery.trim()}
                  className="btn-primary shrink-0"
                >
                  {domainChecking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Check'
                  )}
                </button>
              </div>

              {/* Domain result */}
              {domainResult && (
                <div className="mt-3">
                  {domainResult.available ? (
                    <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm text-emerald-800 font-medium">
                          {domainResult.domain}
                        </span>
                        <span className="text-xs text-emerald-600">
                          {formatCents(domainResult.priceCents)}/yr
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedDomain({
                            name: domainResult.domain,
                            priceCents: domainResult.priceCents,
                          });
                          setStep(3);
                        }}
                        className="btn-primary text-xs !py-1.5 !px-3"
                      >
                        Select
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                      <X className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-700">
                        {domainResult.domain} is unavailable
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Skip link */}
          <div className="text-center">
            <button
              onClick={() => {
                setSelectedDomain(null);
                setStep(3);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
            >
              Skip this step
            </button>
          </div>
        </div>
      )}

      {/* ================================================================
         STEP 3 — Checkout
         ================================================================ */}
      {step === 3 && selectedPlan && (
        <div className="max-w-md mx-auto animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-900 text-center mb-6">
            Order Summary
          </h2>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Plan line */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedPlan.name} Plan
                </p>
                <p className="text-xs text-gray-500">Billed monthly</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {formatCents(selectedPlan.price_monthly)}/mo
              </p>
            </div>

            {/* Domain line */}
            {selectedDomain && (
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedDomain.name}
                  </p>
                  <p className="text-xs text-gray-500">Domain registration</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCents(selectedDomain.priceCents)}
                </p>
              </div>
            )}

            {/* Total */}
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm font-semibold text-gray-900">
                Total due today
              </p>
              <p className="text-lg font-bold text-gray-900">
                {formatCents(totalCents)}
              </p>
            </div>

            {/* Checkout button */}
            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="btn-primary w-full mt-6"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Redirecting&hellip;
                </>
              ) : (
                'Continue to Payment'
              )}
            </button>

            {/* Back link */}
            <button
              onClick={() => setStep(2)}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 mt-3"
            >
              &larr; Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
