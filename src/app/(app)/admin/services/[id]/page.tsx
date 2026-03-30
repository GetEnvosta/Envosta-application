export const dynamic = 'force-dynamic';

import { getServiceDetailById, getServiceDomains, getServiceLogs } from '@/services/sites';
import { formatDate, formatDateTime, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { DeleteSiteButton } from '@/components/sites/delete-site-button';
import { ResourceControls } from '@/components/admin/resource-controls';
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Layers,
  Package,
  Server,
  User,
  Wrench,
  HardDrive,
  Wifi,
  Clock,
  CreditCard,
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

      {/* ── Site Overview ── */}
      <div className="card p-6 mb-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
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

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <InfoCell icon={<Layers className="w-3.5 h-3.5" />} label="Plan" value={plan?.name ?? '\u2014'} />
          <InfoCell icon={<Server className="w-3.5 h-3.5" />} label="Region" value={service.region ?? 'US East'} />
          {service.php_version && (
            <InfoCell icon={<Package className="w-3.5 h-3.5" />} label="PHP" value={service.php_version} />
          )}
          {meta.site_ip && (
            <InfoCell icon={<Wifi className="w-3.5 h-3.5" />} label="Site IP" value={meta.site_ip} mono />
          )}
          {service.wp_cloud_site_id && (
            <InfoCell icon={<CreditCard className="w-3.5 h-3.5" />} label="wp.cloud ID" value={service.wp_cloud_site_id} mono />
          )}
          <InfoCell icon={<Clock className="w-3.5 h-3.5" />} label="Provisioned" value={formatDate(service.provisioned_at ?? service.created_at)} />
          {service.disk_usage_mb != null && (
            <InfoCell icon={<HardDrive className="w-3.5 h-3.5" />} label="Disk" value={`${service.disk_usage_mb} MB`} />
          )}
          {service.bandwidth_usage_mb != null && (
            <InfoCell icon={<Wifi className="w-3.5 h-3.5" />} label="Bandwidth" value={`${service.bandwidth_usage_mb} MB`} />
          )}
        </div>

        {/* Owner */}
        {owner && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-gray-50 text-sm mb-3">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-600">Owner:</span>
            <Link href={`/admin/customers/${owner.id}`} className="font-medium text-admin-600 hover:text-admin-700">
              {owner.full_name || owner.email}
            </Link>
            {owner.full_name && <span className="text-gray-400 text-xs">{owner.email}</span>}
            {owner.company_name && <span className="text-gray-400 text-xs">&middot; {owner.company_name}</span>}
          </div>
        )}

        {/* Domains */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-gray-50 text-sm">
          <Globe className="w-4 h-4 text-gray-400 shrink-0" />
          {domains.length === 0 ? (
            <span className="text-gray-500">No domains connected</span>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-600">Domains:</span>
              {domains.map((d: any) => (
                <span key={d.id} className="inline-flex items-center gap-1 rounded-md bg-white border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {d.domain_name ?? d.name}
                  <span className={`${statusColor(d.status)} !text-[10px]`}>{d.status}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Plan & Add-ons ── */}
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

      {/* ── Resource Controls ── */}
      <div className="mb-6">
        <ResourceControls
          siteId={service.id}
          wpCloudSiteId={service.wp_cloud_site_id}
          config={service.config ?? {}}
          planMetadata={plan?.metadata ?? {}}
        />
      </div>

      {/* ── Admin Actions + Logs ── */}
      <div className="card overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100">
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

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">No logs recorded.</div>
          ) : (
            logs.map((log: any) => (
              <div key={log.id} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{log.action}</p>
                  <span className="text-xs text-gray-400 shrink-0 ml-4">{formatDateTime(log.created_at)}</span>
                </div>
                {log.message && <p className="text-xs text-gray-500 mt-0.5">{log.message}</p>}
              </div>
            ))
          )}
        </div>
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

function InfoCell({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
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
