export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase-server';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { AlertTriangle, Server, Globe, CreditCard, CheckCircle, ShoppingCart } from 'lucide-react';
import { getAbandonedCheckouts } from '@/services/subscriptions';
import { ExternalSyncCheck } from '@/components/admin/external-sync-check';

export default async function DiagnosticsPage() {
  const supabase = await createClient();

  // 1. Active subscriptions with NO site
  const { data: orphanedSubs } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id, status, billing_period, created_at, users(id, email, full_name), products(name, type)')
    .in('status', ['active', 'trialing'])
    .order('created_at', { ascending: false });

  const subsWithSites = new Set<string>();
  if (orphanedSubs?.length) {
    const subIds = orphanedSubs.map((s: any) => s.id);
    const { data: linkedSites } = await supabase.from('sites').select('subscription_id').in('subscription_id', subIds);
    for (const s of linkedSites ?? []) { if (s.subscription_id) subsWithSites.add(s.subscription_id); }
  }
  const hostingSubsNoSite = (orphanedSubs ?? []).filter((s: any) =>
    s.products?.type === 'hosting_plan' && !subsWithSites.has(s.id)
  );

  // 2. Active subscriptions (domain type) with NO registered domain
  const domainSubsAll = (orphanedSubs ?? []).filter((s: any) =>
    s.products?.type === 'domain_tld' || (s as any).metadata?.type === 'domain_renewal'
  );
  const domainSubsNoDomain: any[] = [];
  for (const ds of domainSubsAll) {
    const stripeSub = ds.stripe_subscription_id;
    const { data: linkedDom } = await supabase
      .from('domains')
      .select('id')
      .or(`metadata->renewal_stripe_subscription_id.eq.${stripeSub}`)
      .maybeSingle();
    if (!linkedDom) domainSubsNoDomain.push(ds);
  }

  // 3. Sites stuck in provisioning > 1 hour
  const { data: stuckSites } = await supabase
    .from('sites')
    .select('id, label, status, created_at, users(email)')
    .eq('status', 'provisioning')
    .lt('created_at', new Date(Date.now() - 3600000).toISOString());

  // 4. Sites marked "failed"
  const { data: failedSites } = await supabase
    .from('sites')
    .select('id, label, status, created_at, users(email)')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(20);

  // 5. Domains with status "pending" or "failed"
  const { data: problemDomains } = await supabase
    .from('domains')
    .select('id, domain_name, status, created_at, users(email)')
    .in('status', ['pending', 'failed'])
    .order('created_at', { ascending: false })
    .limit(20);

  // 6. Domains registered but not connected to any site
  const { data: unlinkedDomains } = await supabase
    .from('domains')
    .select('id, domain_name, status, created_at, users(email)')
    .eq('status', 'registered')
    .is('site_id', null)
    .order('created_at', { ascending: false })
    .limit(20);

  // 7. Abandoned checkouts (incomplete subscriptions)
  const abandonedCheckouts = await getAbandonedCheckouts(20);

  const totalIssues = hostingSubsNoSite.length + domainSubsNoDomain.length + (stuckSites?.length ?? 0) + (failedSites?.length ?? 0) + (problemDomains?.length ?? 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">System Diagnostics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Orphaned records, failed provisioning, and sync issues.</p>
        </div>
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${totalIssues === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {totalIssues === 0 ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {totalIssues === 0 ? 'All clear' : `${totalIssues} issues found`}
        </div>
      </div>

      {/* External service sync */}
      <ExternalSyncCheck />

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

      {/* Domain subscriptions without a registered domain */}
      <DiagCard
        icon={<Globe className="w-4 h-4" />}
        title="Domain Subscriptions — No Domain Record"
        count={domainSubsNoDomain.length}
        description="Customer is paying for a domain renewal but no domain record is linked."
      >
        {domainSubsNoDomain.map((s: any) => (
          <DiagRow key={s.id}
            primary={s.stripe_subscription_id?.slice(-12) ?? 'Unknown'}
            secondary={(s.users as any)?.email ?? 'Unknown'}
            date={s.created_at}
            link={s.stripe_subscription_id ? `https://dashboard.stripe.com/subscriptions/${s.stripe_subscription_id}` : '#'}
            external
          />
        ))}
      </DiagCard>

      {/* Stuck provisioning */}
      <DiagCard
        icon={<Server className="w-4 h-4" />}
        title="Stuck Provisioning (> 1 hour)"
        count={stuckSites?.length ?? 0}
        description="Sites that started provisioning but never completed. May need manual intervention."
      >
        {(stuckSites ?? []).map((s: any) => (
          <DiagRow key={s.id}
            primary={s.label}
            secondary={(s.users as any)?.email ?? 'Unknown'}
            date={s.created_at}
            link={`/admin/services/${s.id}`}
          />
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
          <DiagRow key={s.id}
            primary={s.label}
            secondary={(s.users as any)?.email ?? 'Unknown'}
            date={s.created_at}
            link={`/admin/services/${s.id}`}
          />
        ))}
      </DiagCard>

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

      {/* Unlinked domains */}
      <DiagCard
        icon={<Globe className="w-4 h-4" />}
        title="Registered Domains — Not Connected to Any Site"
        count={unlinkedDomains?.length ?? 0}
        description="These domains are registered but not linked to a hosted site."
        severity="low"
      >
        {(unlinkedDomains ?? []).map((d: any) => (
          <DiagRow key={d.id}
            primary={d.domain_name}
            secondary={(d.users as any)?.email ?? 'Unknown'}
            date={d.created_at}
          />
        ))}
      </DiagCard>

      {/* Abandoned checkouts */}
      <DiagCard
        icon={<ShoppingCart className="w-4 h-4" />}
        title="Abandoned Checkouts"
        count={abandonedCheckouts.length}
        description="Customers who started checkout but didn't complete payment. These auto-cancel after the configured Stripe timeout."
        severity="low"
      >
        {abandonedCheckouts.map((s: any) => (
          <DiagRow key={s.id}
            primary={(s.users as any)?.email ?? 'Unknown'}
            secondary={`${s.products?.name ?? 'Unknown product'} — created ${formatDate(s.created_at)}`}
            date={s.created_at}
            link={(s.users as any)?.id ? `/admin/customers/${(s.users as any).id}` : undefined}
          />
        ))}
      </DiagCard>
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
