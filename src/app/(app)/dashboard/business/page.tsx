'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Building2, Sparkles, Search } from 'lucide-react';
import Toast from '@/components/ui/toast';

interface BusinessInfo {
  name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  business_hours: string;
  services: string;
  description: string;
}

const EMPTY: BusinessInfo = {
  name: '',
  phone: '',
  email: '',
  website: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  country: 'CA',
  business_hours: '',
  services: '',
  description: '',
};

interface ToastState { message: string; type: 'success' | 'error' | 'info' }

export default function BusinessPage() {
  const [form, setForm] = useState<BusinessInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // AI autofill
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFieldsFound, setAiFieldsFound] = useState<string[]>([]);

  const showToast = useCallback((message: string, type: ToastState['type']) => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/business');
        if (res.ok) {
          const data = await res.json();
          if (data.business && Object.keys(data.business).length > 0) {
            setForm(prev => ({ ...prev, ...data.business }));
          }
        }
      } catch (e) {
        console.error('Failed to load business info:', e);
      }
      setLoading(false);
    })();
  }, []);

  function set(field: keyof BusinessInfo, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleAutofill() {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiFieldsFound([]);
    try {
      const res = await fetch('/api/business/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Lookup failed', 'error');
        setAiLoading(false);
        return;
      }
      const biz = data.business;
      if (!biz) {
        showToast('No results found', 'info');
        setAiLoading(false);
        return;
      }

      // Only fill fields that came back non-empty and are currently empty or the user hasn't typed in
      const filled: string[] = [];
      const fieldLabels: Record<keyof BusinessInfo, string> = {
        name: 'Business Name', phone: 'Phone', email: 'Email', website: 'Website',
        address: 'Address', city: 'City', province: 'Province', postal_code: 'Postal Code',
        country: 'Country', business_hours: 'Business Hours', services: 'Services', description: 'Description',
      };
      setForm(prev => {
        const updated = { ...prev };
        for (const key of Object.keys(EMPTY) as (keyof BusinessInfo)[]) {
          const val = biz[key];
          if (val && typeof val === 'string' && val.trim()) {
            updated[key] = val.trim();
            filled.push(fieldLabels[key]);
          }
        }
        return updated;
      });

      setAiFieldsFound(filled);
      if (filled.length > 0) {
        showToast(`Filled ${filled.length} field${filled.length > 1 ? 's' : ''} — review and save`, 'success');
      } else {
        showToast('No details found for that search', 'info');
      }
    } catch {
      showToast('Lookup failed. Try again.', 'error');
    }
    setAiLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) showToast('Business information saved', 'success');
      else showToast('Failed to save', 'error');
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Business Information</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Your business details — used across your Envosta services.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">

        {/* AI Autofill */}
        <div className="card p-5 border-brand-200 bg-gradient-to-r from-brand-50/40 to-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-brand-600" />
            <h2 className="text-sm font-semibold text-gray-900">AI Autofill</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Enter your business name or website URL and we'll look it up and fill in what we can find.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAutofill())}
                placeholder="e.g. Acme Plumbing Calgary or https://acmeplumbing.ca"
                className="input pl-8 w-full text-sm"
                disabled={aiLoading}
              />
            </div>
            <button
              type="button"
              onClick={handleAutofill}
              disabled={aiLoading || !aiQuery.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {aiLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Autofill</>
              )}
            </button>
          </div>
          {aiFieldsFound.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {aiFieldsFound.map(f => (
                <span key={f} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-100 text-brand-700">
                  {f}
                </span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-2">
            Uses AI to search the web. Review all fields before saving — AI results may not be 100% accurate.
          </p>
        </div>

        {/* Basic Info */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" /> Business Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Business Name</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Acme Services Inc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Business Phone</label>
                <input className="input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="label">Business Email</label>
                <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="hello@yourbusiness.com" />
              </div>
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input" type="url" value={form.website} onChange={e => set('website', e.target.value)}
                placeholder="https://yourbusiness.com" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Briefly describe what your business does..." />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-5">Address</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Street Address</label>
              <input className="input" value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="123 Main Street" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">City</label>
                <input className="input" value={form.city} onChange={e => set('city', e.target.value)}
                  placeholder="Toronto" />
              </div>
              <div>
                <label className="label">Province / State</label>
                <input className="input" value={form.province} onChange={e => set('province', e.target.value)}
                  placeholder="ON" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Postal / ZIP Code</label>
                <input className="input" value={form.postal_code} onChange={e => set('postal_code', e.target.value)}
                  placeholder="M5V 2T6" />
              </div>
              <div>
                <label className="label">Country</label>
                <select className="input" value={form.country} onChange={e => set('country', e.target.value)}>
                  <option value="CA">Canada</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="NZ">New Zealand</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Operations */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Operations</h2>
          <p className="text-xs text-gray-400 mb-5">
            Your operating hours and services.
          </p>
          <div className="space-y-4">
            <div>
              <label className="label">Business Hours</label>
              <input className="input" value={form.business_hours} onChange={e => set('business_hours', e.target.value)}
                placeholder="Mon–Fri 9am–5pm, Sat 10am–3pm, closed Sunday" />
            </div>
            <div>
              <label className="label">Services Offered</label>
              <textarea className="input resize-none" rows={3} value={form.services}
                onChange={e => set('services', e.target.value)}
                placeholder="List the main services your business provides..." />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : 'Save Business Info'}
          </button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
