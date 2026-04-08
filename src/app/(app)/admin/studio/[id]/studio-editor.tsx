'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Palette, FileText, Eye, Download, ArrowLeft } from 'lucide-react';
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
    <div className="flex flex-col h-full">
      {/* Top bar — project name + tabs */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <Link href="/admin/studio" className="p-1.5 -ml-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Back to projects">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h1>
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 ml-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — fills remaining space */}
      <div className="flex-1 overflow-auto p-5">
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
