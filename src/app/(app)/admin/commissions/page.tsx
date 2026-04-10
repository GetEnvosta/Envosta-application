export const revalidate = 5;
import { getAllCommissions, getCommissionStats } from '@/services/commissions';
import { formatCents, formatDate } from '@/lib/utils';
import { DollarSign, Clock, CheckCircle, Banknote } from 'lucide-react';
import { StatCard } from '@/components/admin/stat-card';
import { CommissionRowActions } from '@/components/admin/commission-actions';
import { CommissionsHeader } from './commissions-header';
import { getAllCustomers } from '@/services/admin';

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { type, status: statusFilter } = await searchParams;

  const [commissions, stats, users] = await Promise.all([
    getAllCommissions({ type, status: statusFilter }),
    getCommissionStats(),
    getAllCustomers(),
  ]);

  const userList = (users ?? []).map((u: any) => ({
    id: u.id,
    full_name: u.full_name || '',
    email: u.email || '',
    role: u.role || 'customer',
  }));

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      approved: 'bg-blue-100 text-blue-700',
      paid: 'bg-emerald-100 text-emerald-700',
    };
    return map[s] || 'bg-gray-100 text-gray-600';
  };

  const typeBadge = (t: string) => {
    return t === 'referral'
      ? 'bg-purple-100 text-purple-700'
      : 'bg-indigo-100 text-indigo-700';
  };

  const methodLabel = (m: string | null) => {
    const map: Record<string, string> = {
      stripe_credit: 'Stripe Credit',
      etransfer: 'E-Transfer',
      cheque: 'Cheque',
      payroll: 'Payroll',
    };
    return m ? (map[m] || m) : '—';
  };

  return (
    <div>
      <CommissionsHeader users={userList} />

      {/* Stats */}
      <div className="stat-grid">
        <StatCard
          label="Pending"
          value={formatCents(stats.pendingTotal, 'cad')}
          icon={Clock}
          color="amber"
          sub={`${stats.pendingCount} commissions`}
        />
        <StatCard
          label="Approved"
          value={formatCents(stats.approvedTotal, 'cad')}
          icon={CheckCircle}
          color="blue"
          sub={`${stats.approvedCount} ready to pay`}
        />
        <StatCard
          label="Paid"
          value={formatCents(stats.paidTotal, 'cad')}
          icon={Banknote}
          color="green"
          sub={`${stats.paidCount} total`}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <a
          href="/admin/commissions"
          className={!type && !statusFilter ? 'filter-pill-active' : 'filter-pill-inactive'}
        >
          All
        </a>
        <a
          href="/admin/commissions?type=affiliate"
          className={type === 'affiliate' ? 'filter-pill-active' : 'filter-pill-inactive'}
        >
          Affiliate
        </a>
        <a
          href="/admin/commissions?type=referral"
          className={type === 'referral' ? 'filter-pill-active' : 'filter-pill-inactive'}
        >
          Referral
        </a>
        <span className="w-px bg-gray-200 mx-1" />
        <a
          href="/admin/commissions?status=pending"
          className={statusFilter === 'pending' ? 'filter-pill-active' : 'filter-pill-inactive'}
        >
          Pending
        </a>
        <a
          href="/admin/commissions?status=approved"
          className={statusFilter === 'approved' ? 'filter-pill-active' : 'filter-pill-inactive'}
        >
          Approved
        </a>
        <a
          href="/admin/commissions?status=paid"
          className={statusFilter === 'paid' ? 'filter-pill-active' : 'filter-pill-inactive'}
        >
          Paid
        </a>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Earner</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {commissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No commissions yet.</p>
                  </td>
                </tr>
              ) : (
                commissions.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{c.earner?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{c.earner?.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeBadge(c.type)}`}>
                        {c.type === 'referral' ? 'Referral' : 'Affiliate'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 text-sm">
                      {c.customer?.full_name || c.customer?.email || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-gray-900">
                      {formatCents(c.amount_cad, 'cad')}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                      {methodLabel(c.payout_method)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {formatDate(c.created_at)}
                      {c.paid_at && (
                        <span className="block text-emerald-500">Paid {formatDate(c.paid_at)}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <CommissionRowActions commission={c} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes column */}
      {commissions.some((c: any) => c.notes) && (
        <div className="mt-4 text-xs text-gray-400">
          {commissions.filter((c: any) => c.notes).map((c: any) => (
            <p key={c.id}>
              <span className="font-medium text-gray-500">{c.earner?.full_name}:</span> {c.notes}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
