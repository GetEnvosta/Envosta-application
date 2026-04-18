export const dynamic = 'force-dynamic';

import { getUserSitesWithSubscriptions } from '@/services/sites';
import { getEffectiveUserId } from '@/services/auth';
import Link from 'next/link';
import { Globe, Loader2, Plus, Server, Rocket, ArrowRight, RotateCcw } from 'lucide-react';

export default async function SitesPage() {
  const userId = await getEffectiveUserId();
  const services = await getUserSitesWithSubscriptions(userId!);

  const hasSites = services.length > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sites</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your WordPress hosting accounts</p>
        </div>
        <Link href="/dashboard/add-site" className="btn-primary text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Add a Site
        </Link>
      </div>

      {!hasSites && (
        <div className="card p-12 text-center">
          <Server className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No sites yet</h3>
          <p className="text-sm text-gray-500 mt-1.5 mb-5 max-w-sm mx-auto">
            Create your first WordPress site to get started.
          </p>
          <Link href="/dashboard/add-site" className="btn-primary inline-flex items-center gap-2">
            <Rocket className="w-4 h-4" /> Create Your First Site
          </Link>
        </div>
      )}

      {hasSites && (
        <div className="grid grid-cols-1 gap-4">
          {services.map((site: any) => {
            const planName = site.products?.name ?? 'Starter';
            const planPrice = site.products?.price_cad ?? 0;
            const status: string = site.status ?? 'provisioning';
            const isProvisioning = status === 'provisioning';
            const isCancelled = status === 'cancelled';
            const meta = site.metadata ?? {};
            const recoveryDeadline = meta.recovery_deadline ? new Date(meta.recovery_deadline) : null;
            const daysLeft = recoveryDeadline ? Math.max(0, Math.ceil((recoveryDeadline.getTime() - Date.now()) / 86400000)) : null;

            // Domain: use linked custom domain, otherwise show wp_cloud_url as temporary
            const linkedDomains = Array.isArray(site.domains) ? site.domains : [];
            const customDomain = linkedDomains.length > 0 ? linkedDomains[0].domain_name : null;
            const displayDomain = customDomain || (site.wp_cloud_url ? site.wp_cloud_url.replace(/^https?:\/\//, '') : null);
            const isTemporary = !customDomain && !!site.wp_cloud_url;

            const statusDot =
              status === 'active' ? 'bg-emerald-500'
              : status === 'provisioning' ? 'bg-amber-500 animate-pulse'
              : status === 'cancelled' ? 'bg-orange-400'
              : status === 'suspended' ? 'bg-red-500'
              : 'bg-gray-400';

            if (isProvisioning) {
              return (
                <div key={site.id} className="card p-6">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">{site.label}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Setting up your site — usually takes a few minutes</p>
                      <div className="mt-2 h-1 w-full max-w-[200px] bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-brand-500 rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link key={site.id} href={`/dashboard/sites/${site.id}`} className="card p-5 hover:shadow-md transition-all group">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-gray-50 group-hover:bg-brand-50 flex items-center justify-center transition-colors shrink-0">
                    <Globe className="w-5 h-5 text-gray-400 group-hover:text-brand-600 transition-colors" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">{site.label}</h3>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                        <span className="text-xs text-gray-500 capitalize">{status}</span>
                      </div>
                    </div>

                    {displayDomain && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {displayDomain}
                        {isTemporary && <span className="ml-1.5 text-[10px] text-amber-500 font-medium">temporary</span>}
                      </p>
                    )}

                    {/* Plan & price */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                        {planName}
                      </span>
                      {isCancelled && daysLeft !== null && (
                        <span className="text-orange-600 font-medium">{daysLeft} days to recover</span>
                      )}
                      <span className="ml-auto font-medium text-gray-500">${planPrice}/mo</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isCancelled ? (
                      <span className="text-xs text-orange-600 font-medium px-2.5 py-1.5 rounded-md bg-orange-50">
                        <RotateCcw className="w-3 h-3 inline mr-1" />Recover
                      </span>
                    ) : site.wp_cloud_url ? (
                      <a href={`${site.wp_cloud_url}/wp-admin`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors relative z-10">
                        WP Admin
                      </a>
                    ) : null}
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-600 transition-colors" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
