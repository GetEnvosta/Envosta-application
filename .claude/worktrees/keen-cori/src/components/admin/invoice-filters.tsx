'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCents, formatDate, statusColor } from '@/lib/utils';
import { Receipt, RotateCcw, Loader2 } from 'lucide-react';

interface Invoice {
  id: string;
  description: string | null;
  amount_cad: number;
  status: string;
  hosted_invoice_url: string | null;
  created_at: string;
  users?: { full_name: string | null; email: string };
  _category: string;
}

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'hosting', label: 'Hosting' },
  { key: 'domains', label: 'Domains' },
  { key: 'addons', label: 'Add-ons' },
  { key: 'other', label: 'Other' },
];

export function InvoiceFilters({ invoices }: { invoices: Invoice[] }) {
  const [active, setActive] = useState('all');
  const [refunding, setRefunding] = useState<string | null>(null);
  const router = useRouter();

  async function handleRefund(invoiceId: string) {
    if (!confirm('Issue a full refund for this invoice? This cannot be undone.')) return;
    setRefunding(invoiceId);
    try {
      const res = await fetch('/api/admin/refund-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else {
        alert(data.error ?? 'Refund failed');
      }
    } catch {
      alert('Refund failed');
    }
    setRefunding(null);
  }

  const filtered = active === 'all' ? invoices : invoices.filter(i => i._category === active);

  const counts: Record<string, number> = { all: invoices.length };
  for (const inv of invoices) {
    counts[inv._category] = (counts[inv._category] ?? 0) + 1;
  }

  return (
    <div className="card overflow-hidden">
      {/* Filter tabs */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActive(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              active === f.key
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {f.label}
            {(counts[f.key] ?? 0) > 0 && (
              <span className={`ml-1.5 ${active === f.key ? 'text-gray-400' : 'text-gray-400'}`}>
                {counts[f.key] ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center">
          <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No invoices in this category.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="px-5 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((inv) => {
                const user = inv.users as any;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{inv.description || '\u2014'}</td>
                    <td className="px-5 py-3 text-gray-500">{user?.full_name || user?.email || '\u2014'}</td>
                    <td className="px-5 py-3 text-gray-900 font-medium">{formatCents(inv.amount_cad ?? 0, 'cad')}</td>
                    <td className="px-5 py-3"><span className={statusColor(inv.status)}>{inv.status}</span></td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(inv.created_at)}</td>
                    <td className="px-5 py-3">
                      {inv.hosted_invoice_url ? (
                        <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-admin-600 hover:text-admin-700 font-medium">
                          View
                        </a>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {inv.status === 'paid' && (
                        <button
                          onClick={() => handleRefund(inv.id)}
                          disabled={refunding === inv.id}
                          className="text-xs text-red-400 hover:text-red-600 font-medium inline-flex items-center gap-1"
                        >
                          {refunding === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
