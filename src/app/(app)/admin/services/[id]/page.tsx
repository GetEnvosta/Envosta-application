export const dynamic = 'force-dynamic';

import { getServiceDetailById, getServiceDomains, getServiceLogs } from '@/services/sites';
import { formatDate, formatDateTime, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { DeleteSiteButton } from '@/components/sites/delete-site-button';
import { ResourceControls } from '@/components/admin/resource-controls';
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Globe,
  HardDrive,
  Layers,
  Package,
  Server,
  User,
  Wifi,
  Wrench,
} from 'lucide-react';
import { PlanSwitcher } from '@/components/sites/plan-switcher';
import { SiteAddons } from '@/components/sites/site-addons';
import { CancelSubscriptionButton } from '@/components/admin/cancel-subscription-button';
import { AdminSiteActions } from '@/components/admin/admin-site-actions';

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await getServiceDetailById(id);

  if (!service) {
    return (
      <div>
        <Link
          href="/admin/services"
          className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </Link>
        <div className="card p-12 text-center">
          <Server className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Service not found.</p>
        </div>
      </div>
    );
  }

  const [domains, logs] = await Promise.all([
    getServiceDomains(service.id),
    getServiceLogs(service.id, 20),
  ]);

  const owner = service.users as any;
  const plan = service.products as any;
  const meta = (service as any).metadata ?? {};

  return (
    <div>
      <Link
        href="/admin/services"
        className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Services
      </Link>

      {/* ── Header ── */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold text-gray-900">{service.label}</h1>
              <span className={statusColor(service.status)}>{service.status}</span>
            </div>
            <p className="text-sm text-gray-500">
              {plan?.name ?? 'No plan'} &middot; {service.region ?? 'dca'} &middot; Created {formatDate(service.created_at)}
            </p>
          </div>
          {service.wp_cloud_url && (
            <a
              href={service.wp_cloud_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm py-1.5 px-3 inline-flex items-center gap-1.5 shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Site
            </a>
          )}
        </div>
      </div>

      {/* ── Two-column: Info + Owner ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Site details */}
        <div className="lg:col-span-2 card p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Site Details</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-sm">
            <div>
              <dt className="text-gray-400 text-xs">Plan</dt>
              <dd className="font-medium text-gray-900">{plan?.name ?? '\u2014'}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs">Region</dt>
              <dd className="font-medium text-gray-900">{service.region ?? 'US East'}</dd>
            </div>
            {service.php_version && (
              <div>
                <dt className="text-gray-400 text-xs">PHP</dt>
                <dd className="font-medium text-gray-900">{service.php_version}</dd>
              </div>
            )}
            {service.wp_cloud_site_id && (
              <div>
                <dt className="text-gray-400 text-xs">wp.cloud ID</dt>
                <dd className="font-mono text-xs text-gray-700">{service.wp_cloud_site_id}</dd>
              </div>
            )}
            {meta.site_ip && (
              <div>
                <dt className="text-gray-400 text-xs">Site IP</dt>
                <dd className="font-mono text-xs text-gray-700">{meta.site_ip}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-400 text-xs">Provisioned</dt>
              <dd className="font-medium text-gray-900">{formatDate(service.provisioned_at ?? service.created_at)}</dd>
            </div>
            {service.disk_usage_mb != null && (
              <div>
                <dt className="text-gray-400 text-xs">Disk Usage</dt>
                <dd className="font-medium text-gray-900">{service.disk_usage_mb} MB</dd>
              </div>
            )}
            {service.bandwidth_usage_mb != null && (
              <div>
                <dt className="text-gray-400 text-xs">Bandwidth</dt>
                <dd className="font-medium text-gray-900">{service.bandwidth_usage_mb} MB</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Owner */}
        {owner && (
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Owner</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-admin-100 text-admin-700 flex items-center justify-center text-sm font-semibold shrink-0">
                {(owner.full_name?.[0] || owner.email?.[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0">
                <Link
                  href={`/admin/customers/${owner.id}`}
                  className="text-sm font-medium text-admin-600 hover:text-admin-700 block truncate"
                >
                  {owner.full_name || 'Unnamed'}
                </Link>
                <p className="text-xs text-gray-500 truncate">{owner.email}</p>
                {owner.company_name && (
                  <p className="text-xs text-gray-400 truncate">{owner.company_name}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Resource Controls ── */}
      <div className="mb-6">
        <ResourceControls
          siteId={service.id}
          wpCloudSiteId={service.wp_cloud_site_id}
          config={service.config ?? {}}
          planMetadata={plan?.metadata ?? {}}
        />
      </div>

      {/* ── Two-column: Plan + Add-ons ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-400" />
            Change Plan
          </h2>
          <p className="text-xs text-gray-500 mb-4">Upgrade or downgrade. Updates wp.cloud + Stripe.</p>
          <PlanSwitcher siteId={service.id} currentPlanId={service.product_id} />
        </div>

        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            Add-ons
          </h2>
          <p className="text-xs text-gray-500 mb-4">Toggle per-site add-ons. Updates Stripe + wp.cloud.</p>
          <SiteAddons siteId={service.id} />
        </div>
      </div>

      {/* ── Domains ── */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Domains ({domains.length})</h2>
        </div>
        {domains.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No domains linked.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Domain</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {domains.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{d.domain_name ?? d.name}</td>
                    <td className="px-5 py-3"><span className={statusColor(d.status)}>{d.status}</span></td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Recent Logs ── */}
      <div className="card overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Recent Logs</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No logs recorded.</div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{log.action}</p>
                  <span className="text-xs text-gray-400">{formatDateTime(log.created_at)}</span>
                </div>
                {log.message && <p className="text-xs text-gray-500 mt-0.5">{log.message}</p>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Admin Actions (fallback) ── */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-gray-400" />
          Admin Actions
        </h2>
        <p className="text-xs text-gray-500 mb-4">Manual provisioning and domain management if webhook failed.</p>
        <AdminSiteActions
          siteId={service.id}
          wpCloudSiteId={service.wp_cloud_site_id}
          userId={service.user_id}
          subscriptionId={service.subscription_id}
          status={service.status}
        />
      </div>

      {/* ── Danger Zone ── */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-4">Danger Zone</h2>
        <div className="flex flex-wrap items-center gap-3">
          {service.status === 'active' && (
            <CancelSubscriptionButton siteId={service.id} siteName={service.label} />
          )}
          <DeleteSiteButton
            siteId={service.id}
            siteName={service.label}
            redirectTo="/admin/services"
            isAdmin={true}
          />
        </div>
        <p className="text-xs text-gray-400 mt-3">Cancel stops billing with 30-day recovery. Delete permanently removes from wp.cloud.</p>
      </div>
    </div>
  );
}
