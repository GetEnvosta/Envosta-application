'use client';

import { useState, useEffect } from 'react';
import { Copy, Plus, Loader2, Trash2, ExternalLink } from 'lucide-react';

interface Coupon {
  id: string;
  name: string;
  percent_off: number | null;
  amount_off: number | null;
  currency: string;
  duration: string;
  duration_in_months: number | null;
  times_redeemed: number;
  max_redemptions: number | null;
  promo_codes: { id: string; code: string; active: boolean; times_redeemed: number }[];
}

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState('');

  // Create form
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [percentOff, setPercentOff] = useState('20');
  const [amountOff, setAmountOff] = useState('10');
  const [duration, setDuration] = useState<'once' | 'repeating' | 'forever'>('once');
  const [durationMonths, setDurationMonths] = useState('3');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => { fetchCoupons(); }, []);

  async function fetchCoupons() {
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json();
      setCoupons(data.coupons ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleCreate() {
    if (!name.trim() || !promoCode.trim()) return;
    setCreating(true);

    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          discount_type: discountType,
          percent_off: discountType === 'percent' ? parseInt(percentOff) : undefined,
          amount_off: discountType === 'amount' ? Math.round(parseFloat(amountOff) * 100) : undefined,
          duration,
          duration_in_months: duration === 'repeating' ? parseInt(durationMonths) : undefined,
          max_redemptions: maxRedemptions ? parseInt(maxRedemptions) : undefined,
          promo_code: promoCode.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        }),
      });
      if (res.ok) {
        setName(''); setPromoCode(''); setShowCreate(false);
        fetchCoupons();
      }
    } catch { /* ignore */ }
    setCreating(false);
  }

  async function handleDelete(couponId: string) {
    if (!confirm('Delete this coupon? Existing uses won\'t be affected.')) return;
    await fetch('/api/admin/coupons', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coupon_id: couponId }),
    });
    fetchCoupons();
  }

  function copyLink(code: string) {
    navigator.clipboard.writeText(`https://envosta.com/get-started?promo=${code}`);
    setCopied(code);
    setTimeout(() => setCopied(''), 2000);
  }

  function formatDiscount(c: Coupon) {
    if (c.percent_off) return `${c.percent_off}% off`;
    if (c.amount_off) return `$${(c.amount_off / 100).toFixed(2)} off`;
    return '—';
  }

  function formatDuration(c: Coupon) {
    if (c.duration === 'once') return 'First payment';
    if (c.duration === 'forever') return 'Forever';
    if (c.duration === 'repeating') return `${c.duration_in_months} months`;
    return c.duration;
  }

  if (loading) return <div className="card p-6 animate-pulse"><div className="h-6 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Promotion Codes</h3>
          <p className="text-xs text-gray-500 mt-0.5">Share links with auto-applied discounts</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-admin text-sm py-1.5 px-3 inline-flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Create
        </button>
      </div>

      {showCreate && (
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder="Welcome offer" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Promo Code</label>
              <input className="input font-mono uppercase" placeholder="WELCOME20" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
            </div>
            <div>
              <label className="label">Discount</label>
              <div className="flex gap-1">
                <select className="input w-auto" value={discountType} onChange={e => setDiscountType(e.target.value as any)}>
                  <option value="percent">%</option>
                  <option value="amount">$</option>
                </select>
                {discountType === 'percent' ? (
                  <input type="number" className="input flex-1" value={percentOff} onChange={e => setPercentOff(e.target.value)} />
                ) : (
                  <input type="number" step="0.01" className="input flex-1" placeholder="10.00" value={amountOff} onChange={e => setAmountOff(e.target.value)} />
                )}
              </div>
            </div>
            <div>
              <label className="label">Duration</label>
              <select className="input" value={duration} onChange={e => setDuration(e.target.value as any)}>
                <option value="once">First payment</option>
                <option value="repeating">Multiple months</option>
                <option value="forever">Forever</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {duration === 'repeating' && (
              <div>
                <label className="label">Months</label>
                <input type="number" className="input" value={durationMonths} onChange={e => setDurationMonths(e.target.value)} />
              </div>
            )}
            <div>
              <label className="label">Max uses (optional)</label>
              <input type="number" className="input" placeholder="Unlimited" value={maxRedemptions} onChange={e => setMaxRedemptions(e.target.value)} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={creating || !name.trim() || !promoCode.trim()} className="btn-admin text-sm py-2 px-4 inline-flex items-center gap-1.5">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Coupon
          </button>
        </div>
      )}

      {coupons.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-400">No coupons yet. Create one to generate shareable discount links.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Code</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Discount</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Duration</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Used</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Link</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {coupons.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3">
                  <div>
                    <span className="font-medium text-gray-900">{c.name}</span>
                    {c.promo_codes.map(p => (
                      <span key={p.id} className="ml-2 font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{p.code}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-700">{formatDiscount(c)}</td>
                <td className="px-5 py-3 text-gray-500">{formatDuration(c)}</td>
                <td className="px-5 py-3 text-gray-500">{c.times_redeemed}{c.max_redemptions ? `/${c.max_redemptions}` : ''}</td>
                <td className="px-5 py-3">
                  {c.promo_codes.map(p => (
                    <button
                      key={p.id}
                      onClick={() => copyLink(p.code)}
                      className="text-xs text-admin-600 hover:text-admin-700 font-medium inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {copied === p.code ? 'Copied!' : 'Copy link'}
                    </button>
                  ))}
                </td>
                <td className="px-5 py-3">
                  <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:text-red-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
