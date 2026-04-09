'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/modal';
import { ALL_ROLES } from '@/lib/roles';

// ── Action buttons for commission rows ──
export function CommissionRowActions({ commission }: { commission: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');

  async function handleAction(action: string, payoutMethod?: string) {
    setLoading(action);
    try {
      const res = await fetch('/api/admin/commissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: commission.id, action, payout_method: payoutMethod }),
      });
      if (res.ok) router.refresh();
      else {
        const data = await res.json();
        alert(data.error || 'Failed');
      }
    } finally {
      setLoading('');
    }
  }

  if (commission.status === 'paid') {
    return <span className="text-xs text-gray-400">Paid</span>;
  }

  if (commission.status === 'pending') {
    return (
      <button
        onClick={() => handleAction('approve')}
        disabled={!!loading}
        className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
      >
        {loading === 'approve' ? 'Approving...' : 'Approve'}
      </button>
    );
  }

  // status === 'approved'
  return (
    <div className="flex items-center gap-2">
      {commission.type === 'referral' ? (
        <button
          onClick={() => handleAction('pay', 'stripe_credit')}
          disabled={!!loading}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
        >
          {loading === 'pay' ? 'Crediting...' : 'Give Stripe Credit'}
        </button>
      ) : (
        <button
          onClick={() => handleAction('pay')}
          disabled={!!loading}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-800 disabled:opacity-50"
        >
          {loading === 'pay' ? 'Processing...' : 'Mark Paid'}
        </button>
      )}
    </div>
  );
}

// ── Create commission modal ──
export function CreateCommissionModal({
  isOpen,
  onClose,
  users,
}: {
  isOpen: boolean;
  onClose: () => void;
  users: { id: string; full_name: string; email: string; role: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    type: 'affiliate' as string,
    earner_id: '',
    customer_id: '',
    amount: '',
    payout_method: 'etransfer',
    notes: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function reset() {
    setForm({ type: 'affiliate', earner_id: '', customer_id: '', amount: '', payout_method: 'etransfer', notes: '' });
    setStatus('idle');
    setErrorMsg('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          earner_id: form.earner_id,
          customer_id: form.customer_id || null,
          amount_cad: Math.round(parseFloat(form.amount) * 100),
          payout_method: form.payout_method,
          notes: form.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus('error'); setErrorMsg(data.error); return; }
      setStatus('success');
      setTimeout(() => { reset(); onClose(); router.refresh(); }, 1000);
    } catch {
      setStatus('error');
      setErrorMsg('Network error');
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  // Filter users for earner dropdown based on type
  const earnerOptions = form.type === 'affiliate'
    ? users.filter(u => ['admin', 'affiliate', 'studio'].includes(u.role))
    : users; // referral can be any user

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Add Commission">
      {status === 'success' ? (
        <div className="py-6 text-center">
          <p className="text-sm font-medium text-emerald-600">Commission created!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputClass}>
              <option value="affiliate">Affiliate Commission</option>
              <option value="referral">Customer Referral ($250 credit)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {form.type === 'referral' ? 'Referring Customer *' : 'Affiliate *'}
            </label>
            <select required value={form.earner_id} onChange={e => setForm(f => ({ ...f, earner_id: e.target.value }))} className={inputClass}>
              <option value="">Select...</option>
              {earnerOptions.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New Customer</label>
            <select value={form.customer_id} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))} className={inputClass}>
              <option value="">None / Not yet signed up</option>
              {users.filter(u => u.role === 'customer').map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (CAD) *</label>
            <input
              type="number"
              required
              min="0.01"
              step="0.01"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className={inputClass}
              placeholder={form.type === 'referral' ? '250.00' : '100.00'}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Payout Method</label>
            <select value={form.payout_method} onChange={e => setForm(f => ({ ...f, payout_method: e.target.value }))} className={inputClass}>
              {form.type === 'referral' && <option value="stripe_credit">Stripe Credit (auto-apply to next bill)</option>}
              <option value="etransfer">E-Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="payroll">Payroll</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} placeholder="e.g. Referred John Smith" />
          </div>

          {status === 'error' && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{errorMsg}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" disabled={status === 'loading'} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
              {status === 'loading' ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
