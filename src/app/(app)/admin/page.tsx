import { getDashboardCounts, getRecentCustomers, getRecentActivity } from '@/services/admin';
import { getAllActiveSubscriptions } from '@/services/subscriptions';
import { formatCents, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Users, Server, Globe, DollarSign, Plus, ArrowRight } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';

export default async function AdminDashboardPage() {
  const [
    { customersCount, servicesCount, domainsCount },
    recentUsers,
    recentLogs,
    activeSubscriptions,
  ] = await Promise.all([
    getDashboardCounts(),
    getRecentCustomers(10),
    getRecentActivity(10),
    getAllActiveSubscriptions(),
  ]);

  const mrr = activeSubscriptions.reduce(
    (sum: number, sub: any) => sum + (sub.plans?.price_monthly ?? 0), 0
  );

  const stats = [
    { label: 'Total customers', value: customersCount, icon: Users },
    { label: 'Active services', value: servicesCount, icon: Server },
    { label: 'Active domains', value: domainsCount, icon: Globe },
    { label: 'Monthly revenue', value: formatCents(mrr), icon: DollarSign, sub: 'MRR' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform overview and recent activity.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Recent signups + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent signups</h2>
            <Link href="/admin/customers" className="text-xs text-admin-600 hover:text-admin-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(!recentUsers || recentUsers.length === 0) ? (
              <div className="p-8 text-center text-sm text-gray-400">No customers yet.</div>
            ) : recentUsers.map((u: any) => (
              <Link key={u.id} href={`/admin/customers/${u.id}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-admin-100 text-admin-700 flex items-center justify-center text-xs font-semibold">
                    {(u.full_name?.[0] || u.email[0] || '?').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{u.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatDate(u.created_at)}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
            <Link href="/admin/logs" className="text-xs text-admin-600 hover:text-admin-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(!recentLogs || recentLogs.length === 0) ? (
              <div className="p-8 text-center text-sm text-gray-400">No activity yet.</div>
            ) : recentLogs.map((log: any) => (
              <div key={log.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{log.action}</p>
                  <span className="text-xs text-gray-400">{formatDate(log.created_at)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(log.users as any)?.full_name || (log.users as any)?.email || 'System'} — {log.message || 'No details'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
