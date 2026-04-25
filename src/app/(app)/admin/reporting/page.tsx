export const revalidate = 60;

import { createClient } from '@/lib/supabase-server';
import { getAllActiveSubscriptions, toMonthly, getAbandonedCheckouts } from '@/services/billing';
import { formatCents } from '@/lib/utils';
import Link from 'next/link';
import { DollarSign, Users, Server, Phone, Globe, ShoppingCart, ExternalLink } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { ReportingTabs } from './reporting-tabs';

export default async function ReportingPage() {
  const supabase = await createClient();

  const [activeSubscriptions, abandonedCheckouts] = await Promise.all([
    getAllActiveSubscriptions(),
    getAbandonedCheckouts(50),
  ]);

  const mrr = activeSubscriptions.reduce((sum: number, sub: any) => sum + toMonthly(sub), 0);
  const activeCount = activeSubscriptions.length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: callLogs } = await supabase
    .from('logs')
    .select('metadata')
    .eq('action', 'receptionist.call')
    .gte('created_at', monthStart);

  let totalCallMinutes = 0;
  let totalCalls = 0;
  for (const log of callLogs ?? []) {
    const m = (log.metadata as any) ?? {};
    totalCallMinutes += m.duration_minutes ?? 0;
    totalCalls++;
  }

  const { count: totalSites } = await supabase.from('sites').select('id', { count: 'exact', head: true }).in('status', ['active', 'provisioning']);
  const { count: totalDomains } = await supabase.from('domains').select('id', { count: 'exact', head: true }).eq('status', 'registered');
  const { count: totalPhoneNumbers } = await supabase.from('sites').select('id', { count: 'exact', head: true }).not('twilio_phone_number', 'is', null);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reporting</h1>
          <p className="text-sm text-gray-500 mt-0.5">Subscriptions, accounts, and platform totals.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Monthly Revenue" value={formatCents(mrr)} icon={DollarSign} sub="Active subscription MRR" color="green" />
        <StatCard label="Active Customers" value={activeCount} icon={Users} sub={`${totalSites ?? 0} sites · ${totalDomains ?? 0} domains`} color="blue" />
        <StatCard label="Sites" value={totalSites ?? 0} icon={Server} sub="Active or provisioning" color="purple" />
        <StatCard label="Phone Numbers" value={totalPhoneNumbers ?? 0} icon={Phone} sub={`${totalCalls} calls this month`} color="amber" />
      </div>

      <ReportingTabs>
        {{
          financial: (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Subscription Revenue (MRR)</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCents(mrr)}/mo</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Avg Revenue / Customer</span>
                    <span className="text-sm font-semibold text-gray-900">{activeCount > 0 ? formatCents(Math.round(mrr / activeCount)) : '$0'}</span>
                  </div>
                </div>
              </div>
            </div>
          ),
          usage: (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-2"><Server className="w-4 h-4 text-blue-500" /><span className="text-xs text-gray-500 uppercase tracking-wider">Sites</span></div>
                  <p className="text-2xl font-bold text-gray-900">{totalSites ?? 0}</p>
                  <p className="text-xs text-gray-400">active</p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-2"><Globe className="w-4 h-4 text-purple-500" /><span className="text-xs text-gray-500 uppercase tracking-wider">Domains</span></div>
                  <p className="text-2xl font-bold text-gray-900">{totalDomains ?? 0}</p>
                  <p className="text-xs text-gray-400">registered</p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-2"><Phone className="w-4 h-4 text-emerald-500" /><span className="text-xs text-gray-500 uppercase tracking-wider">Phone Numbers</span></div>
                  <p className="text-2xl font-bold text-gray-900">{totalPhoneNumbers ?? 0}</p>
                  <p className="text-xs text-gray-400">active</p>
                </div>
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-2"><Phone className="w-4 h-4 text-amber-500" /><span className="text-xs text-gray-500 uppercase tracking-wider">Calls</span></div>
                  <p className="text-2xl font-bold text-gray-900">{totalCalls}</p>
                  <p className="text-xs text-gray-400">{totalCallMinutes} minutes</p>
                </div>
              </div>
            </div>
          ),
          api: (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Provider Status</h3>
                <p className="text-sm text-gray-500">Detailed provider cost reporting has been removed with the credit system. Check each provider&apos;s dashboard directly for usage and billing.</p>
              </div>
            </div>
          ),
          abandoned: (
            <div className="space-y-4">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Abandoned Checkouts</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Customers who started checkout but didn&apos;t complete payment.</p>
                  </div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{abandonedCheckouts.length} total</span>
                </div>
                {abandonedCheckouts.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">No abandoned checkouts found.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {abandonedCheckouts.map((s: any) => {
                      const email = (s.users as any)?.email ?? 'Unknown';
                      const name = (s.users as any)?.full_name;
                      const userId = (s.users as any)?.id;
                      const product = s.products?.name ?? 'Unknown product';
                      const date = new Date(s.created_at);
                      const ago = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={s.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                              <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{name || email}</p>
                              <p className="text-xs text-gray-500">{product} · {ago === 0 ? 'today' : `${ago}d ago`}</p>
                            </div>
                          </div>
                          {userId && (
                            <Link href={`/admin/customers/${userId}`} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                              View <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ),
        }}
      </ReportingTabs>
    </div>
  );
}
