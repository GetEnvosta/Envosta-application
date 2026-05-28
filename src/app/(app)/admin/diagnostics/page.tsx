export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase-server';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { AlertTriangle, Server, Globe, CreditCard, CheckCircle, Activity, ScrollText } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
// External sync now integrated into SystemHealthChecks recheck button
import { getAdminLogs } from '@/services/admin';
import { SystemHealthChecks } from '@/app/(app)/admin/logs/health-checks';
import AdminEmailsPage from '@/app/(app)/admin/emails/page';
import { CouponManager } from '@/components/admin/coupon-manager';
import { SystemTabs } from './system-tabs';
import { LifecycleReference } from './lifecycle-reference';
import { ProvisionButton } from '@/components/admin/provision-button';
import { UnlinkedStripeProducts } from '@/components/admin/unlinked-stripe-products';
import { formatDateTime } from '@/lib/utils';

export default async function DiagnosticsPage() {
  const supabase = await createClient();

  // 1. Active subscriptions with NO site — read from stripe.* via
  //    the new admin billing helper (returns user + product shape-compat
  //    fields). Account-centric: a hosting sub is "orphaned" if the
  //    owner has no active sites.
  const { getAllSubscriptionsAdmin } = await import('@/services/billing');
  const allSubs = await getAllSubscriptionsAdmin(500);
  const aliveSubs = allSubs.filter((s: any) => ['active', 'trialing'].includes(s.status));

  const userIdsWithSites = new Set<string>();
  const customerUserIds = aliveSubs.map((s: any) => s.users?.id).filter(Boolean);
  if (customerUserIds.length > 0) {
    const { data: linkedSites } = await supabase
      .from('sites')
      .select('user_id')
      .in('user_id', customerUserIds)
      .not('status', 'in', '("cancelled","deleted")');
    for (const s of linkedSites ?? []) { if (s.user_id) userIdsWithSites.add(s.user_id); }
  }
  const hostingSubsNoSite = aliveSubs.filter((s: any) =>
    s.products?.type === 'hosting_plan' && s.users?.id && !userIdsWithSites.has(s.users.id),
  );

  // 2. Sites stuck in provisioning > 1 hour
  const { data: stuckSites } = await supabase
    .from('sites')
    .select('id, label, status, created_at, metadata, users(email)')
    .eq('status', 'provisioning')
    .lt('created_at', new Date(Date.now() - 3600000).toISOString());

  // 3. Sites marked "failed"
  const { data: failedSites } = await supabase
    .from('sites')
    .select('id, label, status, created_at, metadata, users(email)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(20);

  // 4. Domains with status "pending" or "failed"
  const { data: problemDomains } = await supabase
    .from('domains')
    .select('id, domain_name, status, created_at, users(email)')
    .in('status', ['pending', 'failed'])
    .order('created_at', { ascending: false })
    .limit(20);

  const totalIssues = hostingSubsNoSite.length + (stuckSites?.length ?? 0) + (failedSites?.length ?? 0) + (problemDomains?.length ?? 0);

  // Fetch logs for the logs tab
  const logs = await getAdminLogs({}, 50);

  // Product catalog moved entirely to /admin/settings (Plans / Addons /
  // Services / TLDs). Diagnostics no longer fetches it.

  const levelBadge: Record<string, string> = { info: 'badge-blue', warn: 'badge-yellow', error: 'badge-red', debug: 'badge-gray' };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Health</h1>
          <p className="text-sm text-gray-500 mt-0.5">System diagnostics, lifecycle docs, logs, email previews, and promotions.</p>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${totalIssues === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {totalIssues === 0 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {totalIssues === 0 ? 'All clear' : `${totalIssues} issues found`}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Issues" value={totalIssues} icon={AlertTriangle} color={totalIssues > 0 ? 'red' : 'green'} />
        <StatCard label="Orphaned Subs" value={hostingSubsNoSite.length} icon={CreditCard} color={hostingSubsNoSite.length > 0 ? 'amber' : 'gray'} />
        <StatCard label="Stuck Sites" value={(stuckSites?.length ?? 0) + (failedSites?.length ?? 0)} icon={Server} color={(stuckSites?.length ?? 0) + (failedSites?.length ?? 0) > 0 ? 'amber' : 'gray'} />
        <StatCard label="Problem Domains" value={problemDomains?.length ?? 0} icon={Globe} color={(problemDomains?.length ?? 0) > 0 ? 'amber' : 'gray'} />
      </div>

      <SystemTabs>
        {{
          health: (
            <div>
      <SystemHealthChecks />

      {/* Hosting subscriptions without a site */}
      <DiagCard
        icon={<Server className="w-4 h-4" />}
        title="Active Hosting Subscriptions — No Site"
        count={hostingSubsNoSite.length}
        description="Customer is paying but no wp.cloud site exists. Needs manual provisioning."
      >
        {hostingSubsNoSite.map((s: any) => (
          <DiagRow key={s.id}
            primary={s.products?.name ?? 'Unknown plan'}
            secondary={`${(s.users as any)?.email ?? 'Unknown'} — ${s.status} (${s.billing_period})`}
            date={s.created_at}
            link={`/admin/customers/${(s.users as any)?.id}`}
          />
        ))}
      </DiagCard>

      {/* "Domain subscriptions without a record" is not a real drift
          surface — domain renewals are not Stripe subs. */}

      {/* Stuck provisioning */}
      <DiagCard
        icon={<Server className="w-4 h-4" />}
        title="Stuck Provisioning (> 1 hour)"
        count={stuckSites?.length ?? 0}
        description="Sites that started provisioning but never completed. The cron auto-retries with backoff (5/10/20/40/80 min, max 5 attempts). Use Retry to force another attempt."
      >
        {(stuckSites ?? []).map((s: any) => (
          <StuckSiteRow key={s.id} site={s} />
        ))}
      </DiagCard>

      {/* Failed sites */}
      <DiagCard
        icon={<Server className="w-4 h-4" />}
        title="Failed Sites"
        count={failedSites?.length ?? 0}
        description="Sites where provisioning failed entirely."
      >
        {(failedSites ?? []).map((s: any) => (
          <StuckSiteRow key={s.id} site={s} />
        ))}
      </DiagCard>

      {/* Stripe products not linked to a DB product */}
      <UnlinkedStripeProducts />

      {/* Problem domains */}
      <DiagCard
        icon={<Globe className="w-4 h-4" />}
        title="Pending / Failed Domains"
        count={problemDomains?.length ?? 0}
        description="Domains that didn't register successfully at OpenSRS."
      >
        {(problemDomains ?? []).map((d: any) => (
          <DiagRow key={d.id}
            primary={d.domain_name}
            secondary={`${(d.users as any)?.email ?? 'Unknown'} — ${d.status}`}
            date={d.created_at}
          />
        ))}
      </DiagCard>


            </div>
          ),

          lifecycle: <LifecycleReference />,

          logs: (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Level</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {(logs ?? []).map((log: any) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-5 py-2.5 text-xs font-mono text-gray-700">{log.action}</td>
                      <td className="px-5 py-2.5 text-xs text-gray-500 max-w-[300px] truncate">{log.details ?? '—'}</td>
                      <td className="px-5 py-2.5"><span className={levelBadge[log.level] ?? 'badge-gray'}>{log.level}</span></td>
                      <td className="px-5 py-2.5 text-xs text-gray-400">{formatDateTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ),

          emails: <AdminEmailsPage />,

          promotions: <CouponManager />,
        }}
      </SystemTabs>
    </div>
  );
}

function DiagCard({ icon, title, count, description, severity = 'normal', children }: {
  icon: React.ReactNode; title: string; count: number; description: string; severity?: 'normal' | 'low'; children: React.ReactNode;
}) {
  const color = count === 0 ? 'border-emerald-100' : severity === 'low' ? 'border-blue-100' : 'border-amber-200';
  return (
    <div className={`card overflow-hidden mb-4 border-l-4 ${color}`}>
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{icon}</span>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${count === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="px-5 py-4 text-sm text-gray-400">No issues.</div>
      ) : (
        <div>
          <p className="px-5 py-2 text-xs text-gray-500 bg-gray-50">{description}</p>
          <div className="divide-y divide-gray-100">{children}</div>
        </div>
      )}
    </div>
  );
}

function StuckSiteRow({ site }: { site: any }) {
  const meta = (site.metadata as any) ?? {};
  const attempts = meta.provision_attempts ?? 0;
  const givingUp = !!meta.provision_giving_up;
  const lastAt = meta.provision_last_attempt_at ? formatDate(meta.provision_last_attempt_at) : null;

  return (
    <div className="px-5 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/services/${site.id}`} className="text-sm font-medium text-gray-900 hover:text-admin-700 truncate block">
          {site.label || '(unnamed)'}
        </Link>
        <p className="text-xs text-gray-500 truncate">
          {(site.users as any)?.email ?? 'Unknown'}
          {attempts > 0 && (
            <>
              {' · '}
              <span className={givingUp ? 'text-red-600 font-medium' : 'text-amber-600'}>
                {attempts} auto-retr{attempts === 1 ? 'y' : 'ies'}
                {givingUp && ' · gave up'}
              </span>
              {lastAt && <span className="text-gray-400"> · last {lastAt}</span>}
            </>
          )}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(site.created_at)}</span>
        <ProvisionButton siteId={site.id} label={site.label || 'site'} />
      </div>
    </div>
  );
}

function DiagRow({ primary, secondary, date, link, external }: {
  primary: string; secondary: string; date: string; link?: string; external?: boolean;
}) {
  const content = (
    <div className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
      <div>
        <p className="text-sm font-medium text-gray-900">{primary}</p>
        <p className="text-xs text-gray-500">{secondary}</p>
      </div>
      <span className="text-xs text-gray-400">{formatDate(date)}</span>
    </div>
  );
  if (link) {
    return external
      ? <a href={link} target="_blank" rel="noopener noreferrer">{content}</a>
      : <Link href={link}>{content}</Link>;
  }
  return content;
}
