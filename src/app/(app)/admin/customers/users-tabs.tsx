'use client';

import { Users, Handshake, Shield } from 'lucide-react';
import { UrlSyncedTabs, type TabSpec } from '@/components/admin/url-synced-tabs';

const TABS = [
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'partners', label: 'Partners', icon: Handshake },
  { id: 'staff', label: 'Staff', icon: Shield },
] as const satisfies readonly TabSpec[];

type TabId = typeof TABS[number]['id'];

export function UsersTabs({ children }: { children: Record<TabId, React.ReactNode> }) {
  return <UrlSyncedTabs tabs={TABS} defaultTab="customers" children={children} />;
}
