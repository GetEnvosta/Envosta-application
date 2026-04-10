import { getCurrentUser } from '@/services/auth';
import { getPartnerTickets } from '@/services/partners';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import { statusColor, formatDate } from '@/lib/utils';

export default async function PartnerTicketsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const tickets = await getPartnerTickets(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Client Tickets</h1>
        <p className="text-sm text-gray-500">Support requests from your clients.</p>
      </div>

      {tickets.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Subject</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-sm text-gray-700">{t.users?.full_name ?? t.users?.email ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/partner/tickets/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-sky-600">
                      {t.subject}
                    </Link>
                    {t.escalated_to_admin && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-xs text-amber-600">
                        <AlertTriangle className="w-3 h-3" /> Escalated
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-500 capitalize">{t.type}</td>
                  <td className="px-5 py-3.5"><span className={statusColor(t.status)}>{t.status}</span></td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(t.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/partner/tickets/${t.id}`} className="text-xs text-sky-600 hover:text-sky-700 font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">No tickets</p>
          <p className="text-xs text-gray-400">Client support requests will appear here.</p>
        </div>
      )}
    </div>
  );
}
