'use client';

import { Receipt, Users } from 'lucide-react';
import { UrlSyncedTabs, type TabSpec } from '@/components/admin/url-synced-tabs';

const TABS = [
  { id: 'subscriptions', label: 'Subscriptions', icon: Users },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
] as const satisfies readonly TabSpec[];

type TabId = typeof TABS[number]['id'];

export function BillingTabs({ children }: { children: Record<TabId, React.ReactNode> }) {
  return <UrlSyncedTabs tabs={TABS} defaultTab="subscriptions" children={children} />;
}
