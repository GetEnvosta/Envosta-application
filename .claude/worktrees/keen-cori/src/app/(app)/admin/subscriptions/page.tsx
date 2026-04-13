export const revalidate = 5;

import { createClient } from '@/lib/supabase-server';
import { formatDate, formatCents, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { CreditCard, Search, AlertTriangle, Server, Globe, ExternalLink } from 'lucide-react';

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status: statusFilter, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('subscriptions')
    .select('*, products(name, slug, type, price_cad), users(id, full_name, email)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);
  if (q) query = query.or(`users.full_name.ilike.%${q}%,users.email.ilike.%${q}%`);

  const { data: subscriptions } = await query;
  const subs = subscriptions ?? [];

  // Find orphans: active/trialing hosting subs with no site, domain subs with no domain
  const hostingSubIds = subs.filter((s: any) => s.products?.type === 'hosting_plan' && ['active', 'trialing'].includes(s.status)).map((s: any) => s.id);
  const { data: linkedSites } = hostingSubIds.length > 0
    ? await supabase.from('sites').select('subscription_id').in('subscription_id', hostingSubIds)
    : { data: [] };
  const siteLinkSet = new Set((linkedSites ?? []).map((s: any) => s.subscription_id));

  const domainSubs = subs.filter((s: any) => s.products?.type === 'domain_tld' && ['active', 'trialing'].includes(s.status));
  const domainLinkSet = new Set<string>();
  if (domainSubs.length > 0) {
    const { data: linkedDomains } = await supabase.from('domains').select('metadata').not('metadata->renewal_stripe_subscription_id', 'is', null);
    for (const d of linkedDomains ?? []) {
      const rsid = (d.metadata as any)?.renewal_stripe_subscription_id;
      if (rsid) domainLinkSet.add(rsid);
    }
  }

  // Counts
  const counts: Record<string, number> = { all: subs.length };
  for (const s of subs) { counts[s.status] = (counts[s.status] ?? 0) + 1; }

  const STATUSES = ['all', 'active', 'trialing', 'past_due', 'cancelled', 'incomplete', 'paused'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Subscriptions</h1>
          <p className="text-sm text-gray-500 mt-0.5">All hosting and domain subscriptions across the platform.</p>
        </div>
        <a href="https://dashboard.stripe.com/subscriptions" target="_blank" rel="noopener noreferrer"
          className="btn-admin text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
          <ExternalLink className="w-4 h-4" /> Stripe
        </a>
      </div>

      {/* Filters */}
      <form className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" name="q" defaultValue={q ?? ''} placeholder="Search by name or email..." className="input pl-9 w-full" />
          </div>
          <select name="status" defaultValue={statusFilter ?? 'all'} className="input w-auto">
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')} ({counts[s] ?? 0})
              </option>
            ))}
          </select>
          <button type="submit" className="btn-admin">Filter</button>
        </div>
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Linked</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No subscriptions found.</p>
                  </td>
                </tr>
              ) : subs.map((s: any) => {
                const isHosting = s.products?.type === 'hosting_plan';
                const isDomain = s.products?.type === 'domain_tld';
                const isActive = ['active', 'trialing'].includes(s.status);
                const isOrphan = isActive && (
                  (isHosting && !siteLinkSet.has(s.id)) ||
                  (isDomain && !domainLinkSet.has(s.stripe_subscription_id))
                );

                return (
                  <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${isOrphan ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/customers/${(s.users as any)?.id}`} className="font-medium text-admin-600 hover:text-admin-700">
                        {(s.users as any)?.full_name || (s.users as any)?.email || '\u2014'}
                      </Link>
                      <p className="text-xs text-gray-400">{(s.users as any)?.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{s.products?.name ?? '\u2014'}</td>
                    <td className="px-5 py-3.5">
                      {isHosting && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Server className="w-3 h-3" /> Hosting</span>}
                      {isDomain && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Globe className="w-3 h-3" /> Domain</span>}
                      {!isHosting && !isDomain && <span className="text-xs text-gray-400">Other</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={statusColor(s.status)}>{s.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      {isOrphan ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3" /> Orphaned
                        </span>
                      ) : isActive ? (
                        <span className="text-xs text-emerald-600">Linked</span>
                      ) : (
                        <span className="text-xs text-gray-400">&mdash;</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{s.billing_period ?? '\u2014'}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(s.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
