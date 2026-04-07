'use client';

import { useState } from 'react';
import { Palette, FileText, Eye, Download } from 'lucide-react';
import { StyleEditor } from '@/components/studio/style-editor';
import { PageEditor } from '@/components/studio/page-editor';
import { PagePreview } from '@/components/studio/page-preview';
import { ExportPanel } from '@/components/studio/export-panel';

const TABS = [
  { id: 'style', label: 'Style', icon: Palette },
  { id: 'pages', label: 'Pages', icon: FileText },
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'export', label: 'Export', icon: Download },
] as const;

type TabId = typeof TABS[number]['id'];

export function StudioEditor({ project, initialPages }: { project: any; initialPages: any[] }) {
  const [activeTab, setActiveTab] = useState<TabId>('style');
  const [styleConfig, setStyleConfig] = useState(project.style_config || {});
  const [pages, setPages] = useState(initialPages);
  const [selectedPageId, setSelectedPageId] = useState(initialPages[0]?.id || '');

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-4">{project.name}</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card p-6">
        {activeTab === 'style' && (
          <StyleEditor
            projectId={project.id}
            styleConfig={styleConfig}
            onStyleChange={setStyleConfig}
          />
        )}
        {activeTab === 'pages' && (
          <PageEditor
            projectId={project.id}
            pages={pages}
            styleConfig={styleConfig}
            onPagesChange={setPages}
            selectedPageId={selectedPageId}
            onSelectPage={setSelectedPageId}
          />
        )}
        {activeTab === 'preview' && (
          <PagePreview
            pages={pages}
            selectedPageId={selectedPageId}
            onSelectPage={setSelectedPageId}
          />
        )}
        {activeTab === 'export' && (
          <ExportPanel
            projectId={project.id}
            project={project}
            pages={pages}
          />
        )}
      </div>
    </div>
  );
}
