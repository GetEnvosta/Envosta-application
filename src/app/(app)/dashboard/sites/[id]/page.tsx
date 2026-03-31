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
import {
  ArrowLeft, ExternalLink, Globe, HardDrive, Server, MapPin, Calendar,
  Shield, Layers, Lock, Package, Wifi, Cpu, Database,
} from 'lucide-react';
import { ConnectedDomainSwitcher } from '@/components/sites/connected-domain-switcher';
import { SiteAddons } from '@/components/sites/site-addons';
import { SiteAccess } from '@/components/sites/site-access';

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getEffectiveUserId();
  if (!userId) notFound();

  const [site, domains] = await Promise.all([
    getSiteById(id),
    getUserDomainsForSite(userId),
  ]);

  if (!site) notFound();

  const connectedDomain = (domains ?? []).find((d: any) => d.site_id === id) ?? null;
  const plan = (site as any).products;
  const planName = plan?.name ?? 'Unknown';
  const planSlug: string = plan?.slug ?? '';
  const planMeta = plan?.metadata ?? {};
  const status: string = site.status ?? 'provisioning';
  const meta = (site as any).metadata ?? {};
  const config = (site as any).config ?? {};
  const siteUrl = site.wp_cloud_url;
  const siteDomain = siteUrl?.replace(/^https?:\/\//, '') ?? '';

  const statusBadge =
    status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
    : status === 'provisioning' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
    : status === 'suspended' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
    : 'bg-gray-100 text-gray-600 ring-1 ring-gray-500/20';

  const regionLabels: Record<string, string> = { dca: 'US East', bur: 'US West', dfw: 'US Central', ams: 'EU West' };

  return (
    <div>
      <Link href="/dashboard/sites" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to sites
      </Link>

      {/* ════════════════════════════════════════════════════════
          CARD 1: SITE OVERVIEW
         ════════════════════════════════════════════════════════ */}
      <div className="card p-6 mb-6">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900">{site.label}</h1>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadge}`}>{status}</span>
            </div>
            {siteUrl && (
              <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-1">
                <Globe className="w-3.5 h-3.5" /> {siteDomain}
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {siteUrl && (
              <>
                <a href={`${siteUrl}/wp-admin`} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm py-2 px-4">
                  WP Admin
                </a>
                <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2 px-4">
                  <ExternalLink className="w-3.5 h-3.5" /> Visit
                </a>
              </>
            )}
          </div>
        </div>

        {/* Info pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Pill icon={<Layers className="w-3.5 h-3.5" />} label="Plan" value={planName} />
          <Pill icon={<HardDrive className="w-3.5 h-3.5" />} label="Storage" value={`${((site.disk_usage_mb ?? 0) / 1024).toFixed(1)} / ${planMeta.storage_gb ?? 25} GB`} />
          <Pill icon={<Server className="w-3.5 h-3.5" />} label="PHP" value={site.php_version ?? '8.4'} />
          <Pill icon={<MapPin className="w-3.5 h-3.5" />} label="Region" value={regionLabels[site.server_region as string] ?? 'US East'} />
          <Pill icon={<Cpu className="w-3.5 h-3.5" />} label="Workers" value={`${config.php_workers ?? planMeta.php_workers_default ?? 2} PHP`} />
          <Pill icon={<Database className="w-3.5 h-3.5" />} label="Memory" value={`${config.php_memory_mb ?? planMeta.php_memory_mb ?? 512} MB`} />
          {meta.site_ip && <Pill icon={<Wifi className="w-3.5 h-3.5" />} label="IP" value={meta.site_ip} mono />}
          <Pill icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={formatDate(site.created_at)} />
        </div>

        {/* Storage bar */}
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${Math.min(100, ((site.disk_usage_mb ?? 0) / ((planMeta.storage_gb ?? 25) * 1024)) * 100)}%` }} />
        </div>

        {/* Domain + Plan row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-gray-50 px-3.5 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Connected Domain</p>
            {connectedDomain ? (
              <p className="text-sm font-medium text-gray-900">{connectedDomain.domain_name}</p>
            ) : (
              <p className="text-sm text-gray-500">No domain connected</p>
            )}
            <ConnectedDomainSwitcher siteId={id} currentDomainId={connectedDomain?.id ?? null} domains={domains ?? []} />
          </div>
          <div className="rounded-lg bg-gray-50 px-3.5 py-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Plan & Add-ons</p>
            <p className="text-sm font-medium text-gray-900 mb-1">{planName}</p>
            <p className="text-xs text-gray-500 mb-2">{planMeta.storage_gb ?? 25} GB &middot; {planMeta.php_workers_default ?? 2} workers &middot; {planMeta.php_memory_mb ?? 512} MB</p>
            {planSlug !== 'enterprise' && planSlug !== 'performance' && (
              <Link href="/pricing" className="text-xs text-brand-600 hover:text-brand-700 font-medium">Upgrade plan</Link>
            )}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <SiteAddons siteId={id} />
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          CARD 2: PERFORMANCE & CACHING
         ════════════════════════════════════════════════════════ */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" /> Performance & Caching
        </h2>
        <p className="text-xs text-gray-500 mb-4">Manage edge cache and performance settings for your site.</p>
        <SitePerformance siteId={id} domain={siteDomain} />
      </div>

      {/* ════════════════════════════════════════════════════════
          CARD 3: BACKUPS & SECURITY
         ════════════════════════════════════════════════════════ */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" /> Backups & Security
        </h2>

        {/* SSL */}
        <div className="mb-4 pb-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">SSL Certificate</p>
          <SslStatus siteId={id} domain={siteDomain || connectedDomain?.domain_name || null} />
        </div>

        {/* Backups */}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Backups</p>
        <SiteBackups siteId={id} wpCloudSiteId={site.wp_cloud_site_id} />
      </div>

      {/* ════════════════════════════════════════════════════════
          CARD 4: ACCESS & SUBSCRIPTION
         ════════════════════════════════════════════════════════ */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-400" /> Access & Infrastructure
          </h2>
          <p className="text-xs text-gray-500 mb-4">SFTP credentials, SSH access, and site infrastructure details.</p>
          <SiteAccess siteId={id} wpCloudSiteId={site.wp_cloud_site_id} />
        </div>

        {/* Cancel */}
        <div className="p-6 bg-red-50/30">
          <h3 className="text-sm font-semibold text-red-600 mb-1">Cancel Site</h3>
          <p className="text-xs text-gray-500 mb-3">Cancel your subscription. Your data is preserved for 30 days.</p>
          <DeleteSiteButton siteId={site.id} siteName={site.label} />
        </div>
      </div>
    </div>
  );
}

function Pill({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-medium text-gray-900 truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
      </div>
    </div>
  );
}
