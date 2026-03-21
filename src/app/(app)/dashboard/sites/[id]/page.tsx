import { createClient } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
} from 'lucide-react';
import { ConnectedDomainSwitcher } from '@/components/sites/connected-domain-switcher';

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) notFound();

  const [{ data: site }, { data: domains }] = await Promise.all([
    supabase
      .from('services')
      .select('*, plans(name, slug)')
      .eq('id', id)
      .single(),
    supabase
      .from('domains')
      .select('id, domain_name, service_id')
      .eq('user_id', user.id)
      .order('domain_name', { ascending: true }),
  ]);

  if (!site) notFound();

  // Find the domain currently connected to this site
  const connectedDomain = (domains ?? []).find((d: any) => d.service_id === id) ?? null;

  const planName = (site as any).plans?.name ?? 'Unknown';
  const planSlug: string = (site as any).plans?.slug ?? '';
  const status: string = site.status ?? 'provisioning';
  const isGrowthOrPerformance = ['growth', 'performance'].includes(planSlug);

  const statusBadge =
    status === 'active'
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
      : status === 'provisioning'
        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
        : status === 'suspended'
          ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
          : 'bg-gray-100 text-gray-600 ring-1 ring-gray-500/20';

  const placeholderBackups = [
    { date: 'Mar 19, 2026', size: '245 MB', status: 'Completed' },
    { date: 'Mar 18, 2026', size: '243 MB', status: 'Completed' },
    { date: 'Mar 17, 2026', size: '241 MB', status: 'Completed' },
  ];

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
          <p className="text-sm font-semibold text-gray-900">3.2 GB of 10 GB</p>
          <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-[32%] bg-brand-500 rounded-full" />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1.5">
            <Server className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">PHP Version</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">8.2</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 text-gray-500 mb-1.5">
            <MapPin className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Region</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">US East</p>
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
        <p className="text-xs text-gray-500 mb-4">
          Daily backups with 30-day retention included.
        </p>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">
                  Date
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">
                  Size
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {placeholderBackups.map((b, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-sm text-gray-900">{b.date}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{b.size}</td>
                  <td className="px-4 py-2.5">
                    <span className="badge-green">{b.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staging */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          Staging
        </h2>
        {isGrowthOrPerformance ? (
          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-sm text-gray-700">Staging available</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Create a staging copy of your site to test changes safely.
              </p>
            </div>
            <button className="btn-secondary text-sm py-2 px-4">Create Staging</button>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm text-gray-500">
              Available on Growth plan
            </p>
            <Link
              href="/dashboard/billing"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Upgrade &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* SSL */}
      <div className="card p-6 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Lock className="w-4 h-4 text-gray-400" />
          SSL Certificate
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className="text-sm text-gray-700">
            SSL certificate active and auto-renewing.
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-red-600 mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete this site and all its data. This action cannot be undone.
        </p>
        <button className="btn-danger text-sm py-2 px-4" disabled>
          Delete Site
        </button>
      </div>
    </div>
  );
}
