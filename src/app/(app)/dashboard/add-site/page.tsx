'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Rocket, ArrowRight, AlertCircle, Globe } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

export default function AddSitePage() {
  const router = useRouter();
  const supabase = createClient();

  const [label, setLabel] = useState('');
  const [region, setRegion] = useState('dca');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [limitReached, setLimitReached] = useState(false);

  // Current usage context
  const [loading, setLoading] = useState(true);
  const [planSlug, setPlanSlug] = useState<string | null>(null);
  const [currentCount, setCurrentCount] = useState(0);
  const [cap, setCap] = useState<number | null>(null);

  const PLAN_CAPS: Record<string, number> = { minimum: 2, growth: 10 };

  useEffect(() => {
    async function loadContext() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth/login'); return; }

      // Get current site count (excluding deleted/cancelled)
      const { count } = await supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .not('status', 'in', '("cancelled","deleted")');
      setCurrentCount(count ?? 0);

      // Get active hosting plan
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('id, status, products(slug, type, name)')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing']);
      const hosting = (subs ?? []).find((s: any) => s.products?.type === 'hosting_plan');
      const slug = (hosting as any)?.products?.slug ?? null;
      setPlanSlug(slug);
      setCap(slug ? PLAN_CAPS[slug] ?? 2 : null);
      setLoading(false);
    }
    loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    if (!label.trim() || creating) return;
    setCreating(true);
    setError('');
    setLimitReached(false);

    try {
      const res = await fetch('/api/create-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), region }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not create site');
        if (data.limitReached) setLimitReached(true);
        setCreating(false);
        return;
      }
      // Success — redirect to the new site page
      router.push(`/dashboard/sites/${data.siteId}?created=1`);
    } catch (e: any) {
      setError(e?.message ?? 'Network error');
      setCreating(false);
    }
  }

  const remaining = cap !== null ? Math.max(0, cap - currentCount) : null;
  const atLimit = cap !== null && currentCount >= cap;

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-gray-900">Add a Site</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Spin up another WordPress site on a temporary domain — included in your plan.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : !planSlug ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">No active hosting plan</p>
              <p className="text-xs text-amber-800 mt-1 mb-3">
                You need an active hosting plan before you can add sites.
              </p>
              <Link href="/dashboard/billing" className="text-xs font-medium text-amber-900 underline">
                Choose a plan →
              </Link>
            </div>
          </div>
        </div>
      ) : atLimit ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                You&apos;ve reached the {cap}-site limit on your {planSlug.charAt(0).toUpperCase() + planSlug.slice(1)} plan
              </p>
              <p className="text-xs text-amber-800 mt-1 mb-3">
                Upgrade to the Growth plan to host up to 10 sites.
              </p>
              <Link href="/dashboard/billing" className="text-xs font-medium text-amber-900 underline">
                Upgrade plan →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          {/* Plan context */}
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {planSlug.charAt(0).toUpperCase() + planSlug.slice(1)} plan
                </p>
                <p className="text-xs text-gray-500">
                  {currentCount} of {cap} sites used · {remaining} remaining
                </p>
              </div>
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

          {error && !limitReached && (
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
      )}
    </div>
  );
}
