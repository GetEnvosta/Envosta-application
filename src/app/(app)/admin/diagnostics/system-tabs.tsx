'use client';

import { Activity, ScrollText, Mail, Percent, BookOpen } from 'lucide-react';
import { UrlSyncedTabs, type TabSpec } from '@/components/admin/url-synced-tabs';

// `stripe` tab was removed — Stripe Products catalog is now managed in
// /admin/settings (Plans / Addons / Services / TLDs), no point in
// duplicating a read-only list here.
const TABS = [
  { id: 'health', label: 'Health', icon: Activity },
  { id: 'lifecycle', label: 'Lifecycle', icon: BookOpen },
  { id: 'logs', label: 'Logs', icon: ScrollText },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'promotions', label: 'Promotions', icon: Percent },
] as const satisfies readonly TabSpec[];

type TabId = typeof TABS[number]['id'];

export function SystemTabs({ children }: { children: Record<TabId, React.ReactNode> }) {
  return <UrlSyncedTabs tabs={TABS} defaultTab="health" children={children} />;
}
