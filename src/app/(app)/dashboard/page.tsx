import { getEffectiveUserId } from '@/services/auth';
import { getUserDashboardCounts, getRecentUserServices, getRecentUserDomains } from '@/services/admin';
import { getActiveSubscription } from '@/services/subscriptions';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { Server, Globe, CreditCard, Plus } from 'lucide-react';

export default async function DashboardPage() {
  const userId = await getEffectiveUserId();

  const [
    { sitesCount, domainsCount },
    services,
    domains,
    subscription,
  ] = await Promise.all([
    getUserDashboardCounts(userId!),
    getRecentUserServices(userId!, 5),
    getRecentUserDomains(userId!, 5),
    getActiveSubscription(userId!),
  ]);

  const stats = [
    { label: 'Active sites', value: sitesCount, icon: Server, href: '/dashboard/sites' },
    { label: 'Domains', value: domainsCount, icon: Globe, href: '/dashboard/domains' },
    { label: 'Current plan', value: (subscription as any)?.plans?.name ?? 'No websites created', icon: CreditCard, href: '/dashboard/billing' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Welcome back. Here&apos;s your hosting overview.</p>
        </div>
        <Link href="/dashboard/add-site" className="btn-primary">
          <Plus className="w-4 h-4" /> Add site
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="card p-5 hover:border-brand-200 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent sites */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent sites</h2>
            <Link href="/dashboard/sites" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(!services || services.length === 0) ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No sites yet.{' '}
                <Link href="/dashboard/add-site" className="text-brand-600 hover:underline">Add your first site</Link>
              </div>
            ) : services.map((s: any) => (
              <div key={s.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.wp_cloud_url ?? s.server_region}</p>
                </div>
                <span className={statusColor(s.status)}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent domains</h2>
            <Link href="/dashboard/domains" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(!domains || domains.length === 0) ? (
              <div className="p-8 text-center text-sm text-gray-400">
                No domains yet.{' '}
                <Link href="/dashboard/domains/register" className="text-brand-600 hover:underline">Register one</Link>
              </div>
            ) : domains.map((d: any) => (
              <div key={d.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.domain_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Expires {formatDate(d.expiry_date)}</p>
                </div>
                <span className={statusColor(d.status)}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
