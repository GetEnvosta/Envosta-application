import { getUserSitesWithSubscriptions } from '@/services/sites';
import { getUserSubscriptions } from '@/services/subscriptions';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { ExternalLink, Globe, Loader2, Plus, Server } from 'lucide-react';

export default async function SitesPage() {
  const [services, subscriptions] = await Promise.all([
    getUserSitesWithSubscriptions(),
    getUserSubscriptions(),
  ]);

  const allSubscriptions = subscriptions;
  const allServices = services;
  const hasSubscription = allSubscriptions.length > 0;
  const hasSites = allServices.length > 0;
  const hasProvisioningSite = allServices.some(s => s.status === 'provisioning');

  // Find subscriptions that don't have a linked service
  const linkedSubIds = new Set(allServices.map((s: any) => s.subscription_id).filter(Boolean));
  const unlinkedSubscriptions = allSubscriptions.filter((sub: any) => !linkedSubIds.has(sub.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sites</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your WordPress hosting accounts</p>
        </div>
        <Link href="/dashboard/add-site" className="btn-primary text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add a Site
        </Link>
      </div>

      {/* State A: No subscription at all */}
      {!hasSubscription && !hasSites && (
        <div className="card p-12 text-center">
          <Server className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">
            You don&apos;t have a hosting plan yet.
          </h3>
          <p className="text-sm text-gray-500 mt-1.5 mb-5 max-w-sm mx-auto">
            Choose a plan to get your WordPress site set up and running.
          </p>
          <Link href="/dashboard/add-site" className="btn-primary">
            Add a Site
          </Link>
        </div>
      )}

      {/* Provisioning sites */}
      {allServices.filter((s: any) => s.status === 'provisioning').map((site: any) => (
        <div key={site.id} className="card p-8 text-center mb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white" />
            </div>
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            {site.label} is being set up.
          </h3>
          <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto">
            We&apos;re preparing your WordPress site. This usually takes less than 24 hours.
          </p>
          {(site as any).subscriptions?.plans?.name && (
            <p className="text-xs text-gray-400 mt-2">Plan: {(site as any).subscriptions.plans.name}</p>
          )}
          <div className="mt-6 max-w-xs mx-auto">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full w-2/3 bg-brand-500 rounded-full animate-pulse" />
            </div>
            <p className="text-xs text-gray-400 mt-2">Provisioning in progress...</p>
          </div>
        </div>
      ))}

      {/* Subscriptions without linked sites */}
      {unlinkedSubscriptions.map((sub: any) => (
        <div key={sub.id} className="card p-8 text-center mb-4">
          <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">
            Your {sub.plans?.name ?? 'hosting'} plan is active — site setup coming soon.
          </h3>
          <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto">
            We&apos;re reviewing your account and will begin setting up your WordPress site shortly. You&apos;ll be notified when it&apos;s ready.
          </p>
          <span className="inline-block mt-3 badge-indigo">{sub.plans?.name ?? 'Plan'}</span>
        </div>
      ))}

      {/* Active / non-provisioning site cards */}
      {allServices.filter((s: any) => s.status !== 'provisioning').length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {allServices.filter((s: any) => s.status !== 'provisioning').map((site: any) => {
            const planName = site.plans?.name ?? (site as any).subscriptions?.plans?.name ?? 'Unknown';
            const status: string = site.status ?? 'pending';
            const statusBadge =
              status === 'active'
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                : status === 'suspended'
                  ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
                  : 'bg-gray-100 text-gray-600 ring-1 ring-gray-500/20';

            return (
              <div key={site.id} className="card p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900">
                        {site.label}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusBadge}`}
                      >
                        {status}
                      </span>
                      <span className="badge-indigo">{planName}</span>
                      {site.onboarding_status && site.onboarding_status !== 'completed' && (
                        <span className="badge-yellow">Onboarding: {site.onboarding_status === 'not_started' ? 'Pending' : site.onboarding_status === 'scheduled' ? 'Call Scheduled' : 'In Progress'}</span>
                      )}
                    </div>
                    {site.wp_cloud_url && (
                      <a
                        href={site.wp_cloud_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 mt-1.5"
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
                          className="btn-secondary text-sm py-2 px-3.5"
                        >
                          Open WP Admin
                        </a>
                        <a
                          href={site.wp_cloud_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-sm py-2 px-3.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Visit Site
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Created {formatDate(site.created_at)}
                  </p>
                  <Link
                    href={`/dashboard/sites/${site.id}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Manage Site &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
