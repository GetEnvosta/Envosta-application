import { getEffectiveUserId } from '@/services/auth';
import { getSiteById } from '@/services/sites';
import { getUserDomainsForSite } from '@/services/domains';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteSiteButton } from '@/components/sites/delete-site-button';
import { SiteBackups } from '@/components/sites/site-backups';
import { SslStatus } from '@/components/sites/ssl-status';
import { SitePerformance } from '@/components/sites/site-performance';
import { SitePlanUpgrade, TrialActivate } from '@/components/sites/site-plan-upgrade';
import {
  ArrowLeft, ExternalLink, Globe, HardDrive, Server, MapPin,
  Shield, Layers, Package, Zap, Key, Calendar, User,
} from 'lucide-react';
import { ConnectedDomainSwitcher } from '@/components/sites/connected-domain-switcher';
import { SiteAddons } from '@/components/sites/site-addons';
import { SiteAccess } from '@/components/sites/site-access';

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getEffectiveUserId();
  if (!userId) notFound();

  const [site, domains] = await Promise.all([getSiteById(id), getUserDomainsForSite(userId)]);
  if (!site) notFound();

  const connectedDomain = (domains ?? []).find((d: any) => d.site_id === id) ?? null;
  const plan = (site as any).products;
  const sub = (site as any).subscriptions;
  const planName = plan?.name ?? 'Unknown';
  const planSlug: string = plan?.slug ?? '';
  const pm = plan?.metadata ?? {};
  const status: string = site.status ?? 'provisioning';
  const meta = (site as any).metadata ?? {};
  const siteUrl = site.wp_cloud_url;
  const siteDomain = siteUrl?.replace(/^https?:\/\//, '') ?? '';
  const storageUsed = (site.disk_usage_mb ?? 0) / 1024;
  const storageTotal = pm.storage_gb ?? 25;
  const storagePct = Math.min(100, (storageUsed / storageTotal) * 100);
  const isTrial = sub?.status === 'trialing';
  const isTopPlan = planSlug === 'performance' || planSlug === 'enterprise';

  const regions: Record<string, string> = { dca: 'US East', bur: 'US West', dfw: 'US Central', ams: 'EU West' };

  const statusDot: Record<string, string> = {
    active: 'bg-emerald-500',
    provisioning: 'bg-amber-500 animate-pulse',
    suspended: 'bg-red-500',
  };

  return (
    <div>
      <Link href="/dashboard/sites" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Sites
      </Link>

      {/* ═══ HERO ═══ */}
      <div className="card p-0 mb-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600" />

        <div className="p-6">
          {/* Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                <Globe className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-semibold text-gray-900">{site.label}</h1>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${statusDot[status] ?? 'bg-gray-400'}`} />
                    <span className="text-xs text-gray-500 capitalize">{status}</span>
                  </div>
                  {isTrial && <span className="badge-green text-[10px]">Trial</span>}
                </div>
                {siteUrl && (
                  <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-brand-600 transition-colors">
                    {siteDomain}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {siteUrl && (
                <>
                  <a href={`${siteUrl}/wp-admin`} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm py-2 px-4">WP Admin</a>
                  <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2 px-3">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 rounded-xl overflow-hidden mb-4">
            <Metric icon={<Server className="w-3.5 h-3.5" />} label="PHP" value={site.php_version ?? '8.4'} />
            <Metric icon={<MapPin className="w-3.5 h-3.5" />} label="Region" value={regions[site.server_region as string] ?? 'US East'} />
            {meta.site_ip && <Metric icon={<Globe className="w-3.5 h-3.5" />} label="IP" value={meta.site_ip} mono />}
            <Metric icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={formatDate(site.created_at)} />
          </div>

          {/* Storage */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-500 flex items-center gap-1.5"><HardDrive className="w-3 h-3" /> Storage</span>
              <span className="text-xs font-mono text-gray-600">{storageUsed.toFixed(1)} / {storageTotal} GB</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${storagePct > 85 ? 'bg-red-500' : storagePct > 60 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${storagePct}%` }} />
            </div>
          </div>

          {/* Plan info */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 mb-3">
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{planName}</p>
                <p className="text-xs text-gray-500">{pm.storage_gb ?? 25}GB &middot; {pm.php_memory_mb ?? 512}MB memory</p>
              </div>
            </div>
          </div>

          {/* Trial banner */}
          {isTrial && (
            <div className="mb-3">
              <TrialActivate siteId={id} planName={planName} trialEnd={sub?.current_period_end ?? new Date(Date.now() + 14 * 86400000).toISOString()} />
            </div>
          )}

          {/* Upgrade to next plan */}
          {!isTrial && !isTopPlan && (
            <div className="mb-3">
              <SitePlanUpgrade siteId={id} currentPlanSlug={planSlug} currentSortOrder={plan?.sort_order ?? 0} />
            </div>
          )}

          {/* Domain */}
          <div className="rounded-xl bg-gray-50 px-4 py-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Connected Domain</p>
            </div>
            <ConnectedDomainSwitcher siteId={id} currentDomainId={connectedDomain?.id ?? null} domains={domains ?? []} />
          </div>

          {/* WP credentials */}
          <div className="mt-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">WordPress Login</p>
            </div>
            <div className="text-xs text-blue-700 space-y-0.5">
              <p>Username: <span className="font-mono font-medium">{meta.wp_admin_user ?? 'envosta_admin'}</span></p>
              {meta.wp_admin_password ? (
                <p>Password: <span className="font-mono font-medium">{meta.wp_admin_password}</span></p>
              ) : (
                <p>Password was sent to your email. {siteUrl && (
                  <a href={`${siteUrl}/wp-login.php?action=lostpassword`} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Reset password</a>
                )}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PERFORMANCE & SECURITY ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Performance</h2>
          </div>
          <SitePerformance siteId={id} domain={siteDomain} />
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Security</h2>
          </div>
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">SSL Certificate</p>
            <SslStatus siteId={id} domain={siteDomain || connectedDomain?.domain_name || null} />
          </div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Backups</p>
          <SiteBackups siteId={id} wpCloudSiteId={site.wp_cloud_site_id} />
        </div>
      </div>

      {/* ═══ ACCESS ═══ */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">SFTP Access</h2>
        </div>
        <SiteAccess siteId={id} wpCloudSiteId={site.wp_cloud_site_id} />
      </div>

      {/* ═══ DANGER ZONE ═══ */}
      <div className="rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50/40 to-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-red-600">Delete Site</h3>
            <p className="text-xs text-gray-500 mt-0.5">This will permanently delete your site and cancel your subscription.</p>
          </div>
          <DeleteSiteButton siteId={site.id} siteName={site.label} />
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-sm font-semibold text-gray-900 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}
