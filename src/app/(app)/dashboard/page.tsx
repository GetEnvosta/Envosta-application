export const dynamic = 'force-dynamic';

import { getEffectiveUserId } from '@/services/auth';
import { getUserDashboardCounts, getRecentUserServices, getRecentUserDomains } from '@/services/admin';
import { getActiveSubscription } from '@/services/subscriptions';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { Server, Globe, Globe2, Plus, Rocket, CheckCircle, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';

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

  const isNew = !services || services.length === 0;
  const planName = (subscription as any)?.products?.name;
  const isTrial = (subscription as any)?.status === 'trialing';

  // New user onboarding view
  if (isNew) {
    return (
      <div>
        {/* Welcome hero */}
        <div className="card overflow-hidden mb-8">
          <div className="relative p-8 sm:p-12 bg-gradient-to-br from-gray-50 via-blue-50/50 to-green-50/30">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-100/20 rounded-full translate-y-1/2 -translate-x-1/4" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Welcome to Envosta</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight mb-3">
                Let&apos;s get your website live
              </h1>
              <p className="text-gray-600 max-w-lg mb-8 leading-relaxed">
                {planName
                  ? `You're on the ${planName} plan${isTrial ? ' (14-day free trial)' : ''}. Create your first site to get started — we'll handle the setup.`
                  : 'Choose a plan and create your first site. Every plan includes a 14-day free trial and personal onboarding.'}
              </p>

              {/* Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <div className="flex items-start gap-3 bg-white/70 rounded-xl p-4 border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Create your site</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pick a plan and we&apos;ll provision your WordPress site on enterprise infrastructure.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/70 rounded-xl p-4 border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">We set everything up</p>
                    <p className="text-xs text-gray-500 mt-0.5">Security, SSL, CDN, backups, SEO — all configured before you touch a thing.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white/70 rounded-xl p-4 border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">You go live</p>
                    <p className="text-xs text-gray-500 mt-0.5">Add your content, connect your domain, and launch. We&apos;re here if you need help.</p>
                  </div>
                </div>
              </div>

              <Link
                href="/dashboard/add-site"
                className="btn-primary text-sm inline-flex items-center gap-2 px-6 py-3"
              >
                <Rocket className="w-4 h-4" />
                Create Your First Site
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* What's included */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Enterprise Infrastructure</h3>
            <p className="text-xs text-gray-500 leading-relaxed">wp.cloud — the same platform behind WordPress.com. Auto-scaling, global CDN, 99.99% uptime.</p>
          </div>
          <div className="card p-5">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Security Handled</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Free SSL, WAF, daily backups, malware scanning, and auto-updates. All included.</p>
          </div>
          <div className="card p-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Personal Onboarding</h3>
            <p className="text-xs text-gray-500 leading-relaxed">Every plan starts with a consultation. We learn your business and set everything up for you.</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">While you wait</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/dashboard/domains/register" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <Globe2 className="w-5 h-5 text-gray-400 group-hover:text-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Register a domain</p>
                <p className="text-xs text-gray-400">Search for the perfect domain name</p>
              </div>
            </Link>
            <Link href="/dashboard/tickets/new?type=studio" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
              <Sparkles className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Request studio work</p>
                <p className="text-xs text-gray-400">Need design or development help?</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Existing user dashboard
  const stats = [
    { label: 'Active sites', value: sitesCount, icon: Server, href: '/dashboard/sites', color: 'blue' },
    { label: 'Domains', value: domainsCount, icon: Globe, href: '/dashboard/domains', color: 'purple' },
  ];

  const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', hover: 'group-hover:bg-blue-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', hover: 'group-hover:bg-purple-100' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'group-hover:bg-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', hover: 'group-hover:bg-amber-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', hover: 'group-hover:bg-red-100' },
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back{isTrial ? ` — you're on your free trial` : ''}.
          </p>
        </div>
        <Link href="/dashboard/add-site" className="btn-primary whitespace-nowrap shrink-0 inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add site
        </Link>
      </div>

      {/* Trial banner */}
      {isTrial && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">Free trial active — {planName} plan</p>
            <p className="text-xs text-emerald-600 mt-0.5">Your trial ends on {formatDate((subscription as any)?.current_period_end)}. You won&apos;t be charged until then.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stat-grid">
        {stats.map(s => {
          const c = colorMap[s.color] ?? colorMap.blue;
          return (
            <Link key={s.label} href={s.href} className="card p-5 hover:shadow-md transition-all group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${c.bg} ${c.text} ${c.hover}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={`text-2xl font-semibold ${s.color === 'red' ? 'text-red-600' : s.color === 'amber' ? 'text-amber-600' : 'text-gray-900'}`}>{s.value}</p>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  {(s as any).sub && <p className={`text-xs mt-0.5 ${s.color === 'red' ? 'text-red-500' : 'text-amber-500'}`}>{(s as any).sub}</p>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent sites + domains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="section-card-header">
            <h2 className="section-card-title">Recent sites</h2>
            <Link href="/dashboard/sites" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {services.map((s: any) => (
              <Link key={s.id} href={`/dashboard/sites/${s.id}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.wp_cloud_url ?? s.domain_name ?? s.server_region}</p>
                </div>
                <span className={statusColor(s.status)}>{s.status}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-card-header">
            <h2 className="section-card-title">Recent domains</h2>
            <Link href="/dashboard/domains" className="text-xs text-brand-600 hover:text-brand-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {(!domains || domains.length === 0) ? (
              <div className="p-8 text-center">
                <Globe2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">No domains yet</p>
                <Link href="/dashboard/domains/register" className="text-xs text-brand-600 hover:text-brand-700 font-medium">Register a domain →</Link>
              </div>
            ) : domains.map((d: any) => (
              <Link key={d.id} href={`/dashboard/domains/${d.id}`} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.domain_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.expiry_date ? `Expires ${formatDate(d.expiry_date)}` : d.status}</p>
                </div>
                <span className={statusColor(d.status)}>{d.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
