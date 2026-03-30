import { getEffectiveUserId } from '@/services/auth';
import { getDomainById } from '@/services/domains';
import { getUserServicesList } from '@/services/sites';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Globe, ExternalLink } from 'lucide-react';
import { redirect } from 'next/navigation';
import { DnsManager } from '@/components/domains/dns-manager';
import { ConnectedSiteSwitcher } from '@/components/domains/connected-site-switcher';
import { NameserverManager } from '@/components/domains/nameserver-manager';
import { AutoRenewToggle } from '@/components/domains/auto-renew-toggle';
import { WhoisPrivacyToggle } from '@/components/domains/whois-privacy-toggle';

export default async function DomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getEffectiveUserId();
  if (!userId) redirect('/login');

  const [domain, services] = await Promise.all([
    getDomainById(id, userId),
    getUserServicesList(userId),
  ]);

  if (!domain) redirect('/dashboard/domains');

  // Find the service linked to this domain
  const connectedService = services.find((s: any) => s.id === domain.site_id) ?? null;

  return (
    <div>
      <Link href="/dashboard/domains" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to domains
      </Link>

      {/* Domain header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
              <Globe className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{domain.domain_name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={statusColor(domain.status)}>{domain.status}</span>
                <span className="text-sm text-gray-500">Expires {formatDate(domain.expires_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-renew */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Auto-Renew</h2>
            <p className="text-sm text-gray-500 mt-0.5">Automatically renew this domain before it expires.</p>
          </div>
          <AutoRenewToggle domainName={domain.domain_name} initialValue={domain.auto_renew ?? true} />
        </div>
      </div>

      {/* DNS Management */}
      {(() => {
        const ns = Array.isArray((domain.metadata as any)?.nameservers) ? (domain.metadata as any)?.nameservers : [];
        const isDefault = ns.length === 0 || ns.every((n: string) => n.includes('systemdns.com'));
        return isDefault ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <DnsManager domainId={domain.id} domainName={domain.domain_name} initialRecords={(domain.metadata as any)?.dns_records} siteId={domain.site_id} />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 opacity-60">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">DNS Management</h2>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mt-3">
              <p className="text-sm text-amber-800 font-medium">Custom nameservers detected</p>
              <p className="text-sm text-amber-700 mt-1">
                DNS records can only be managed when using Envosta&apos;s default nameservers
                (<span className="font-mono text-xs">ns1.systemdns.com</span>, <span className="font-mono text-xs">ns2.systemdns.com</span>, <span className="font-mono text-xs">ns3.systemdns.com</span>).
                Switch back to our default nameservers to manage your DNS records here.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Nameservers */}
      <NameserverManager
        domainName={domain.domain_name}
        currentNameservers={Array.isArray((domain.metadata as any)?.nameservers) ? (domain.metadata as any)?.nameservers : []}
      />

      {/* WHOIS Privacy */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">WHOIS Privacy</h2>
            <p className="text-sm text-gray-500 mt-0.5">Hide your personal information from WHOIS lookups.</p>
          </div>
          <WhoisPrivacyToggle domainName={domain.domain_name} initialValue={(domain.metadata as any)?.whois_privacy ?? true} />
        </div>
      </div>

      {/* Connected Site */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Connected Site</h2>
        <p className="text-sm text-gray-500 mb-4">Choose which site this domain is connected to.</p>
        <ConnectedSiteSwitcher
          domainId={domain.id}
          domainName={domain.domain_name}
          currentServiceId={domain.site_id}
          services={services ?? []}
        />
      </div>
    </div>
  );
}
