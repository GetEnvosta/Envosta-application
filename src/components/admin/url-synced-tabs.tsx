'use client';

/**
 * <UrlSyncedTabs> — pill-style tab bar with active tab synced to URL hash.
 *
 * Why: every admin tab UI used local useState, so reloading the page
 * always reset to the first tab. This stores the active tab in the URL
 * hash (e.g. /admin/diagnostics#stripe) which:
 *   - survives reloads
 *   - is shareable (link to a specific tab)
 *   - doesn't trigger Next.js navigation/refetch (hash-only changes)
 *
 * Used by SystemTabs / BillingTabs / ReportingTabs / UsersTabs as a thin
 * config wrapper.
 */

import { useEffect, useState, type ComponentType } from 'react';

export type TabSpec<Id extends string = string> = {
  id: Id;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

interface Props<Id extends string> {
  tabs: readonly TabSpec<Id>[];
  defaultTab: Id;
  /** Map of tab id → ReactNode to render when that tab is active. */
  children: Record<Id, React.ReactNode>;
}

export function UrlSyncedTabs<Id extends string>({ tabs, defaultTab, children }: Props<Id>) {
  const ids = tabs.map(t => t.id);
  const [active, setActive] = useState<Id>(defaultTab);

  // Initial: read hash on mount.
  useEffect(() => {
    const fromHash = (typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '') as Id;
    if (fromHash && ids.includes(fromHash)) {
      setActive(fromHash);
    }
    // Listen for back/forward and external hash changes too.
    function onHashChange() {
      const next = window.location.hash.replace(/^#/, '') as Id;
      if (next && ids.includes(next)) setActive(next);
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTab(id: Id) {
    setActive(id);
    if (typeof window !== 'undefined') {
      // replaceState avoids polluting browser history with every tab click.
      const url = `${window.location.pathname}${window.location.search}#${id}`;
      window.history.replaceState(null, '', url);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => selectTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              active === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
      {children[active]}
    </div>
  );
}
