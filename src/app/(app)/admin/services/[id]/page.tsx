export const dynamic = 'force-dynamic';

import { getServiceDetailById, getServiceDomains, getServiceLogs } from '@/services/sites';
import { formatDate, formatDateTime, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { DeleteSiteButton } from '@/components/sites/delete-site-button';
import { ResourceControls } from '@/components/admin/resource-controls';
import {
  ArrowLeft, ExternalLink, Globe, Layers, Package, Server, User, Wrench,
  HardDrive, Wifi, Clock, CreditCard, Cpu, Database, MapPin, Zap, Key, Terminal, Shield,
} from 'lucide-react';
import { PlanSwitcher } from '@/components/sites/plan-switcher';
import { SiteAddons } from '@/components/sites/site-addons';
import { SitePerformance } from '@/components/sites/site-performance';
import { SiteAccess } from '@/components/sites/site-access';
import { CancelSubscriptionButton } from '@/components/admin/cancel-subscription-button';
import { AdminSiteActions } from '@/components/admin/admin-site-actions';
import { AdminErrorLogs } from '@/components/admin/admin-error-logs';
import { SiteIp } from '@/components/sites/site-ip';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getServiceDetailById(id);

  if (!service) {
    return (
      <div>
        <Link href="/admin/services" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Services
        </Link>
        <div className="card p-12 text-center">
          <Server className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Service not found.</p>
        </div>
      </div>
    );
  }

  const [domains, logs] = await Promise.all([getServiceDomains(service.id), getServiceLogs(service.id, 20)]);

  const owner = service.users as any;
  const plan = service.products as any;
  const meta = (service as any).metadata ?? {};
  const config = service.config ?? {};
  const siteDomain = service.wp_cloud_url?.replace('https://', '') ?? '';

  const regions: Record<string, string> = { dca: 'US East', bur: 'US West', dfw: 'US Central', ams: 'EU West' };

  const statusDot: Record<string, string> = {
    active: 'bg-emerald-500',
    provisioning: 'bg-amber-500 animate-pulse',
    suspended: 'bg-red-500',
    cancelled: 'bg-gray-400',
    failed: 'bg-red-500',
  };

  return (
    <div>
      <Link href="/admin/services" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Services
      </Link>

      {/* ═══ HERO ═══ */}
      <div className="card p-0 mb-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-admin-500 via-admin-400 to-admin-600" />
        <div className="p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-admin-50 flex items-center justify-center">
                <Server className="w-5 h-5 text-admin-600" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-lg font-semibold text-gray-900">{service.label}</h1>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${statusDot[service.status] ?? 'bg-gray-400'}`} />
                    <span className="text-xs text-gray-500 capitalize">{service.status}</span>
                  </div>
                </div>
                {service.wp_cloud_url && (
                  <a href={service.wp_cloud_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-admin-600 transition-colors">
                    {siteDomain}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {service.wp_cloud_url && (
                <>
                  <a href={`${service.wp_cloud_url}/wp-admin`} target="_blank" rel="noopener noreferrer" className="btn-admin text-sm py-2 px-4">
                    WP Admin
                  </a>
                  <a href={service.wp_cloud_url} target="_blank" rel="noopener noreferrer" className="btn-admin-secondary text-sm py-2 px-3">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              )}
            </div>
          </div>

          {/* Metrics strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden mb-4">
            <Stat icon={<Layers className="w-3.5 h-3.5" />} label="Plan" value={plan?.name ?? '\u2014'} />
            <Stat icon={<Server className="w-3.5 h-3.5" />} label="PHP" value={service.php_version ?? '8.4'} />
            <Stat icon={<MapPin className="w-3.5 h-3.5" />} label="Region" value={regions[service.server_region as string] ?? 'US East'} />
            <Stat icon={<Cpu className="w-3.5 h-3.5" />} label="Workers" value={`${(config as any).php_workers ?? plan?.metadata?.php_workers_default ?? 2}`} />
            <Stat icon={<Database className="w-3.5 h-3.5" />} label="Memory" value={`${(config as any).php_memory_mb ?? plan?.metadata?.php_memory_mb ?? 512}MB`} />
            <Stat icon={<HardDrive className="w-3.5 h-3.5" />} label="Disk" value={service.disk_usage_mb ? `${(service.disk_usage_mb / 1024).toFixed(1)}GB` : '\u2014'} />
            <div className="bg-white px-4 py-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-gray-400"><Wifi className="w-3.5 h-3.5" /></span>
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">IP</span>
              </div>
              <p className="text-sm font-semibold text-gray-900 truncate font-mono text-xs"><SiteIp siteId={service.id} initialIp={meta.site_ip} /></p>
            </div>
          </div>

          {/* Owner + Domains row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {owner && (
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 flex-1">
                <User className="w-4 h-4 text-gray-400 shrink-0" />
                <Link href={`/admin/customers/${owner.id}`} className="text-sm font-medium text-admin-600 hover:text-admin-700 truncate">
                  {owner.full_name || owner.email}
                </Link>
                {owner.full_name && <span className="text-xs text-gray-400 truncate hidden sm:inline">{owner.email}</span>}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 flex-1">
              <Globe className="w-4 h-4 text-gray-400 shrink-0" />
              {domains.length === 0 ? (
                <span className="text-sm text-gray-400">No domains</span>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {domains.map((d: any) => (
                    <span key={d.id} className="text-sm font-medium text-gray-700">{d.domain_name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PLAN, BILLING & ADD-ONS ═══ */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Plan, Billing & Add-ons</h2>
        </div>

        {/* Plan switcher */}
        <div className="mb-5 pb-5 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Plan</p>
          <PlanSwitcher siteId={service.id} currentPlanId={service.product_id} />
        </div>

        {/* Add-ons */}
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Add-ons</p>
        <SiteAddons siteId={service.id} />
      </div>

      {/* ═══ RESOURCES ═══ */}
      <div className="mb-6">
        <ResourceControls
          siteId={service.id}
          wpCloudSiteId={service.wp_cloud_site_id}
          config={service.config ?? {}}
          planMetadata={plan?.metadata ?? {}}
        />
      </div>

      {/* ═══ PERFORMANCE + ACCESS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Performance & Cache</h2>
          </div>
          <SitePerformance siteId={service.id} domain={siteDomain} />
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">SFTP Access</h2>
          </div>
          <SiteAccess siteId={service.id} wpCloudSiteId={service.wp_cloud_site_id} />
        </div>
      </div>

      {/* ═══ ERROR LOGS ═══ */}
      <div className="card p-6 mb-6">
        <AdminErrorLogs siteId={service.id} />
      </div>

      {/* ═══ ADMIN ACTIONS + ACTIVITY ═══ */}
      <div className="card overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Admin Actions</h2>
          </div>
          <AdminSiteActions
            siteId={service.id}
            wpCloudSiteId={service.wp_cloud_site_id}
            userId={service.user_id}
            subscriptionId={service.subscription_id}
            status={service.status}
          />
        </div>

        {/* Activity log */}
        <div className="bg-gray-50/50">
          <div className="px-6 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No activity.</div>
            ) : (
              logs.map((log: any) => (
                <div key={log.id} className="px-6 py-2.5 hover:bg-white/60 transition-colors">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-900">{log.action}</p>
                    <span className="text-[11px] text-gray-400 shrink-0 ml-4 font-mono">{formatDateTime(log.created_at)}</span>
                  </div>
                  {log.message && <p className="text-xs text-gray-500 mt-0.5">{log.message}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ═══ DANGER ZONE ═══ */}
      <div className="rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50/40 to-white p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h2>
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
        <p className="text-xs text-gray-400 mt-3">Cancel stops billing (30-day recovery). Delete permanently removes from wp.cloud.</p>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
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
