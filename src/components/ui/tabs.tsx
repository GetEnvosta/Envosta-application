'use client';

import { useState } from 'react';

export interface TabDef {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
}

/**
 * Lightweight slots-pattern tabs. Server components render each panel and
 * pass it in as `content`; only the active panel is mounted, so panels that
 * fetch on mount stay lazy. Styling matches the app's light theme.
 */
export function Tabs({ tabs, initialId }: { tabs: TabDef[]; initialId?: string }) {
  const [active, setActive] = useState(initialId ?? tabs[0]?.id);
  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div
        role="tablist"
        className="flex items-center gap-0.5 overflow-x-auto border-b border-gray-200 px-1 -mx-1"
      >
        {tabs.map((t) => {
          const isActive = t.id === activeTab?.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.id)}
              className={`relative flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                isActive ? 'text-brand-600' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.icon}
              {t.label}
              {isActive && (
                <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-600" />
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-5">
        {activeTab?.content}
      </div>
    </div>
  );
}
