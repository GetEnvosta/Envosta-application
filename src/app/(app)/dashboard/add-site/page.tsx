'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Rocket, ArrowRight, AlertCircle, Globe, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

interface PlanOption {
  slug: string;
  name: string;
  price: number;
  features: string[];
}

export default function AddSitePage() {
  const router = useRouter();
  const supabase = createClient();

  const [label, setLabel] = useState('');
  const [region, setRegion] = useState('dca');
  const [selectedPlan, setSelectedPlan] = useState('minimum');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Current usage context
  const [loading, setLoading] = useState(true);
  const [hasPaymentMethod, setHasPaymentMethod] = useState(true);
  const [currentCount, setCurrentCount] = useState(0);
  const [plans, setPlans] = useState<PlanOption[]>([]);

  useEffect(() => {
    async function loadContext() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/login'); return; }

      // Get current site count (excluding deleted)
      const { count } = await supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('status', 'in', '("cancelled","deleted")');
      setCurrentCount(count ?? 0);

      // Check if user has a Stripe customer (payment method on file)
      const { data: profile } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();
      setHasPaymentMethod(!!profile?.stripe_customer_id);

      // Load available hosting plans
      const { data: planRows } = await supabase
        .from('products')
        .select('slug, name, price_usd, features, metadata')
        .eq('type', 'hosting_plan')
        .eq('is_active', true)
        .order('price_usd', { ascending: true });

      setPlans((planRows ?? []).map((p: any) => ({
        slug: p.slug,
        name: p.name,
        price: p.price_usd ? p.price_usd / 100 : 0,
        features: Array.isArray(p.features) ? p.features : [],
      })));

      setLoading(false);
    }
    loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!label.trim() || creating) return;
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/create-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), region, planSlug: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not create site');
        setCreating(false);
        return;
      }
      router.push(`/dashboard/sites/${data.siteId}?created=1`);
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
      setCreating(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Add a Site</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Each site is billed as its own line item on your subscription.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : !hasPaymentMethod ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">No payment method on file</p>
              <p className="text-xs text-amber-800 mt-1 mb-3">
                Add a payment method before creating a site.
              </p>
              <Link href="/dashboard/billing" className="text-xs font-medium text-amber-900 underline">
                Add payment method →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plan selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-3">
              Choose a plan for this site
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((plan) => (
                <button
                  key={plan.slug}
                  type="button"
                  onClick={() => setSelectedPlan(plan.slug)}
                  disabled={creating}
                  className={`relative text-left border rounded-xl p-4 transition-all ${
                    selectedPlan === plan.slug
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  } disabled:opacity-50`}
                >
                  {selectedPlan === plan.slug && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ${plan.price}/mo per site
                  </p>
                  {plan.features.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {plan.features.slice(0, 3).map((f: string, i: number) => (
                        <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-green-600 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {/* Site count context */}
            <div className="flex items-center gap-2.5 pb-5 mb-5 border-b border-gray-100">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {currentCount} active {currentCount === 1 ? 'site' : 'sites'}
                </p>
                <p className="text-xs text-gray-500">
                  Each site is billed separately based on its plan
                </p>
              </div>
            </div>

            {/* Label input */}
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Site name
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="e.g. my-second-site"
              disabled={creating}
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              We&apos;ll set up a temporary domain instantly. You can connect a custom domain later.
            </p>

            {/* Region */}
            <label className="block text-xs font-medium text-gray-700 mt-5 mb-1.5">
              Server region
            </label>
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              disabled={creating}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 bg-white"
            >
              <option value="dca">US East (Washington DC)</option>
              <option value="sfo">US West (San Francisco)</option>
              <option value="ams">Europe (Amsterdam)</option>
              <option value="sin">Asia (Singapore)</option>
            </select>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={!label.trim() || creating}
              className="mt-6 w-full btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating your site...</>
              ) : (
                <><Rocket className="w-4 h-4" /> Create Site <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
