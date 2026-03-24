import { getUserDomains } from '@/services/domains';
import { getEffectiveUserId } from '@/services/auth';
import { formatDate, statusColor } from '@/lib/utils';
import Link from 'next/link';
import { Globe, Plus } from 'lucide-react';
import { DomainSearchEmpty } from '@/components/domains/domain-search-empty';

export default async function DomainsPage() {
  const userId = await getEffectiveUserId();
  const domains = await getUserDomains(userId!);

  const count = domains.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Your Domains</h1>
          {count > 0 && (
            <span className="badge-blue">{count}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/domains/register" className="btn-primary text-sm py-2 px-3.5 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Register Domain
          </Link>
          <Link href="/dashboard/domains/register?transfer=true" className="btn-secondary text-sm py-2 px-3.5">
            Transfer Domain
          </Link>
        </div>
      </div>

      {count === 0 ? (
        <div className="card p-12 text-center flex flex-col items-center">
          <Globe className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-base font-medium text-gray-900">No domains registered yet.</h3>
          <p className="text-sm text-gray-500 mt-1 mb-6">Search for the perfect domain name.</p>
          <DomainSearchEmpty />
        </div>
      ) : (
        <div className="grid gap-4">
          {domains.map((d: any) => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{d.domain_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={statusColor(d.status)}>{d.status}</span>
                      <span className="text-xs text-gray-400">
                        Expires {formatDate(d.expiry_date)}
                      </span>
                      {d.auto_renew && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                          Auto-renew
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link href={`/dashboard/domains/${d.id}`} className="btn-secondary text-sm">
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
