'use client';

import { useState } from 'react';
import { Receipt, Banknote, Settings, Users, Percent } from 'lucide-react';

const TABS = [
  { id: 'pricing', label: 'Pricing', icon: Settings },
  { id: 'subscriptions', label: 'Subscriptions', icon: Users },
  { id: 'commissions', label: 'Commissions', icon: Banknote },
  { id: 'promotions', label: 'Promotions', icon: Percent },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
] as const;

type TabId = typeof TABS[number]['id'];

export function BillingTabs({ children }: { children: Record<string, React.ReactNode> }) {
  const [active, setActive] = useState<TabId>('pricing');

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              active === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active content */}
      {children[active]}
    </div>
  );
}
