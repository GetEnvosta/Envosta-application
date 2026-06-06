'use client';

import { useState } from 'react';
import { Loader2, Send, ArrowLeftRight, Check } from 'lucide-react';

/**
 * Owner-initiated site handoff. Sends an invite to a recipient email; they
 * accept at /transfer/accept, set up their own billing, and the site + sub
 * move to them. The owner keeps paying until the recipient accepts.
 */
export function SiteHandoffButton({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  async function submit() {
    if (!email.trim()) { setError('Recipient email is required'); return; }
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/site-transfer/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, recipientEmail: email.trim(), expiresInDays: days }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? 'Failed to send invite');
      else setSentTo(email.trim());
    } catch {
      setError('Network error');
    }
    setBusy(false);
  }

  if (sentTo) {
    return (
      <span className="text-xs text-emerald-700 inline-flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5" /> Invite sent to {sentTo}
      </span>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs py-1.5 px-3 inline-flex items-center gap-1.5">
        <ArrowLeftRight className="w-3.5 h-3.5" /> Hand off site
      </button>
    );
  }

  return (
    <div className="w-full sm:w-auto sm:min-w-[320px] space-y-2">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="recipient@email.com"
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-gray-400 outline-none"
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Expires in</label>
        <input
          type="number" min={1} max={30} value={days}
          onChange={e => setDays(Math.min(30, Math.max(1, parseInt(e.target.value) || 14)))}
          className="w-16 px-2 py-1 text-sm border border-gray-200 rounded-lg outline-none"
        />
        <span className="text-xs text-gray-500">days</span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Send invite
        </button>
        <button onClick={() => { setOpen(false); setError(''); }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
    </div>
  );
}
