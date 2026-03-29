'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ArrowRight, Check, Loader2, Zap } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_cad: number;
  metadata: any;
}

export function PlanSwitcher({
  siteId,
  currentPlanId,
}: {
  siteId: string;
  currentPlanId: string | null;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanId);
  const [customPrice, setCustomPrice] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('products')
      .select('id, name, slug, price_cad, metadata')
      .eq('type', 'hosting_plan')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setPlans(data ?? []);
        setLoading(false);
      });
  }, []);

  async function handleSwitch(newPlanId: string) {
    if (newPlanId === currentPlanId || switching) return;

    const plan = plans.find(p => p.id === newPlanId);
    if (!plan) return;
    const isCustom = plan.metadata?.custom_pricing;
    if (isCustom && !customPrice) {
      setStatus({ type: 'error', message: 'Enter a custom monthly price for Enterprise.' });
      return;
    }
    const confirmMsg = isCustom
      ? `Switch to Enterprise at $${customPrice}/mo CAD? This will update billing.`
      : `Switch to the ${plan.name} plan? Your billing will be prorated.`;
    if (!confirm(confirmMsg)) return;

    setSwitching(true);
    setStatus(null);
    setSelectedPlanId(newPlanId);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus({ type: 'error', message: 'Not authenticated' }); setSwitching(false); return; }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/site-info`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            action: 'change-plan',
            siteId,
            newPlanId,
            ...(plan.metadata?.custom_pricing && customPrice ? { customPriceCad: Math.round(parseFloat(customPrice) * 100) } : {}),
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        setStatus({ type: 'success', message: `Switched to ${data.plan}. Resources updated.` });
      } else {
        setStatus({ type: 'error', message: data.error ?? 'Failed to switch plan' });
        setSelectedPlanId(currentPlanId);
      }
    } catch {
      setStatus({ type: 'error', message: 'Connection error' });
      setSelectedPlanId(currentPlanId);
    }
    setSwitching(false);
  }

  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {plans.map(plan => {
          const isCurrent = plan.id === currentPlanId;
          const isSelected = plan.id === selectedPlanId;

          return (
            <button
              key={plan.id}
              onClick={() => handleSwitch(plan.id)}
              disabled={isCurrent || switching}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                isCurrent
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500/20'
                  : isSelected && switching
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${isCurrent || switching ? '' : 'cursor-pointer'}`}
            >
              {isCurrent && (
                <span className="absolute -top-2.5 left-3 bg-brand-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Current
                </span>
              )}
              <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
              {plan.metadata?.custom_pricing ? (
                <div className="mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 text-sm">$</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={customPrice}
                      onChange={e => { e.stopPropagation(); setCustomPrice(e.target.value); }}
                      onClick={e => e.stopPropagation()}
                      className="w-20 text-lg font-bold text-gray-900 border-b border-gray-300 focus:border-brand-500 outline-none bg-transparent"
                    />
                    <span className="text-xs text-gray-500">/mo CAD</span>
                  </div>
                </div>
              ) : (
                <p className="text-lg font-bold text-gray-900 mt-1">
                  ${(plan.price_cad / 100).toFixed(0)}
                  <span className="text-xs font-normal text-gray-500">/mo</span>
                </p>
              )}
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <p>{plan.metadata?.storage_gb} GB storage</p>
                <p>{plan.metadata?.php_workers_default} PHP workers</p>
                <p>{plan.metadata?.php_memory_mb} MB memory</p>
                <p>{plan.metadata?.bandwidth_gb > 0 ? `${plan.metadata?.bandwidth_gb} GB bandwidth` : 'Unlimited bandwidth'}</p>
              </div>
              {!isCurrent && !switching && (
                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-600">
                  <Zap className="w-3 h-3" />
                  {plan.price_cad > (plans.find(p => p.id === currentPlanId)?.price_cad ?? 0)
                    ? 'Upgrade' : 'Downgrade'}
                </div>
              )}
              {isSelected && switching && (
                <div className="mt-3 flex items-center gap-1 text-xs text-amber-600">
                  <Loader2 className="w-3 h-3 animate-spin" /> Switching...
                </div>
              )}
            </button>
          );
        })}
      </div>
      {status && (
        <div className={`mt-3 flex items-center gap-2 text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {status.type === 'success' ? <Check className="w-4 h-4" /> : null}
          {status.message}
        </div>
      )}
    </div>
  );
}
