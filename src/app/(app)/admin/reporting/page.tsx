export const revalidate = 60;

import { createClient } from '@/lib/supabase-server';
import { getAllActiveSubscriptions, toMonthly, getAbandonedCheckouts } from '@/services/subscriptions';
import { getAdminUsageStats } from '@/services/usage';
import { formatCents } from '@/lib/utils';
import Link from 'next/link';
import { DollarSign, Users, Gauge, TrendingUp, Server, Phone, Brain, Mail, Globe, Cpu, ShoppingCart, ExternalLink } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { ReportingTabs } from './reporting-tabs';

export default async function ReportingPage() {
  const supabase = await createClient();

  const [activeSubscriptions, usageStats, abandonedCheckouts] = await Promise.all([
    getAllActiveSubscriptions(),
    getAdminUsageStats(),
    getAbandonedCheckouts(50),
  ]);

  const mrr = activeSubscriptions.reduce((sum: number, sub: any) => sum + toMonthly(sub), 0);
  const activeCount = activeSubscriptions.length;

  // Get usage breakdown across all users from logs
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  // This month's usage by service type
  const { data: thisMonthUsage } = await supabase
    .from('logs')
    .select('metadata')
    .eq('action', 'usage.recorded')
    .gte('created_at', monthStart);

  const usageByService: Record<string, number> = {};
  for (const log of thisMonthUsage ?? []) {
    const m = (log.metadata as any) ?? {};
    const svc = m.service_type ?? 'other';
    usageByService[svc] = (usageByService[svc] ?? 0) + Number(m.amount ?? 0);
  }

  // Last month's usage for comparison
  const { data: lastMonthUsage } = await supabase
    .from('logs')
    .select('metadata')
    .eq('action', 'usage.recorded')
    .gte('created_at', lastMonthStart)
    .lte('created_at', lastMonthEnd);

  let lastMonthTotal = 0;
  for (const log of lastMonthUsage ?? []) {
    lastMonthTotal += Number((log.metadata as any)?.amount ?? 0);
  }

  // AI token totals this month
  const { data: aiLogs } = await supabase
    .from('logs')
    .select('metadata')
    .eq('action', 'ai.usage')
    .gte('created_at', monthStart);

  let totalTokens = 0;
  let totalAiCalls = 0;
  const aiByAction: Record<string, { calls: number; tokens: number }> = {};
  for (const log of aiLogs ?? []) {
    const m = (log.metadata as any) ?? {};
    const tokens = m.total_tokens ?? 0;
    const action = m.ai_action ?? 'unknown';
    totalTokens += tokens;
    totalAiCalls++;
    if (!aiByAction[action]) aiByAction[action] = { calls: 0, tokens: 0 };
    aiByAction[action].calls++;
    aiByAction[action].tokens += tokens;
  }

  // Receptionist calls this month
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

  // Site & domain counts
  const { count: totalSites } = await supabase.from('sites').select('id', { count: 'exact', head: true }).in('status', ['active', 'provisioning']);
  const { count: totalDomains } = await supabase.from('domains').select('id', { count: 'exact', head: true }).eq('status', 'registered');
  const { count: totalPhoneNumbers } = await supabase.from('sites').select('id', { count: 'exact', head: true }).not('twilio_phone_number', 'is', null);

  // Financial calculations
  const subscriptionRevenue = mrr; // in cents
  const overageRevenue = usageStats.projectedOverageRevenue * 100; // convert to cents
  const totalRevenue = subscriptionRevenue + overageRevenue;

  // Estimated API costs (your costs, not customer costs)
  const anthropicCostPer1kTokens = 0.003; // ~$3/1M tokens for Haiku, rough estimate
  const twilioCostPerMinute = 0.02; // rough Twilio cost
  const estimatedAnthropicCost = (totalTokens / 1000) * anthropicCostPer1kTokens;
  const estimatedTwilioCost = totalCallMinutes * twilioCostPerMinute;
  const estimatedTotalApiCost = estimatedAnthropicCost + estimatedTwilioCost;

  const SERVICE_LABELS: Record<string, string> = {
    wordpress: 'WordPress Hosting',
    ai_tokens: 'AI Tokens',
    twilio_receptionist: 'Receptionist Calls',
    twilio_number: 'Phone Numbers',
    manual: 'Manual Adjustments',
  };

  const AI_ACTION_LABELS: Record<string, string> = {
    generate_page: 'Page Generation',
    studio_brief: 'Studio Brief',
    wireframe: 'Wireframe',
    draft_reply: 'Draft Reply',
    onboarding_brief: 'Onboarding Brief',
    intake_summary: 'Intake Summary',
    receptionist_call: 'Receptionist',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reporting</h1>
          <p className="text-sm text-gray-500 mt-0.5">Financial summary, platform usage, and API costs.</p>
        </div>
      </div>

      {/* Top-level stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Monthly Revenue" value={formatCents(totalRevenue)} icon={DollarSign} sub={`${formatCents(subscriptionRevenue)} subs + ${formatCents(overageRevenue)} overage`} color="green" />
        <StatCard label="Active Customers" value={activeCount} icon={Users} sub={`${totalSites ?? 0} sites · ${totalDomains ?? 0} domains`} color="blue" />
        <StatCard label="Platform Usage" value={`${Math.round(usageStats.totalUsage)} credits`} icon={Gauge} sub={`${lastMonthTotal > 0 ? Math.round(((usageStats.totalUsage - lastMonthTotal) / lastMonthTotal) * 100) : 0}% vs last month`} color="purple" />
        <StatCard label="API Costs" value={`$${estimatedTotalApiCost.toFixed(2)}`} icon={Cpu} sub="Estimated this month" color="amber" />
      </div>

      <ReportingTabs>
        {{
          financial: (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Subscription Revenue (MRR)</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCents(subscriptionRevenue)}/mo</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Projected Overage Revenue</span>
                    <span className="text-sm font-semibold text-amber-600">+${usageStats.projectedOverageRevenue}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Estimated API Costs</span>
                    <span className="text-sm font-semibold text-red-600">-${estimatedTotalApiCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-semibold text-gray-900">Estimated Margin</span>
                    <span className="text-sm font-bold text-emerald-600">{formatCents(totalRevenue - Math.round(estimatedTotalApiCost * 100))}/mo</span>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Key Metrics</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500">Avg Revenue/Customer</p>
                    <p className="text-lg font-bold text-gray-900">{activeCount > 0 ? formatCents(Math.round(totalRevenue / activeCount)) : '$0'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500">Avg Usage/Customer</p>
                    <p className="text-lg font-bold text-gray-900">{activeCount > 0 ? Math.round(usageStats.totalUsage / activeCount) : 0} cr</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500">Users Over Included</p>
                    <p className="text-lg font-bold text-amber-600">{usageStats.usersOverIncluded.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-4 py-3">
                    <p className="text-xs text-gray-500">Margin %</p>
                    <p className="text-lg font-bold text-emerald-600">{totalRevenue > 0 ? Math.round(((totalRevenue - estimatedTotalApiCost * 100) / totalRevenue) * 100) : 0}%</p>
                  </div>
                </div>
              </div>
            </div>
          ),

          usage: (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Usage by Service (This Month)</h3>
                <div className="space-y-2">
                  {Object.entries(usageByService).sort(([,a], [,b]) => b - a).map(([svc, amount]) => {
                    const total = usageStats.totalUsage || 1;
                    const pct = Math.round((amount / total) * 100);
                    return (
                      <div key={svc} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-40">{SERVICE_LABELS[svc] ?? svc}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-900 w-20 text-right">{Math.round(amount)} cr ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

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
                <h3 className="text-sm font-semibold text-gray-900 mb-4">API Usage & Estimated Costs (This Month)</h3>
                <div className="space-y-4">
                  {/* Anthropic */}
                  <div className="rounded-xl bg-purple-50/50 border border-purple-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-gray-900">Anthropic (Claude)</span>
                      </div>
                      <span className="text-sm font-bold text-purple-600">${estimatedAnthropicCost.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div><p className="text-xs text-gray-500">Total Tokens</p><p className="text-sm font-semibold">{totalTokens.toLocaleString()}</p></div>
                      <div><p className="text-xs text-gray-500">API Calls</p><p className="text-sm font-semibold">{totalAiCalls}</p></div>
                      <div><p className="text-xs text-gray-500">Avg Tokens/Call</p><p className="text-sm font-semibold">{totalAiCalls > 0 ? Math.round(totalTokens / totalAiCalls).toLocaleString() : 0}</p></div>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(aiByAction).sort(([,a], [,b]) => b.tokens - a.tokens).map(([action, stats]) => (
                        <div key={action} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">{AI_ACTION_LABELS[action] ?? action}</span>
                          <span className="text-gray-500">{stats.calls} calls · {stats.tokens.toLocaleString()} tokens</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Twilio */}
                  <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-semibold text-gray-900">Twilio</span>
                      </div>
                      <span className="text-sm font-bold text-blue-600">${estimatedTwilioCost.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><p className="text-xs text-gray-500">Total Calls</p><p className="text-sm font-semibold">{totalCalls}</p></div>
                      <div><p className="text-xs text-gray-500">Total Minutes</p><p className="text-sm font-semibold">{totalCallMinutes}</p></div>
                      <div><p className="text-xs text-gray-500">Phone Numbers</p><p className="text-sm font-semibold">{totalPhoneNumbers ?? 0}</p></div>
                    </div>
                  </div>

                  {/* Resend */}
                  <div className="rounded-xl bg-teal-50/50 border border-teal-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-teal-600" />
                        <span className="text-sm font-semibold text-gray-900">Resend (Email)</span>
                      </div>
                      <span className="text-xs text-gray-400">Tracked via Resend dashboard</span>
                    </div>
                  </div>

                  {/* wp.cloud */}
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-900">wp.cloud (Hosting)</span>
                      </div>
                      <span className="text-xs text-gray-400">Billed by Automattic</span>
                    </div>
                  </div>
                </div>
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
