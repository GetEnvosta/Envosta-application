'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Building2 } from 'lucide-react';
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
