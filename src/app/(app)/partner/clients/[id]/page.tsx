import { getCurrentUser } from '@/services/auth';
import { getPartnerClientDetail } from '@/services/partners';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Globe, HardDrive } from 'lucide-react';
import { statusColor } from '@/lib/utils';

export default async function PartnerClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const client = await getPartnerClientDetail(user.id, id);
  if (!client) notFound();

  return (
    <div>
      <Link href="/partner/clients" className="inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium mb-6">
        <ArrowLeft className="w-4 h-4" /> Clients
      </Link>

      {/* Client Overview */}
      <div className="card p-6 mb-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">{client.full_name ?? 'Unnamed Client'}</h1>
        <p className="text-sm text-gray-500 mb-4">{client.email}</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Active Sites</p>
            <p className="text-lg font-semibold text-gray-900">{client.sites.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Domains</p>
            <p className="text-lg font-semibold text-gray-900">{client.domains.length}</p>
          </div>
        </div>
      </div>

      {/* Sites */}
      {client.sites.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-400" /> Sites
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Site</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Plan</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Domain</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {client.sites.map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{s.label ?? 'Unnamed'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{s.products?.name ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">{s.domain_name ?? '—'}</td>
                    <td className="px-4 py-2.5"><span className={statusColor(s.status)}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Domains */}
      {client.domains.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-gray-400" /> Domains
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Domain</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {client.domains.map((d: any) => (
                  <tr key={d.id}>
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{d.domain_name}</td>
                    <td className="px-4 py-2.5"><span className={statusColor(d.status)}>{d.status}</span></td>
                    <td className="px-4 py-2.5 text-sm text-gray-500">
                      {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('en-CA') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
