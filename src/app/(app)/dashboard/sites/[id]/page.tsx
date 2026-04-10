import { getEffectiveUserId } from '@/services/auth';
import { getSiteById } from '@/services/sites';
import { getUserDomainsForSite } from '@/services/domains';
import { getCreditBalance } from '@/services/credits';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteSiteButton } from '@/components/sites/delete-site-button';
import { SiteBackups } from '@/components/sites/site-backups';
import { SslStatus } from '@/components/sites/ssl-status';
import { SitePerformance } from '@/components/sites/site-performance';
// Plans removed — customers scale via credits and site resources
import {
  ArrowLeft, ExternalLink, Globe, HardDrive, Server, MapPin,
  Shield, Zap, Key, Calendar, User, Coins, Phone, Settings, Trash2,
} from 'lucide-react';
import { ConnectedDomainSwitcher } from '@/components/sites/connected-domain-switcher';
import { SiteAccess } from '@/components/sites/site-access';
import { SiteIp } from '@/components/sites/site-ip';
import { SiteGuardrails } from '@/components/sites/site-guardrails';
import { ReceptionistConfig } from '@/components/sites/receptionist-config';

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getEffectiveUserId();
  if (!userId) notFound();

  const [site, domains, creditBalance] = await Promise.all([
    getSiteById(id),
    getUserDomainsForSite(userId),
    getCreditBalance(userId),
  ]);
  if (!site) notFound();

  const connectedDomain = (domains ?? []).find((d: any) => d.site_id === id) ?? null;
  const plan = (site as any).products;
  const sub = (site as any).subscriptions;
  const planName = plan?.name ?? 'Unknown';
  const pm = plan?.metadata ?? {};
  const status: string = site.status ?? 'provisioning';
  const meta = (site as any).metadata ?? {};
  const config = (site as any).config ?? {};

  const siteUrl = site.wp_cloud_url;
  const siteDomain = siteUrl?.replace(/^https?:\/\//, '') ?? '';
  const storageUsed = ((site as any).disk_usage_mb ?? 0) / 1024;
  const storageTotal = config.storage_gb ?? 25;
  const storagePct = Math.min(100, (storageUsed / storageTotal) * 100);
  const isTrial = sub?.status === 'trialing';

  const regions: Record<string, string> = { dca: 'US East', bur: 'US West', dfw: 'US Central', ams: 'EU West' };
  const statusDot: Record<string, string> = { active: 'bg-emerald-500', provisioning: 'bg-amber-500 animate-pulse', suspended: 'bg-red-500' };

  // Calculate this site's monthly credit cost
  const phpWorkers = config.php_workers ?? 2;
  const ssdGb = config.storage_gb ?? 25;
  const bursting = (site as any).bursting_enabled ?? false;
  const hasTwilio = !!(site as any).twilio_phone_number;
  const hostingCost = (phpWorkers * 8) + (ssdGb * 0.8) + (bursting ? 10 : 0);
  const twilioCost = hasTwilio ? 2 : 0;
  const totalMonthlyCost = hostingCost + twilioCost;

  return (
    <div>
      <Link href="/dashboard/sites" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Sites
      </Link>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HERO — Site identity + quick actions                   */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="card p-0 mb-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600" />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        </div>
      </div>


      {/* ═══════════════════════════════════════════════════════ */}
      {/* OVERVIEW — Monthly cost + site specs at a glance       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Coins className="w-4 h-4 text-brand-600" /> Monthly Cost & Specs
        </h2>

        {/* Cost summary */}
        <div className="rounded-xl bg-gray-50 px-4 py-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">This site's monthly cost</span>
            <span className="text-lg font-bold text-gray-900">{totalMonthlyCost} credits/mo</span>
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Hosting ({phpWorkers} workers × 8 + {ssdGb}GB × 0.80{bursting ? ' + bursting' : ''})</span>
              <span className="font-medium text-gray-700">{hostingCost} cr</span>
            </div>
            {hasTwilio && (
              <div className="flex justify-between">
                <span>Phone number</span>
                <span className="font-medium text-gray-700">2 cr</span>
              </div>
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-xs">
            <span className="text-gray-500">Your credit balance</span>
            <span className={`font-medium ${creditBalance.total < 0 ? 'text-red-600' : creditBalance.total <= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {creditBalance.total} credits
            </span>
          </div>
        </div>

        {/* Specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 rounded-xl overflow-hidden mb-4">
          <Metric icon={<Server className="w-3.5 h-3.5" />} label="PHP" value={`${(site as any).php_version ?? '8.4'}`} />
          <Metric icon={<MapPin className="w-3.5 h-3.5" />} label="Region" value={regions[(site as any).server_region as string] ?? 'US East'} />
          <div className="bg-white px-4 py-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-gray-400"><Globe className="w-3.5 h-3.5" /></span>
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Site IP</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 truncate font-mono text-xs"><SiteIp siteId={id} initialIp={meta.site_ip} /></p>
          </div>
          <Metric icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={formatDate(site.created_at)} />
        </div>

        {/* Storage bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 flex items-center gap-1.5"><HardDrive className="w-3 h-3" /> Storage</span>
            <span className="text-xs font-mono text-gray-600">{storageUsed.toFixed(1)} / {storageTotal} GB</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${storagePct > 85 ? 'bg-red-500' : storagePct > 60 ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${storagePct}%` }} />
          </div>
        </div>

        {/* Domain */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Connected Domain</p>
          </div>
          <ConnectedDomainSwitcher siteId={id} currentDomainId={connectedDomain?.id ?? null} domains={domains ?? []} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* HOSTING RESOURCES — Scale up/down with credit costs    */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="card p-6 mb-6">
        <SiteGuardrails siteId={id} />
      </div>


      {/* ═══════════════════════════════════════════════════════ */}
      {/* AI RECEPTIONIST — Phone, config, call history          */}
      {/* Credits: 2/mo number + 2/min calls + AI tokens         */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="card p-6 mb-6">
        <ReceptionistConfig siteId={id} siteLabel={site.label} />
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SITE MANAGEMENT — Performance, security, access        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="card p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" /> Site Management
        </h2>

        {/* Performance */}
        <div className="mb-5 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Performance</h3>
          </div>
          <SitePerformance siteId={id} domain={siteDomain} />
        </div>

        {/* Security & SSL */}
        <div className="mb-5 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">SSL Certificate</h3>
          </div>
          <SslStatus siteId={id} domain={siteDomain || connectedDomain?.domain_name || null} />
        </div>

        {/* Backups */}
        <div className="mb-5 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-3.5 h-3.5 text-blue-500" />
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Backups</h3>
          </div>
          <SiteBackups siteId={id} wpCloudSiteId={(site as any).wp_cloud_site_id} />
        </div>

        {/* SFTP Access */}
        <div className="mb-5 pb-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-3.5 h-3.5 text-gray-400" />
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">SFTP Access</h3>
          </div>
          <SiteAccess siteId={id} wpCloudSiteId={(site as any).wp_cloud_site_id} />
        </div>

        {/* WordPress Login */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <User className="w-3.5 h-3.5 text-blue-500" />
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">WordPress Login</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Username: <span className="font-mono font-medium text-gray-900">{meta.wp_admin_user ?? 'envosta_admin'}</span></p>
            {meta.wp_admin_password ? (
              <p>Password: <span className="font-mono font-medium text-gray-900">{meta.wp_admin_password}</span></p>
            ) : (
              <p className="text-xs text-gray-500">Password was sent to your email. {siteUrl && (
                <a href={`${siteUrl}/wp-login.php?action=lostpassword`} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700 underline">Reset password</a>
              )}</p>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* DANGER ZONE                                            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50/40 to-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete Site
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">This will permanently delete your site and cancel your subscription.</p>
          </div>
          <DeleteSiteButton siteId={site.id} siteName={site.label} />
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
    </div>
  );
}
