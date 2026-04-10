import { getAdminCreditStats } from '@/services/credits';
import { getServicePricing } from '@/services/pricing';
import { Coins, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { CreditPricingTable } from './pricing-table';

export default async function AdminCreditsPage() {
  const [stats, pricing] = await Promise.all([
    getAdminCreditStats(),
    getServicePricing(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Credit System</h1>
        <p className="text-sm text-gray-500">Manage service credit pricing and monitor usage.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Credits Sold (All Time)</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCreditsSold.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">${stats.totalCreditsSold.toLocaleString()} CAD revenue</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Consumed This Month</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalConsumedThisMonth.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">credits deducted</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Negative Balances</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.usersWithNegativeBalance.length}</p>
          <p className="text-xs text-gray-400 mt-1">users with overdue balance</p>
        </div>
      </div>

      {/* Negative Balance Users */}
      {stats.usersWithNegativeBalance.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            Users with Negative Balance
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">User</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Subscription</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Purchased</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.usersWithNegativeBalance.map((u: any) => {
                  const total = (u.subscription_credits ?? 0) + (u.purchased_credits ?? 0);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 text-sm">
                        <span className="font-medium text-gray-900">{u.full_name ?? 'Unknown'}</span>
                        <span className="text-gray-400 ml-2 text-xs">{u.email ?? ''}</span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-right text-gray-600">{u.subscription_credits}</td>
                      <td className="px-4 py-2.5 text-sm text-right text-gray-600">{u.purchased_credits}</td>
                      <td className="px-4 py-2.5 text-sm text-right font-medium text-red-600">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Service Credit Pricing */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Coins className="w-4 h-4 text-gray-400" />
          Service Credit Pricing
        </h2>
        <CreditPricingTable initialPricing={pricing} />
      </section>
    </div>
  );
}
