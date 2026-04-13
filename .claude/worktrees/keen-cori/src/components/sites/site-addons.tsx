'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Loader2, Package, Zap } from 'lucide-react';

interface Addon {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cad: number;
  billing: string;
  stripe_price_id: string | null;
}

interface ServiceAddon {
  id: string;
  product_id: string;
  status: string;
}

export function SiteAddons({ siteId }: { siteId: string }) {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [active, setActive] = useState<Record<string, ServiceAddon>>({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const [{ data: allAddons }, { data: svcAddons }] = await Promise.all([
        supabase.from('products').select('*').eq('type', 'plan_addon').eq('is_active', true).order('sort_order'),
        supabase.from('site_addons').select('*').eq('site_id', siteId).eq('status', 'active'),
      ]);
      setAddons(allAddons ?? []);
      const map: Record<string, ServiceAddon> = {};
      for (const sa of svcAddons ?? []) { map[sa.product_id] = sa; }
      setActive(map);
      setLoading(false);
    }
    fetch();
  }, [siteId]);

  async function toggle(addon: Addon) {
    const isEnabled = !!active[addon.id];
    setToggling(addon.id);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isEnabled ? 'remove-addon' : 'add-addon',
          siteId,
          addonId: addon.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to update addon');
        setToggling(null);
        return;
      }

      if (isEnabled) {
        setActive(prev => { const next = { ...prev }; delete next[addon.id]; return next; });
        setSuccess(`${addon.name} disabled`);
      } else {
        setActive(prev => ({ ...prev, [addon.id]: { id: data.serviceAddonId ?? '', product_id: addon.id, status: 'active' } }));
        setSuccess(`${addon.name} enabled`);
      }
    } catch {
      setError('Connection error');
    }
    setToggling(null);
    setTimeout(() => setSuccess(''), 3000);
  }

  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
  if (addons.length === 0) return <p className="text-sm text-gray-400">No add-ons available.</p>;

  return (
    <div className="space-y-3">
      {addons.map(addon => {
        const isEnabled = !!active[addon.id];
        const isToggling = toggling === addon.id;

        return (
          <div key={addon.id} className={`flex items-center justify-between rounded-xl border p-4 transition-all ${isEnabled ? 'border-brand-200 bg-brand-50/50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400'}`}>
                {addon.slug === 'bursting' ? <Zap className="w-4 h-4" /> : <Package className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                <p className="text-xs text-gray-500">
                  ${(addon.price_cad / 100).toFixed(2)} CAD
                  {addon.billing === 'monthly' ? '/mo' : addon.billing === 'yearly' ? '/yr' : ' one-time'}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggle(addon)}
              disabled={isToggling}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ background: isEnabled ? '#2563EB' : '#d1d5db', opacity: isToggling ? 0.5 : 1 }}
            >
              {isToggling ? (
                <Loader2 className="w-3 h-3 animate-spin absolute left-1/2 -translate-x-1/2 text-white" />
              ) : (
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow"
                  style={{ transform: isEnabled ? 'translateX(22px)' : 'translateX(4px)' }}
                />
              )}
            </button>
          </div>
        );
      })}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-600">{success}</p>}
    </div>
  );
}
