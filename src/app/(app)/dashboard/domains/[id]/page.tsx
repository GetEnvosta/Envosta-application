import { getEffectiveUserId } from '@/services/auth';
import { getDomainById, getDnsRecordsByDomainId } from '@/services/domains';
import { getUserServicesList } from '@/services/sites';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Globe, Server, ExternalLink } from 'lucide-react';
import { redirect } from 'next/navigation';
import { DnsManager } from '@/components/domains/dns-manager';
import { DomainSettings } from '@/components/domains/domain-settings';

export default async function DomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getEffectiveUserId();
  if (!userId) redirect('/login');

  const [domain, services] = await Promise.all([
    getDomainById(id, userId),
    getUserServicesList(userId),
  ]);

  if (!domain) redirect('/dashboard/domains');

  // Read DNS from canonical mirror table (was: meta.dns_records JSONB cache)
  const dnsRecords = await getDnsRecordsByDomainId(domain.id);

  const meta = (domain.metadata as any) ?? {};
  const connectedSite = domain.site_id
    ? (services ?? []).find((s: any) => s.id === domain.site_id) ?? null
    : null;

  return (
    <div>
      <Link href="/dashboard/domains" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to domains
      </Link>

      {/* Domain header + quick settings */}
      <div className="card p-6 mb-6">
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

        {/* Connected site reference */}
        <div className="flex items-center gap-2 mt-4 px-3.5 py-2.5 rounded-lg bg-gray-50 text-sm">
          <Server className="w-4 h-4 text-gray-400 shrink-0" />
          {connectedSite ? (
            <>
              <span className="text-gray-600">Connected to</span>
              <Link
                href={`/dashboard/sites/${connectedSite.id}`}
                className="font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                {connectedSite.label}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </>
          ) : (
            <span className="text-gray-500">No site connected. <Link href="/dashboard/sites" className="text-brand-600 hover:text-brand-700 font-medium">Connect from a site&apos;s settings</Link></span>
          )}
        </div>

        <DomainSettings
          domainName={domain.domain_name}
          initialAutoRenew={domain.auto_renew ?? true}
          initialWhoisPrivacy={meta.whois_privacy ?? true}
          expiresAt={domain.expires_at}
        />
      </div>

      {/* DNS Management (includes nameserver selection) */}
      <div className="card p-6">
        <DnsManager
          domainId={domain.id}
          domainName={domain.domain_name}
          initialRecords={dnsRecords}
          siteId={domain.site_id}
          initialDnsMode={meta.dns_mode}
          currentNameservers={Array.isArray(meta.nameservers) ? meta.nameservers : []}
          isTransferred={!!meta.transfer}
        />
      </div>
    </div>
  );
}
