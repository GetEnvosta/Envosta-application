'use client';

import { useState } from 'react';
import { Loader2, CreditCard, Check, AlertTriangle, Link2 } from 'lucide-react';

export function AttachDomainSubscription({ domainName, domainId, userId, renewalSubId, compact }: {
  domainName: string;
  domainId: string;
  userId: string;
  renewalSubId?: string | null;
  compact?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [subId, setSubId] = useState(renewalSubId ?? null);

  async function handleAttach() {
    if (!confirm(`Create a yearly domain renewal subscription for ${domainName}? The customer's card on file will be charged.`)) return;
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/attach-domain-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainName, domainId, userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubId(data.subscriptionId);
        setMsg('Subscription created and linked');
      } else {
        setMsg(data.error ?? 'Failed to create subscription');
      }
    } catch { setMsg('Connection error'); }
    setLoading(false);
  }

  // ── Compact inline mode (for customer detail rows) ──
  if (compact) {
    if (subId) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
          <Link2 className="w-3 h-3" /> Renewal active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
          <AlertTriangle className="w-3 h-3" /> No renewal
        </span>
        <button onClick={handleAttach} disabled={loading} className="text-[11px] text-admin-600 hover:text-admin-700 font-medium ml-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Attach'}
        </button>
        {msg && <span className={`text-[11px] ml-1 ${msg.includes('fail') || msg.includes('error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</span>}
      </span>
    );
  }

  // ── Full card mode (for domain detail page) ──
  if (subId) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-emerald-900">Domain subscription active</p>
          <a href={`https://dashboard.stripe.com/subscriptions/${subId}`} target="_blank" rel="noopener noreferrer"
            className="text-xs text-emerald-700 hover:underline font-mono">{subId.slice(-12)}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-medium text-amber-900">No renewal subscription</p>
      </div>
      <p className="text-xs text-amber-700 mb-3">This domain has no Stripe subscription for annual renewal. The customer won't be billed and the domain may expire.</p>
      {msg && <p className={`text-xs mb-2 ${msg.includes('fail') || msg.includes('error') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>}
      <button onClick={handleAttach} disabled={loading} className="btn-admin text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
        Create Renewal Subscription
      </button>
    </div>
  );
}
