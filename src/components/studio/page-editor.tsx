'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Plus, Trash2, Sparkles, Loader2, Check, FileText } from 'lucide-react';

export function PageEditor({
  projectId,
  pages,
  styleConfig,
  onPagesChange,
  selectedPageId,
  onSelectPage,
}: {
  projectId: string;
  pages: any[];
  styleConfig: any;
  onPagesChange: (pages: any[]) => void;
  selectedPageId: string;
  onSelectPage: (id: string) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [addingPage, setAddingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedPage = pages.find(p => p.id === selectedPageId);

  const saveField = useCallback((pageId: string, field: string, value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.from('studio_pages').update({
        [field]: value,
        updated_at: new Date().toISOString(),
      }).eq('id', pageId);
    }, 500);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function updatePage(pageId: string, field: string, value: string) {
    onPagesChange(pages.map(p => p.id === pageId ? { ...p, [field]: value } : p));
    saveField(pageId, field, value);
  }

  async function addPage() {
    if (!newPageTitle.trim()) return;
    const supabase = createClient();
    const slug = newPageTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data } = await supabase.from('studio_pages').insert({
      project_id: projectId,
      title: newPageTitle.trim(),
      slug,
      sort_order: pages.length,
    }).select('*').single();

    if (data) {
      onPagesChange([...pages, data]);
      onSelectPage(data.id);
      setNewPageTitle('');
      setAddingPage(false);
    }
  }

  async function deletePage(id: string) {
    if (!confirm('Delete this page?')) return;
    const supabase = createClient();
    await supabase.from('studio_pages').delete().eq('id', id);
    const updated = pages.filter(p => p.id !== id);
    onPagesChange(updated);
    if (selectedPageId === id) onSelectPage(updated[0]?.id || '');
  }

  async function handleGenerate() {
    if (!selectedPage) return;
    setGenerating(true);
    setStatus(null);

    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          pageId: selectedPage.id,
          style: styleConfig,
          pageName: selectedPage.title,
          pagePrompt: selectedPage.prompt,
          allPageNames: pages.map(p => p.title),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error || 'Generation failed' });
        return;
      }

      // Update local state and DB
      onPagesChange(pages.map(p => p.id === selectedPage.id ? { ...p, html: data.html } : p));
      const supabase = createClient();
      await supabase.from('studio_pages').update({ html: data.html, updated_at: new Date().toISOString() }).eq('id', selectedPage.id);
      setStatus({ type: 'success', msg: 'Page generated!' });
    } catch {
      setStatus({ type: 'error', msg: 'Network error' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex gap-6 min-h-[500px]">
      {/* Left sidebar — page list */}
      <div className="w-56 shrink-0 border-r border-gray-100 pr-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pages</h3>
          <button
            onClick={() => setAddingPage(true)}
            className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Add page"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          {pages.map(page => (
            <div
              key={page.id}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-all group ${
                page.id === selectedPageId
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              onClick={() => onSelectPage(page.id)}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="flex-1 truncate">{page.title}</span>
              {page.html && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Has content" />}
              <button
                onClick={e => { e.stopPropagation(); deletePage(page.id); }}
                className="p-0.5 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Add page inline form */}
        {addingPage && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              autoFocus
              value={newPageTitle}
              onChange={e => setNewPageTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addPage(); if (e.key === 'Escape') setAddingPage(false); }}
              className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="Page name..."
            />
            <div className="flex gap-1">
              <button onClick={addPage} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Add</button>
              <button onClick={() => { setAddingPage(false); setNewPageTitle(''); }} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        )}

        {pages.length === 0 && !addingPage && (
          <p className="text-xs text-gray-400 mt-4 text-center">No pages yet</p>
        )}
      </div>

      {/* Right content — page editor */}
      <div className="flex-1 min-w-0">
        {selectedPage ? (
          <div className="space-y-4">
            <input
              type="text"
              value={selectedPage.title}
              onChange={e => updatePage(selectedPage.id, 'title', e.target.value)}
              className="text-lg font-semibold text-gray-900 border-0 border-b border-transparent focus:border-gray-200 outline-none w-full bg-transparent pb-1"
              placeholder="Page title"
            />

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Page Prompt</label>
              <textarea
                value={selectedPage.prompt || ''}
                onChange={e => updatePage(selectedPage.id, 'prompt', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-vertical min-h-[120px]"
                placeholder="Describe what this page should contain... e.g. A hero section with bold headline about premium plumbing services, a services grid with icons, customer testimonials carousel, and a CTA section."
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedPage.prompt?.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> {selectedPage.html ? 'Regenerate' : 'Generate with AI'}</>
                )}
              </button>

              {status && (
                <span className={`text-xs font-medium ${status.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {status.type === 'success' && <Check className="w-3 h-3 inline mr-1" />}
                  {status.msg}
                </span>
              )}
            </div>

            {selectedPage.html && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Generated HTML</label>
                <textarea
                  value={selectedPage.html}
                  onChange={e => updatePage(selectedPage.id, 'html', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs font-mono text-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-vertical min-h-[200px]"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            {pages.length > 0 ? 'Select a page to edit' : 'Add a page to get started'}
          </div>
        )}
      </div>
    </div>
  );
}
