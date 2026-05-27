export const dynamic = 'force-dynamic';

import { getAdminDomainById, getDnsRecordsByDomainId } from '@/services/domains';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Globe, Server, ExternalLink, User } from 'lucide-react';
import { notFound } from 'next/navigation';
import { DnsManager } from '@/components/domains/dns-manager';
import { DomainSettings } from '@/components/domains/domain-settings';
import { DomainRetryRegister } from '@/components/domains/domain-retry-register';
import { DomainOwnerAssign } from '@/components/admin/domain-owner-assign';
import { ImpersonateButton } from '@/components/admin/impersonate-button';

export default async function AdminDomainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const domain = await getAdminDomainById(id);
  if (!domain) notFound();

  const meta = (domain.metadata as any) ?? {};
  const owner = (domain as any).users;
  // Read DNS from canonical mirror table (was: meta.dns_records JSONB cache)
  const dnsRecords = await getDnsRecordsByDomainId(domain.id);

  return (
    <div>
      <Link href="/admin/domains" className="inline-flex items-center gap-1.5 text-sm text-admin-600 hover:text-admin-700 font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Domains
      </Link>

      {/* Domain header */}
      <div className="card p-0 mb-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-admin-500 via-admin-400 to-admin-600" />
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-admin-50 flex items-center justify-center">
                <Globe className="w-6 h-6 text-admin-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{domain.domain_name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={statusColor(domain.status)}>{domain.status}</span>
                  <span className="text-sm text-gray-500">Expires {formatDate(domain.expiry_date)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {owner?.id && <ImpersonateButton userId={owner.id} label={owner.full_name || owner.email} />}
              <a href="https://manage.opensrs.com" target="_blank" rel="noopener noreferrer"
                className="btn-admin-secondary text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> OpenSRS
              </a>
            </div>
          </div>

          {/* Registration failure banner */}
          {['failed', 'pending'].includes(domain.status) && (meta.error || meta.registration_error) && (
            <DomainRetryRegister
              domainId={domain.id}
              domainName={domain.domain_name}
              siteId={domain.site_id}
              userId={domain.user_id}
              errorMessage={meta.error || meta.registration_error}
              errorCode={meta.code}
            />
          )}

          {/* Owner */}
          <DomainOwnerAssign domainId={domain.id} currentOwner={owner ? { id: owner.id, full_name: owner.full_name, email: owner.email } : null} />

          {/* Connected site */}
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 mb-4">
            <Server className="w-4 h-4 text-gray-400 shrink-0" />
            {domain.site_id ? (
              <>
                <span className="text-sm text-gray-600">Connected to</span>
                <Link href={`/admin/services/${domain.site_id}`} className="text-sm font-medium text-admin-600 hover:text-admin-700 inline-flex items-center gap-1">
                  Site <ExternalLink className="w-3 h-3" />
                </Link>
              </>
            ) : (
              <span className="text-sm text-gray-500">Not connected to any site</span>
            )}
          </div>

          {/* Settings */}
          <DomainSettings
            domainName={domain.domain_name}
            initialAutoRenew={domain.auto_renew ?? true}
            initialWhoisPrivacy={meta.whois_privacy ?? true}
            expiresAt={domain.expiry_date}
          />

          {/* Phase 3: domain renewals are off-session PaymentIntents fired
              by /api/cron/process-domain-renewals daily — no Stripe sub
              to attach. Auto-renew is governed by the domain row's
              auto_renew flag in DomainSettings above. */}
        </div>
      </div>

      {/* DNS Management */}
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
