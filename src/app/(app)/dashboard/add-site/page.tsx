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

/**
 * Value-stack copy per plan (outcome-led, honest — no invented promises).
 * DB `products.features` overrides these when set (Settings → Plans).
 */
const PLAN_MARKETING: Record<string, { hook: string; badge?: string; stackIntro?: string; stack: string[] }> = {
  standard: {
    hook: 'Everything you need to get online — and stay online.',
    stack: [
      'Your site handled — updates, security & speed managed for you',
      'Daily backups + free SSL on the infrastructure behind WordPress.com',
      'WooCommerce-ready — start selling whenever you want',
      'Lead-capture forms + Google Analytics wired in',
      'Priority support · 4-hour response',
    ],
  },
  growth: {
    hook: 'For sites that make you money.',
    badge: 'MOST POPULAR',
    stackIntro: 'Everything in Business, plus:',
    stack: [
      'Hands-on onboarding — we set it up with you',
      'First-in-queue support — skip the line, every time',
      'WooCommerce + subscriptions + Stripe — built to take payments',
    ],
  },
};

export default function AddSitePage() {
  const router = useRouter();
  const supabase = createClient();

  const [label, setLabel] = useState('');
  const [region, setRegion] = useState('dca');
  const [selectedPlan, setSelectedPlan] = useState('growth');
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

      // Load the public sellable plans (hidden Minimum + sales-only
      // Enterprise are admin paths, never customer-pickable).
      const { data: planRows } = await supabase
        .from('products')
        .select('slug, name, price_usd, features, metadata')
        .eq('type', 'hosting_plan')
        .eq('is_active', true)
        .not('slug', 'in', '("minimum","enterprise")')
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

  const activePlan = plans.find((p) => p.slug === selectedPlan) ?? null;

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Launch your next site</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Live in minutes on the same infrastructure behind WordPress.com — set up, secured, and
          managed for you.
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
          {/* Plan selector — value-stacked, anchor on Growth */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-3">
              Pick how much you want handled
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const mk = PLAN_MARKETING[plan.slug];
                const isSelected = selectedPlan === plan.slug;
                const stack = plan.features.length > 0 ? plan.features : (mk?.stack ?? []);
                return (
                  <button
                    key={plan.slug}
                    type="button"
                    onClick={() => setSelectedPlan(plan.slug)}
                    disabled={creating}
                    className={`relative text-left border rounded-2xl p-5 transition-all flex flex-col ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-600 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    } disabled:opacity-50`}
                  >
                    {mk?.badge && (
                      <span className="absolute -top-2.5 left-5 text-[10px] font-bold tracking-wider text-white bg-blue-600 rounded-full px-2.5 py-0.5">
                        {mk.badge}
                      </span>
                    )}
                    {isSelected && (
                      <div className="absolute top-4 right-4 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                    {mk?.hook && (
                      <p className="text-xs text-gray-600 mt-0.5 pr-6">{mk.hook}</p>
                    )}
                    <p className="mt-3">
                      <span className="text-2xl font-bold text-gray-900">${plan.price}</span>
                      <span className="text-xs text-gray-500 font-normal"> USD/mo · cancel anytime</span>
                    </p>
                    {mk?.stackIntro && (
                      <p className="mt-3 text-[11px] font-semibold text-blue-700 uppercase tracking-wide">{mk.stackIntro}</p>
                    )}
                    <ul className={`${mk?.stackIntro ? 'mt-1.5' : 'mt-3'} space-y-1.5 flex-1`}>
                      {stack.map((f: string, i: number) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5 leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-px" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <p className={`mt-4 text-xs font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-400'}`}>
                      {isSelected ? '✓ Selected' : 'Select this plan'}
                    </p>
                  </button>
                );
              })}
            </div>
            {/* Risk reversal — factual, no theater */}
            <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
              Every site runs on wp.cloud — infrastructure built by Automattic, the makers of
              WordPress. No contracts, cancel anytime, and your content and domain are always
              yours.
            </p>
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
                <><Loader2 className="w-4 h-4 animate-spin" /> Launching your site...</>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Launch This Site{activePlan ? ` — $${activePlan.price}/mo` : ''}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* What happens next — zero mystery */}
            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
              {[
                ['1', 'We provision your site on wp.cloud'],
                ['2', 'Temporary domain live in minutes'],
                ['3', 'Connect your own domain anytime'],
              ].map(([n, step]) => (
                <div key={n} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-px">{n}</span>
                  <span className="text-[11px] text-gray-500 leading-snug">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
