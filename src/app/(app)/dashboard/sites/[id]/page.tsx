import { getEffectiveUserId } from '@/services/auth';
import { getSiteById } from '@/services/sites';
import { getUserDomainsForSite } from '@/services/domains';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteSiteButton, ReactivateSiteButton } from '@/components/sites/delete-site-button';
import { SiteBackups } from '@/components/sites/site-backups';
import { SslStatus } from '@/components/sites/ssl-status';
import { SitePerformance } from '@/components/sites/site-performance';
import {
  ArrowLeft, ExternalLink, Globe, HardDrive, Server, MapPin,
  Shield, Zap, Key, Calendar, User, Trash2,
} from 'lucide-react';
import { ConnectedDomainSwitcher } from '@/components/sites/connected-domain-switcher';
import { SiteAccess } from '@/components/sites/site-access';
import { SiteIp } from '@/components/sites/site-ip';
import { SiteGuardrails } from '@/components/sites/site-guardrails';
import { createClient } from '@/lib/supabase-server';


export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getEffectiveUserId();
  if (!userId) notFound();

  const [site, domains] = await Promise.all([
    getSiteById(id),
    getUserDomainsForSite(userId),
  ]);
  if (!site) notFound();

  // Get the plan name for this site
  const supabase = await createClient();
  let planName = 'Minimum';
  if ((site as any).product_id) {
    const { data: plan } = await supabase
      .from('products')
      .select('name, slug')
      .eq('id', (site as any).product_id)
      .single();
    if (plan) planName = plan.name;
  }

  const connectedDomain = (domains ?? []).find((d: any) => d.site_id === id) ?? null;
  const status: string = site.status ?? 'provisioning';
  const meta = (site as any).metadata ?? {};
  const config = (site as any).config ?? {};

  const siteUrl = site.wp_cloud_url;
  const siteDomain = siteUrl?.replace(/^https?:\/\//, '') ?? '';
  const storageUsed = ((site as any).disk_usage_mb ?? 0) / 1024;
  const storageTotal = config.storage_gb ?? 25;
  const storagePct = Math.min(100, (storageUsed / storageTotal) * 100);

  const regions: Record<string, string> = { dca: 'US East', bur: 'US West', dfw: 'US Central', ams: 'EU West' };
  const statusDot: Record<string, string> = { active: 'bg-emerald-500', provisioning: 'bg-amber-500 animate-pulse', suspended: 'bg-red-500' };


  return (
    <div>
      <Link href="/dashboard/sites" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Sites
      </Link>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SITE OVERVIEW — Hero + specs + cost + management       */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="card p-0 mb-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600" />

        {/* Hero */}
        <div className="p-6 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
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

        {/* Specs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100">
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

        <div className="p-6 space-y-5">
          {/* Plan */}
          <div className="rounded-xl bg-gray-50 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 flex items-center gap-1.5"><Zap className="w-3 h-3" /> Plan</span>
              <span className="text-xs font-semibold text-gray-900">{planName}</span>
            </div>
          </div>

          {/* Storage */}
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
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Connected Domain</p>
            </div>
            <ConnectedDomainSwitcher siteId={id} currentDomainId={connectedDomain?.id ?? null} domains={domains ?? []} />
          </div>

          {/* Performance */}
          <div className="pt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Performance</h3>
            </div>
            <SitePerformance siteId={id} domain={siteDomain} />
          </div>

          {/* SSL */}
          <div className="pt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">SSL Certificate</h3>
            </div>
            <SslStatus siteId={id} domain={siteDomain || connectedDomain?.domain_name || null} />
          </div>

          {/* Backups */}
          <div className="pt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" />
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Backups</h3>
            </div>
            <SiteBackups siteId={id} wpCloudSiteId={(site as any).wp_cloud_site_id} />
          </div>

          {/* SFTP */}
          <div className="pt-5 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-3.5 h-3.5 text-gray-400" />
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">SFTP Access</h3>
            </div>
            <SiteAccess siteId={id} wpCloudSiteId={(site as any).wp_cloud_site_id} />
          </div>

          {/* WP Login */}
          <div className="pt-5 border-t border-gray-100">
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
      </div>

      {status === 'cancelled' ? (
        /* ═══ CANCELLED — Reactivation banner ═══ */
        (() => {
          const recoveryDeadline = meta.recovery_deadline ? new Date(meta.recovery_deadline) : null;
          const daysLeft = recoveryDeadline ? Math.max(0, Math.ceil((recoveryDeadline.getTime() - Date.now()) / 86400000)) : 0;
          const expired = recoveryDeadline && new Date() > recoveryDeadline;
          return (
            <div className={`rounded-2xl border p-6 mb-6 ${expired ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50/50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-semibold flex items-center gap-1.5 ${expired ? 'text-gray-600' : 'text-blue-700'}`}>
                    {expired ? 'Recovery Window Expired' : `${daysLeft} days left to reactivate`}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {expired
                      ? 'This site can no longer be recovered. Create a new site to start fresh.'
                      : 'Your site data is preserved. Reactivate to resume billing and restore access.'}
                  </p>
                </div>
                {!expired && <ReactivateSiteButton siteId={site.id} siteName={site.label} />}
              </div>
            </div>
          );
        })()
      ) : (
        <>
          {/* ═══ PLAN & RESOURCES ═══ */}
          <div className="card p-6 mb-6">
            <SiteGuardrails siteId={id} />
          </div>

          {/* ═══ DANGER ZONE ═══ */}
          <div className="rounded-2xl border border-red-200/60 bg-gradient-to-r from-red-50/40 to-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete Site
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Removes this site from your subscription. You have 30 days to reactivate.</p>
              </div>
              <DeleteSiteButton siteId={site.id} siteName={site.label} />
            </div>
          </div>
        </>
      )}
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
