'use client';

import { useState, useEffect } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  subscription_balance_after: number;
  purchased_balance_after: number;
  description: string;
  service_type: string;
  created_at: string;
}

const PAGE_SIZE = 20;

export function CreditTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/credits/transactions?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)
      .then((r) => r.json())
      .then((data) => {
        setTransactions(data.transactions ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && page === 0) {
    return (
      <div className="animate-pulse">
        <div className="h-48 bg-gray-100 rounded" />
      </div>
    );
  }

  if (transactions.length === 0 && page === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No transactions yet</p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Date</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Description</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Type</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Amount</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {transactions.map((tx) => {
              const isPositive = tx.amount > 0;
              const balanceAfter = tx.subscription_balance_after + tx.purchased_balance_after;
              return (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(tx.created_at).toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 max-w-[300px] truncate">
                    {tx.description ?? tx.type}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      isPositive
                        ? 'text-emerald-700 bg-emerald-50'
                        : tx.type === 'expiry'
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-red-700 bg-red-50'
                    }`}>
                      {isPositive ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                      {tx.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-sm font-medium text-right whitespace-nowrap ${
                    isPositive ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {isPositive ? '+' : ''}{tx.amount}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-500 text-right whitespace-nowrap">
                    {balanceAfter}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
