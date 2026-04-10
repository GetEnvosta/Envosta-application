import { getCurrentUser } from '@/services/auth';
import { getPartnerProfile, getPartnerClients, getPartnerTickets, getPartnerEarningStats } from '@/services/partners';
import { redirect } from 'next/navigation';
import { Users, MessageCircle, DollarSign, Star } from 'lucide-react';
import { formatCents } from '@/lib/utils';

export default async function PartnerDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const [profile, clients, tickets, earnings] = await Promise.all([
    getPartnerProfile(user.id),
    getPartnerClients(user.id),
    getPartnerTickets(user.id),
    getPartnerEarningStats(user.id),
  ]);

  const openTickets = tickets.filter((t: any) => t.status === 'open' || t.status === 'in-progress');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Partner Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back, {profile?.full_name ?? 'Partner'}.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-sky-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clients</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Open Tickets</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{openTickets.length}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">This Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCents(earnings.thisMonth, 'cad')}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Clients</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{profile?.client_count ?? 0}</p>
          <p className="text-xs text-gray-400 mt-0.5">active clients</p>
        </div>
      </div>

      {/* Recent Tickets */}
      {openTickets.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Active Tickets</h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Client</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Subject</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {openTickets.slice(0, 5).map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-sm text-gray-700">{t.users?.full_name ?? t.users?.email ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-900">
                      <a href={`/partner/tickets/${t.id}`} className="hover:text-sky-600">{t.subject}</a>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        t.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent Clients */}
      {clients.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Your Clients</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.slice(0, 6).map((c: any) => (
              <a key={c.id} href={`/partner/clients/${c.id}`} className="card p-4 hover:shadow-md transition-shadow">
                <p className="text-sm font-medium text-gray-900">{c.full_name ?? 'Unnamed'}</p>
                <p className="text-xs text-gray-500 mb-2">{c.email}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{c.sites_count} site{c.sites_count !== 1 ? 's' : ''}</span>
                  <span>{c.credit_balance} credits</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
