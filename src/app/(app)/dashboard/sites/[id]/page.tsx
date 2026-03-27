import { getEffectiveUserId } from '@/services/auth';
import { getSiteById } from '@/services/sites';
import { getUserDomainsForSite } from '@/services/domains';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteSiteButton } from '@/components/sites/delete-site-button';
import { SiteBackups } from '@/components/sites/site-backups';
import { SslStatus } from '@/components/sites/ssl-status';
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  HardDrive,
  Server,
  MapPin,
  Calendar,
  Activity,
  Shield,
  Copy,
  AlertTriangle,
  Layers,
  Lock,
  Package,
} from 'lucide-react';
import { ConnectedDomainSwitcher } from '@/components/sites/connected-domain-switcher';
import { PlanSwitcher } from '@/components/sites/plan-switcher';
import { SiteAddons } from '@/components/sites/site-addons';

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

  // Find the domain currently connected to this site
  const connectedDomain = (domains ?? []).find((d: any) => d.site_id === id) ?? null;

  const planName = (site as any).plans?.name ?? 'Unknown';
  const planSlug: string = (site as any).plans?.slug ?? '';
  const status: string = site.status ?? 'provisioning';
  // All plans include staging (wp.cloud provides 1 non-billable staging per site)

  const statusBadge =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
      : status === 'provisioning'
        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
        : status === 'suspended'
          ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
          : 'bg-gray-100 text-gray-600 ring-1 ring-gray-500/20';


  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/sites"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to sites
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900">{site.label}</h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadge}`}
            >
              {status}
            </span>
          </div>
          {site.wp_cloud_url && (
            <a
              href={site.wp_cloud_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-1"
            >
              <Globe className="w-3.5 h-3.5" />
              {site.wp_cloud_url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {site.wp_cloud_url && (
            <>
              <a
                href={`${site.wp_cloud_url}/wp-admin`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-sm py-2 px-4"
              >
                Open WP Admin
              </a>
              <a
                href={site.wp_cloud_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-sm py-2 px-4"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Visit Site
              </a>
            </>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1.5">
            <Layers className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Plan</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{planName}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1.5">
            <HardDrive className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Storage</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {((site.disk_usage_mb ?? 0) / 1024).toFixed(1)} GB of {(site.plans as any)?.storage_gb ?? (site.plans as any)?.disk_gb ?? 25} GB
          </p>
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(100, ((site.disk_usage_mb ?? 0) / (((site.plans as any)?.storage_gb ?? 25) * 1024)) * 100)}%` }} />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1.5">
            <Server className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">PHP Version</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{site.php_version ?? '8.4'}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1.5">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Region</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {{ dca: 'US East', bur: 'US West', dfw: 'US Central', ams: 'EU West' }[site.server_region as string] ?? site.server_region ?? 'US East'}
          </p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1.5">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Created</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{formatDate(site.created_at)}</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1.5">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Status</span>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadge}`}
          >
            {status}
          </span>
        </div>

        {(site as any).metadata?.site_ip && (
          <div className="card p-5">
            <div className="flex items-center gap-2 text-gray-500 mb-1.5">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Site IP</span>
            </div>
            <p className="text-sm font-mono font-semibold text-gray-900">{(site as any).metadata.site_ip}</p>
            <p className="text-xs text-gray-400 mt-1">Point your domain A record here</p>
          </div>
        )}
      </div>

      {/* Change Plan */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-400" />
          Change Plan
        </h2>
        <p className="text-sm text-gray-500 mb-4">Upgrade or downgrade your hosting plan. Changes take effect immediately with prorated billing.</p>
        <PlanSwitcher siteId={id} currentPlanId={site.plan_id} />
      </div>

      {/* Add-ons */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          Add-ons
        </h2>
        <p className="text-sm text-gray-500 mb-4">Enable or disable add-ons for this site. Billing is prorated.</p>
        <SiteAddons siteId={id} />
      </div>

      {/* Connected Domain */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          Connected Domain
        </h2>
        <p className="text-sm text-gray-500 mb-4">Choose which domain is connected to this site.</p>
        <ConnectedDomainSwitcher
          siteId={id}
          currentDomainId={connectedDomain?.id ?? null}
          domains={domains ?? []}
        />
      </div>

      {/* Backups */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Copy className="w-4 h-4 text-gray-400" />
          Backups
        </h2>
        <SiteBackups siteId={id} wpCloudSiteId={site.wp_cloud_site_id} />
      </div>

      {/* Staging */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          Staging
        </h2>
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-sm text-gray-700">Staging environment included</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Create a staging copy of your site to test changes safely before going live.
            </p>
          </div>
          <button className="btn-secondary text-sm py-2 px-4 opacity-50 cursor-not-allowed" disabled title="Coming soon">Create Staging</button>
        </div>
      </div>

      {/* SSL */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          SSL Certificate
        </h2>
        <SslStatus siteId={id} domain={site.wp_cloud_url?.replace('https://', '') ?? connectedDomain?.domain_name ?? null} />
      </div>

      {/* Cancel Site */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Cancel Site
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Cancel your subscription and remove this site from your dashboard. Your site data is preserved for 30 days — contact support to restore it.
        </p>
        <DeleteSiteButton siteId={site.id} siteName={site.label} />
      </div>
    </div>
  );
}
