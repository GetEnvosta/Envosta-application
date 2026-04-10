import { getCurrentUser } from '@/services/auth';
import { getPartnerCommissions, getPartnerEarningStats, getPartnerProfile } from '@/services/partners';
import { redirect } from 'next/navigation';
import { DollarSign, TrendingUp, Star } from 'lucide-react';
import { formatCents, formatDate } from '@/lib/utils';

export default async function PartnerEarningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth/login');

  const [stats, commissions, profile] = await Promise.all([
    getPartnerEarningStats(user.id),
    getPartnerCommissions(user.id),
    getPartnerProfile(user.id),
  ]);

  const avgRating = profile?.avg_rating ?? 0;
  const currentTier = avgRating >= 4.5 ? '25%' : avgRating >= 4.0 ? '20%' : '15%';
  const nextTier = avgRating >= 4.5 ? null : avgRating >= 4.0 ? { target: 4.5, rate: '25%' } : { target: 4.0, rate: '20%' };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Earnings</h1>
        <p className="text-sm text-gray-500">Your commission history and current tier.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">This Month</p>
          <p className="text-2xl font-bold text-gray-900">{formatCents(stats.thisMonth, 'cad')}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Last Month</p>
          <p className="text-2xl font-bold text-gray-900">{formatCents(stats.lastMonth, 'cad')}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">All Time</p>
          <p className="text-2xl font-bold text-gray-900">{formatCents(stats.allTime, 'cad')}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Tier</p>
          </div>
          <p className="text-2xl font-bold text-sky-600">{currentTier}</p>
          {nextTier && (
            <p className="text-xs text-gray-400 mt-1">
              Reach {nextTier.target} stars for {nextTier.rate}
            </p>
          )}
        </div>
      </div>

      {/* Commission History */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          Commission History
        </h2>
        {commissions.length > 0 ? (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Client</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Details</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-sm text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{c.users?.full_name ?? c.users?.email ?? '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{c.notes ?? '—'}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-emerald-600 text-right">
                      {formatCents(c.amount_cad, 'cad')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card p-12 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">No commissions yet</p>
            <p className="text-xs text-gray-400">Commissions are calculated monthly based on client credit spend.</p>
          </div>
        )}
      </section>
    </div>
  );
}
