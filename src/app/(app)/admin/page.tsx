export const revalidate = 5;
import { getDashboardCounts, getRecentCustomers, getRecentActivity } from '@/services/admin';
import { getAllActiveSubscriptions, getAbandonedCheckoutCount, toMonthly } from '@/services/billing';
import { getRecentTicketsByType } from '@/services/tickets';
import { formatCents, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Users, Server, Globe, DollarSign, ArrowRight, MessageSquare, Sparkles, Phone, ShoppingCart, UserPlus } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { getCurrentUser, getUserProfile } from '@/services/auth';
import { AffiliateReferralCard } from '@/components/admin/affiliate-referral-card';

export default async function AdminDashboardPage() {
  const currentUser = await getCurrentUser();
  const currentProfile = currentUser ? await getUserProfile(currentUser.id) : null;
  const isAffiliate = currentProfile?.role === 'affiliate';
  const [
    { customersCount, servicesCount, domainsCount },
    recentUsers,
    recentLogs,
    activeSubscriptions,
    abandonedCount,
    studioTickets,
    supportTickets,
    salesTickets,
  ] = await Promise.all([
    getDashboardCounts(),
    getRecentCustomers(10),
    getRecentActivity(10),
    getAllActiveSubscriptions(),
    getAbandonedCheckoutCount(),
    getRecentTicketsByType('studio', 5),
    getRecentTicketsByType('support', 5),
    getRecentTicketsByType('onboarding', 5),
  ]);

  const mrr = activeSubscriptions.reduce(
    (sum: number, sub: any) => sum + toMonthly(sub), 0
  );

  const stats = [
    { label: 'Total customers', value: customersCount, icon: Users, color: 'blue' as const },
    { label: 'Active services', value: servicesCount, icon: Server, color: 'cyan' as const },
    { label: 'Active domains', value: domainsCount, icon: Globe, color: 'purple' as const },
    { label: 'Monthly revenue', value: formatCents(mrr), icon: DollarSign, sub: 'MRR', color: 'green' as const },
    { label: 'Abandoned carts', value: abandonedCount, icon: ShoppingCart, color: 'amber' as const },
  ];

  return (
    <div>
      {/* Affiliate referral card — only shown to affiliates */}
      {isAffiliate && <AffiliateReferralCard />}

      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform overview and recent activity.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid-5">
        {stats.map(s => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <Link href="/admin/customers?create-for-client=1" className="card p-4 hover:shadow-md transition-all flex items-center gap-4 group">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
            <UserPlus className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">Create for Client</p>
            <p className="text-xs text-gray-500">Set up an account + site for a client to claim</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 transition-colors" />
        </Link>
      </div>

      {/* Recent tickets by type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'Studio Requests', icon: Sparkles, tickets: studioTickets, type: 'studio' },
          { title: 'Support Tickets', icon: MessageSquare, tickets: supportTickets, type: 'support' },
          { title: 'Onboarding', icon: Phone, tickets: salesTickets, type: 'onboarding' },
        ].map(section => (
          <div key={section.type} className="card">
            <div className="section-card-header">
              <h2 className="section-card-title flex items-center gap-2">
                <section.icon className="w-4 h-4 text-gray-400" />
                {section.title}
              </h2>
              <Link href={`/admin/tickets?type=${section.type}`} className="text-xs text-admin-600 hover:text-admin-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {section.tickets.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">No {section.title.toLowerCase()} yet.</div>
              ) : section.tickets.map((t: any) => (
                <Link key={t.id} href={`/admin/tickets/${t.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-500">{(t.users as any)?.full_name || (t.metadata as any)?.contact_name || (t.metadata as any)?.contact_email || 'Anonymous'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                      t.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      t.status === 'closed' ? 'bg-gray-100 text-gray-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>{t.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent signups + activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="section-card-header">
            <h2 className="section-card-title">Recent signups</h2>
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
          <div className="section-card-header">
            <h2 className="section-card-title">Recent activity</h2>
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
