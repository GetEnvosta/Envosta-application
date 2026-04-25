'use client';

import { DollarSign, Gauge, Cpu, ShoppingCart } from 'lucide-react';
import { UrlSyncedTabs, type TabSpec } from '@/components/admin/url-synced-tabs';

const TABS = [
  { id: 'financial', label: 'Financial', icon: DollarSign },
  { id: 'usage', label: 'Platform Usage', icon: Gauge },
  { id: 'api', label: 'API Costs', icon: Cpu },
  { id: 'abandoned', label: 'Abandoned Carts', icon: ShoppingCart },
] as const satisfies readonly TabSpec[];

type TabId = typeof TABS[number]['id'];

export function ReportingTabs({ children }: { children: Record<TabId, React.ReactNode> }) {
  return <UrlSyncedTabs tabs={TABS} defaultTab="financial" children={children} />;
}
