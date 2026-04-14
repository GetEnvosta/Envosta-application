export const dynamic = 'force-dynamic';

import { getUserSitesWithSubscriptions } from '@/services/sites';
import { getEffectiveUserId } from '@/services/auth';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ExternalLink, Globe, Loader2, Plus, Server, Rocket, ArrowRight, HardDrive, Zap } from 'lucide-react';

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
            const status: string = site.status ?? 'provisioning';
            const isProvisioning = status === 'provisioning';
            const isTrial = (site as any).subscriptions?.status === 'trialing';
            const config = (site as any).config ?? {};
            const phpWorkers = config.php_workers ?? 2;
            const ssdGb = config.storage_gb ?? 25;
            const bursting = (site as any).bursting_enabled ?? false;
            const monthlyCost = (phpWorkers * 8) + (ssdGb * 0.8) + (bursting ? 10 : 0);

            const statusDot =
              status === 'active' ? 'bg-emerald-500'
              : status === 'provisioning' ? 'bg-amber-500 animate-pulse'
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
                      {isTrial && <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">Trial</span>}
                    </div>

                    {site.wp_cloud_url && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {site.wp_cloud_url.replace(/^https?:\/\//, '')}
                      </p>
                    )}

                    {/* Specs row */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1">
                        <Server className="w-3 h-3" /> {phpWorkers} workers
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3" /> {ssdGb}GB
                      </span>
                      {bursting && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <Zap className="w-3 h-3" /> Bursting
                        </span>
                      )}
                      <span className="ml-auto font-medium text-gray-500">{monthlyCost} cr/mo</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {site.wp_cloud_url && (
                      <a href={`${site.wp_cloud_url}/wp-admin`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-gray-700 px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors relative z-10">
                        WP Admin
                      </a>
                    )}
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
