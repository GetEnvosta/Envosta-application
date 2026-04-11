import { getCurrentUser } from '@/services/auth';
import { getPartnerClients } from '@/services/partners';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export default async function PartnerClientsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const clients = await getPartnerClients(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Clients</h1>
        <p className="text-sm text-gray-500">{clients.length} client{clients.length !== 1 ? 's' : ''} under your management.</p>
      </div>

      {clients.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Sites</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Usage</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/partner/clients/${c.id}`} className="hover:text-sky-600">
                      <p className="text-sm font-medium text-gray-900">{c.full_name ?? 'Unnamed'}</p>
                      <p className="text-xs text-gray-500">{c.email}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{c.sites_count}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700">{Math.round(c.usage)}/{c.included}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No clients yet</p>
          <p className="text-xs text-gray-400">Clients will appear here when they're assigned to you.</p>
        </div>
      )}
    </div>
  );
}
