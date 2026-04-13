'use client';

import { useState } from 'react';
import { Monitor, Tablet, Smartphone, Eye } from 'lucide-react';

const SIZES = [
  { id: 'desktop', label: 'Desktop', width: '100%', icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: '768px', icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: '375px', icon: Smartphone },
] as const;

export function PagePreview({
  pages,
  selectedPageId,
  onSelectPage,
}: {
  pages: any[];
  selectedPageId: string;
  onSelectPage: (id: string) => void;
}) {
  const [size, setSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const selectedPage = pages.find(p => p.id === selectedPageId);
  const sizeConfig = SIZES.find(s => s.id === size)!;

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        {/* Page selector */}
        <select
          value={selectedPageId}
          onChange={e => onSelectPage(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 outline-none"
        >
          {pages.map(page => (
            <option key={page.id} value={page.id}>
              {page.title} {page.html ? '' : '(empty)'}
            </option>
          ))}
        </select>

        {/* Size toggles */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {SIZES.map(s => (
            <button
              key={s.id}
              onClick={() => setSize(s.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                size === s.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex justify-center bg-gray-100 rounded-xl p-4 min-h-[600px]">
        {selectedPage?.html ? (
          <div
            className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
            style={{ width: sizeConfig.width, maxWidth: '100%' }}
          >
            <iframe
              srcDoc={selectedPage.html}
              className="w-full border-0"
              style={{ height: '800px' }}
              sandbox="allow-same-origin"
              title={`Preview: ${selectedPage.title}`}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-400 py-20">
            <Eye className="w-10 h-10 text-gray-300" />
            <p className="text-sm">No content to preview</p>
            <p className="text-xs text-gray-300">Generate a page first in the Pages tab</p>
          </div>
        )}
      </div>
    </div>
  );
}
