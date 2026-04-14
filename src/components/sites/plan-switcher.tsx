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
      ? `Switch to Enterprise at $${customPrice}/mo USD? This will update billing.`
      : `Switch to the ${plan.name} plan? Your billing will be prorated.`;
    if (!confirm(confirmMsg)) return;

    setSwitching(true);
    setStatus(null);
    setSelectedPlanId(newPlanId);

    try {
      const res = await fetch('/api/site-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-plan',
          siteId,
          newPlanId,
          ...(plan.metadata?.custom_pricing && customPrice ? { customPriceCad: Math.round(parseFloat(customPrice) * 100) } : {}),
        }),
      });

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

  const currentPlan = plans.find(p => p.id === currentPlanId);
  const currentPrice = currentPlan?.price_cad ?? 0;

  return (
    <div>
      <div className="flex items-center gap-3">
        <select
          value={selectedPlanId ?? ''}
          onChange={e => {
            const newId = e.target.value;
            if (newId && newId !== currentPlanId) {
              setSelectedPlanId(newId);
              const plan = plans.find(p => p.id === newId);
              if (plan?.metadata?.custom_pricing) {
                // Don't auto-switch for custom pricing — user needs to enter price first
              } else {
                handleSwitch(newId);
              }
            }
          }}
          disabled={switching}
          className="input text-sm py-2 pr-8 min-w-[220px]"
        >
          {plans.map(plan => {
            const isCurrent = plan.id === currentPlanId;
            const isUpgrade = plan.price_cad > currentPrice;
            const isCustom = plan.metadata?.custom_pricing;
            const direction = isCurrent ? '(current)' : isCustom ? '(custom)' : isUpgrade ? '\u2191 Upgrade' : '\u2193 Downgrade';

            return (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {isCustom ? 'Custom' : `$${(plan.price_cad / 100).toFixed(0)}/mo`} {direction}
              </option>
            );
          })}
        </select>

        {switching && (
          <span className="flex items-center gap-1.5 text-xs text-amber-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Switching...
          </span>
        )}
      </div>

      {/* Custom price input for Enterprise */}
      {selectedPlanId && plans.find(p => p.id === selectedPlanId)?.metadata?.custom_pricing && selectedPlanId !== currentPlanId && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-500">$</span>
          <input
            type="number"
            placeholder="0"
            value={customPrice}
            onChange={e => setCustomPrice(e.target.value)}
            className="input text-sm py-1.5 w-24"
          />
          <span className="text-xs text-gray-500">/mo USD</span>
          <button
            onClick={() => selectedPlanId && handleSwitch(selectedPlanId)}
            disabled={switching || !customPrice}
            className="btn-admin text-xs py-1.5 px-3"
          >
            Apply
          </button>
        </div>
      )}

      {status && (
        <div className={`mt-3 flex items-center gap-2 text-sm ${status.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {status.type === 'success' ? <Check className="w-4 h-4" /> : null}
          {status.message}
        </div>
      )}
    </div>
  );
}
