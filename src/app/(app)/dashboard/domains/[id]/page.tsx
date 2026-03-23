import { getEffectiveUserId } from '@/services/auth';
import { getDomainById } from '@/services/domains';
import { getUserServicesList } from '@/services/sites';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Globe, ExternalLink } from 'lucide-react';
import { redirect } from 'next/navigation';
import { DnsManager } from './dns-manager';
import { ConnectedSiteSwitcher } from '@/components/domains/connected-site-switcher';
import { NameserverManager } from '@/components/domains/nameserver-manager';

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
  const connectedService = services.find((s: any) => s.id === domain.service_id) ?? null;

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
                <span className="text-sm text-gray-500">Expires {formatDate(domain.expiry_date)}</span>
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
          <button
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
              domain.auto_renew ? 'bg-brand-600' : 'bg-gray-200'
            }`}
            role="switch"
            aria-checked={domain.auto_renew}
            disabled
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                domain.auto_renew ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* DNS Management */}
      {(() => {
        const ns = Array.isArray(domain.nameservers) ? domain.nameservers : [];
        const isDefault = ns.length === 0 || (ns.length === 2 && ns[0] === 'ns1.envosta.com' && ns[1] === 'ns2.envosta.com');
        return isDefault ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <DnsManager domainId={domain.id} domainName={domain.domain_name} />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 opacity-60">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">DNS Management</h2>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mt-3">
              <p className="text-sm text-amber-800 font-medium">Custom nameservers detected</p>
              <p className="text-sm text-amber-700 mt-1">
                DNS records can only be managed when using Envosta&apos;s default nameservers
                (<span className="font-mono text-xs">ns1.envosta.com</span>, <span className="font-mono text-xs">ns2.envosta.com</span>).
                Switch back to our default nameservers to manage your DNS records here.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Nameservers */}
      <NameserverManager
        domainName={domain.domain_name}
        currentNameservers={Array.isArray(domain.nameservers) ? domain.nameservers : []}
      />

      {/* WHOIS Privacy */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">WHOIS Privacy</h2>
            <p className="text-sm text-gray-500 mt-0.5">Hide your personal information from WHOIS lookups.</p>
          </div>
          <button
            className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-brand-600 transition-colors duration-200 ease-in-out"
            role="switch"
            aria-checked="true"
            disabled
          >
            <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5" />
          </button>
        </div>
      </div>

      {/* Connected Site */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Connected Site</h2>
        <p className="text-sm text-gray-500 mb-4">Choose which site this domain is connected to.</p>
        <ConnectedSiteSwitcher
          domainId={domain.id}
          domainName={domain.domain_name}
          currentServiceId={domain.service_id}
          services={services ?? []}
        />
      </div>
    </div>
  );
}
