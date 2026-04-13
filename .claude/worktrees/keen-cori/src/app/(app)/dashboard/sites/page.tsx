export const dynamic = 'force-dynamic';

import { getUserSitesWithSubscriptions } from '@/services/sites';
import { getEffectiveUserId } from '@/services/auth';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { ExternalLink, Globe, Loader2, Plus, Server, Rocket, ArrowRight } from 'lucide-react';

export default async function SitesPage() {
  const userId = await getEffectiveUserId();
  const services = await getUserSitesWithSubscriptions(userId!);

  const hasSites = services.length > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sites</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your WordPress hosting accounts</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/dashboard/partners?type=referral" className="btn-secondary text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap">
            Refer a Friend
          </Link>
          <Link href="/dashboard/add-site" className="btn-primary text-sm py-2 px-3.5 inline-flex items-center gap-1.5 whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Add a Site
          </Link>
        </div>
      </div>

      {/* Empty state — no sites at all */}
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

      {/* Site cards */}
      {hasSites && (
        <div className="grid grid-cols-1 gap-4">
          {services.map((site: any) => {
            const planName = site.products?.name ?? 'Unknown';
            const status: string = site.status ?? 'provisioning';
            const isProvisioning = status === 'provisioning';
            const isActive = status === 'active';
            const isTrial = (site as any).subscriptions?.status === 'trialing';
            const meta = (site as any).metadata ?? {};
            const isNewSite = isActive && !meta.onboarding_completed;

            const statusBadge =
              status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
              : status === 'provisioning' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
              : status === 'suspended' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
              : 'bg-gray-100 text-gray-600 ring-1 ring-gray-500/20';

            // Provisioning state
            if (isProvisioning) {
              return (
                <div key={site.id} className="card p-8 text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
                    </div>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{site.label} is being set up</h3>
                  <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto">
                    Your WordPress site is being provisioned. This usually takes a few minutes.
                  </p>
                  <div className="mt-6 max-w-xs mx-auto">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-brand-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              );
            }

            // Active site card
            return (
              <div key={site.id} className="card overflow-hidden">
                {/* Onboarding banner for newly provisioned sites */}
                {isNewSite && (
                  <div className="bg-gradient-to-r from-brand-50 to-blue-50 border-b border-brand-100 px-6 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-brand-900">Your site is ready!</p>
                        <p className="text-xs text-brand-700 mt-0.5">
                          {isTrial ? 'Your 14-day trial is active. ' : ''}Choose how you want to get started.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/sites/${site.id}`} className="btn-primary text-xs py-2 px-3.5 inline-flex items-center gap-1.5">
                          <Rocket className="w-3.5 h-3.5" /> Set Up My Site
                        </Link>
                        <Link href={`/dashboard/sites/${site.id}`} className="btn-secondary text-xs py-2 px-3.5">
                          I&apos;ll explore on my own
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-semibold text-gray-900">{site.label}</h3>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadge}`}>{status}</span>
                        <span className="badge-indigo">{planName}</span>
                        {isTrial && <span className="badge-green text-[10px]">Trial</span>}
                      </div>
                      {site.wp_cloud_url && (
                        <a href={site.wp_cloud_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-1.5">
                          <Globe className="w-3.5 h-3.5" /> {site.wp_cloud_url.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {site.wp_cloud_url && (
                        <>
                          <a href={`${site.wp_cloud_url}/wp-admin`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2 px-3.5">
                            WP Admin
                          </a>
                          <a href={site.wp_cloud_url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm py-2 px-3.5">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Created {formatDate(site.created_at)}</p>
                    <Link href={`/dashboard/sites/${site.id}`} className="text-sm font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                      Manage Site <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
