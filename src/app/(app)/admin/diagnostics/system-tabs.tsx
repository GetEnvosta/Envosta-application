'use client';

import { useState } from 'react';
import { Activity, ScrollText, Mail, Phone, CreditCard, Percent } from 'lucide-react';

const TABS = [
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'phone', label: 'Phone & SMS', icon: Phone },
  { id: 'stripe', label: 'Stripe', icon: CreditCard },
  { id: 'promotions', label: 'Promotions', icon: Percent },
] as const;

type TabId = typeof TABS[number]['id'];

export function SystemTabs({ children }: { children: Record<string, React.ReactNode> }) {
  const [active, setActive] = useState<TabId>('health');

  return (
    <div>
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActive(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              active === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
      {children[active]}
    </div>
  );
}
