'use client';

import { useState, useEffect } from 'react';
import { Loader2, UserPlus, Copy, Check, ExternalLink } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';

type Plan = {
  id: string;
  name: string;
  slug: string;
  price_cad: number | null;
  price_usd: number | null;
};

export function CreateUnclaimedAccount() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [siteLabel, setSiteLabel] = useState('');
  const [productId, setProductId] = useState('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from('products')
      .select('id, name, slug, price_cad, price_usd')
      .eq('type', 'hosting_plan')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => {
        const list = (data ?? []) as Plan[];
        setPlans(list);
        if (list.length > 0 && !productId) setProductId(list[0].id);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleCreate() {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    if (siteLabel.trim() && !productId) {
      setError('Please select a hosting plan for the site');
      return;
    }
    setCreating(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/admin/create-unclaimed-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
          siteLabel: siteLabel.trim() || undefined,
          productId: siteLabel.trim() ? productId : undefined,
          expiresInDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create account');
      } else {
        setResult(data);
      }
    } catch {
      setError('Network error');
    }
    setCreating(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(result.claimUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setName(''); setEmail(''); setPhone(''); setCompany(''); setSiteLabel('');
    setExpiresInDays(30); setResult(null); setError(''); setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-admin-600 hover:bg-admin-700 rounded-lg transition-colors">
        <UserPlus className="w-4 h-4" /> Create Account for Client
      </button>
    );
  }

  if (result) {
    return (
      <div className="card p-6 border-emerald-200 bg-emerald-50/30 space-y-4">
        <div className="flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-gray-900">Account Created</h3>
        </div>
        <p className="text-sm text-gray-600">
          An email has been sent to <strong>{email}</strong> with a link to claim their account.
        </p>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
          <input type="text" readOnly value={result.claimUrl}
            className="flex-1 text-xs font-mono text-gray-600 bg-transparent outline-none" />
          <button onClick={copyLink} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <a href={result.claimUrl} target="_blank" rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-xs text-gray-400">
          Expires in {expiresInDays} days. You can also share the link directly.
        </p>
        <button onClick={reset} className="text-xs text-admin-600 hover:text-admin-700 font-medium">
          Create Another
        </button>
      </div>
    );
  }

  const inputClass = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-admin-400 focus:ring-1 focus:ring-admin-400 outline-none';

  return (
    <div className="card p-6 border-admin-200 bg-admin-50/30 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-admin-600" /> Create Account for Client
        </h3>
        <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        Create an account and site for a client. They'll receive an email to set their password and claim it.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Full Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} placeholder="Jane Smith" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="jane@business.com" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inputClass} placeholder="(403) 555-0123" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Company</label>
          <input type="text" value={company} onChange={e => setCompany(e.target.value)} className={inputClass} placeholder="Smith Plumbing" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Site Name</label>
          <input type="text" value={siteLabel} onChange={e => setSiteLabel(e.target.value)} className={inputClass} placeholder="smith-plumbing" />
          <p className="text-[10px] text-gray-400 mt-0.5">Creates a site and starts provisioning</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">
            Hosting Plan {siteLabel.trim() ? '*' : ''}
          </label>
          <select
            value={productId}
            onChange={e => setProductId(e.target.value)}
            className={inputClass}
            disabled={plans.length === 0}
          >
            {plans.length === 0 && <option value="">Loading…</option>}
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}{p.price_cad != null ? ` — $${p.price_cad} CAD/mo` : ''}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400 mt-0.5">Customer will check out for this plan when they claim</p>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Expires In (days)</label>
          <input type="number" value={expiresInDays} min={7} max={90}
            onChange={e => setExpiresInDays(Math.min(90, Math.max(7, parseInt(e.target.value) || 30)))}
            className={inputClass} />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button onClick={handleCreate} disabled={creating}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-admin-600 hover:bg-admin-700 rounded-lg disabled:opacity-50 transition-colors">
          {creating && <Loader2 className="w-4 h-4 animate-spin" />}
          Create & Send Invite
        </button>
      </div>
    </div>
  );
}
