'use client';

import { Activity, ScrollText, Mail, CreditCard, Percent, BookOpen } from 'lucide-react';
import { UrlSyncedTabs, type TabSpec } from '@/components/admin/url-synced-tabs';

const TABS = [
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'lifecycle', label: 'Lifecycle', icon: BookOpen },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'stripe', label: 'Stripe', icon: CreditCard },
  { id: 'promotions', label: 'Promotions', icon: Percent },
] as const satisfies readonly TabSpec[];

type TabId = typeof TABS[number]['id'];

export function SystemTabs({ children }: { children: Record<TabId, React.ReactNode> }) {
  return <UrlSyncedTabs tabs={TABS} defaultTab="health" children={children} />;
}
