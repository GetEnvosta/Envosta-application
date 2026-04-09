'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Link2, Copy, Check, Loader2, MousePointerClick, UserPlus, DollarSign, Clock } from 'lucide-react';

export function AffiliateReferralCard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [customCode, setCustomCode] = useState('');

  useEffect(() => {
    fetch('/api/admin/referral-code')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function generateCode() {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/referral-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: customCode || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setStats((s: any) => ({ ...s, referralCode: data.referralCode }));
        setCustomCode('');
      } else {
        alert(data.error || 'Failed to generate code');
      }
    } catch {
      alert('Network error');
    }
    setGenerating(false);
  }

  function copyLink() {
    if (!stats?.referralCode) return;
    navigator.clipboard.writeText(`https://envosta.com/get-started?ref=${stats.referralCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <div className="card p-5 animate-pulse h-32" />;

  const hasCode = !!stats?.referralCode;

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-4 h-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">Your Referral Link</h3>
      </div>

      {hasCode ? (
        <>
          {/* Link display */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm font-mono text-gray-700 truncate">
              https://envosta.com/get-started?ref={stats.referralCode}
            </div>
            <button
              onClick={copyLink}
              className="shrink-0 p-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <MousePointerClick className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-gray-900">{stats.clicks ?? 0}</p>
              <p className="text-[10px] text-gray-500">Clicks</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 text-center">
              <UserPlus className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-gray-900">{stats.signups ?? 0}</p>
              <p className="text-[10px] text-gray-500">Signups</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center">
              <Clock className="w-4 h-4 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-gray-900">${((stats.pendingAmount ?? 0) / 100).toFixed(0)}</p>
              <p className="text-[10px] text-gray-500">Pending</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <DollarSign className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-semibold text-gray-900">${((stats.totalEarned ?? 0) / 100).toFixed(0)}</p>
              <p className="text-[10px] text-gray-500">Total Earned</p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Generate a referral code to get your unique signup link.</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customCode}
              onChange={e => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="your-name (or leave blank for auto)"
            />
            <button
              onClick={generateCode}
              disabled={generating}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
