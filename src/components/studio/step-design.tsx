'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import {
  Sparkles, Loader2, Check, FileText, Palette, ArrowRight,
  Monitor, Tablet, Smartphone, Eye,
} from 'lucide-react';

const FONT_OPTIONS = [
  'Playfair Display', 'DM Serif Display', 'Fraunces', 'Libre Baskerville',
  'Cormorant Garamond', 'Lora', 'Merriweather', 'Source Serif 4',
  'Space Grotesk', 'Plus Jakarta Sans', 'Source Sans 3', 'Libre Franklin',
  'Work Sans', 'Outfit', 'Manrope', 'Inter', 'Sora', 'DM Sans', 'Albert Sans', 'Figtree',
];

const COLOR_FIELDS = [
  { key: 'primary', label: 'Primary' }, { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' }, { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Surface' }, { key: 'text', label: 'Text' },
  { key: 'textMuted', label: 'Text Muted' }, { key: 'border', label: 'Border' },
];

const SIZES = [
  { id: 'desktop', width: '100%', icon: Monitor },
  { id: 'tablet', width: '768px', icon: Tablet },
  { id: 'mobile', width: '375px', icon: Smartphone },
] as const;

export function StepDesign({
  projectId, styleConfig, pages, selectedPageId, businessInfo,
  onStyleChange, onPagesChange, onSelectPage, onContinue,
}: {
  projectId: string;
  styleConfig: any;
  pages: any[];
  selectedPageId: string;
  businessInfo: any;
  onStyleChange: (config: any) => void;
  onPagesChange: (pages: any[]) => void;
  onSelectPage: (id: string) => void;
  onContinue: () => void;
}) {
  const [showStyles, setShowStyles] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null); // page ID being generated
  const [generatingAll, setGeneratingAll] = useState(false);
  const [previewSize, setPreviewSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedPage = pages.find(p => p.id === selectedPageId);
  const allGenerated = pages.length > 0 && pages.every(p => p.html);
  const sizeConfig = SIZES.find(s => s.id === previewSize)!;

  // Auto-save style with debounce
  const saveStyle = useCallback((config: any) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.from('studio_projects').update({ style_config: config, updated_at: new Date().toISOString() }).eq('id', projectId);
    }, 500);
  }, [projectId]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function updateStyle(path: string[], value: string) {
    const next = JSON.parse(JSON.stringify(styleConfig));
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] ??= {};
    obj[path[path.length - 1]] = value;
    onStyleChange(next);
    saveStyle(next);
  }

  async function generatePage(pageId: string) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    setGenerating(pageId);
    setStatus(null);

    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, pageId, style: styleConfig,
          pageName: page.title, pagePrompt: page.prompt,
          allPageNames: pages.map(p => p.title),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setStatus({ type: 'error', msg: data.error || 'Failed' }); return; }

      const updated = pages.map(p => p.id === pageId ? { ...p, html: data.html } : p);
      onPagesChange(updated);

      const supabase = createClient();
      await supabase.from('studio_pages').update({ html: data.html, updated_at: new Date().toISOString() }).eq('id', pageId);
      setStatus({ type: 'success', msg: `${page.title} generated!` });
    } catch {
      setStatus({ type: 'error', msg: 'Network error' });
    } finally {
      setGenerating(null);
    }
  }

  async function generateAllPages() {
    setGeneratingAll(true);
    for (const page of pages) {
      if (!page.html) {
        await generatePage(page.id);
      }
    }
    setGeneratingAll(false);
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  return (
    <div className="flex h-full">
      {/* Left panel — page list + styles */}
      <div className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-auto">
        {/* Page list */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Pages</h3>
            <button
              onClick={generateAllPages}
              disabled={generatingAll || allGenerated}
              className="text-[10px] font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {generatingAll ? 'Generating...' : allGenerated ? 'All done' : 'Generate All'}
            </button>
          </div>
          <div className="space-y-1">
            {pages.map(page => (
              <button
                key={page.id}
                onClick={() => onSelectPage(page.id)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all text-left ${
                  page.id === selectedPageId
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span className="flex-1 truncate">{page.title}</span>
                {generating === page.id && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                {page.html && generating !== page.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Styles toggle */}
        <button
          onClick={() => setShowStyles(!showStyles)}
          className="flex items-center gap-2 px-4 py-3 text-xs font-medium text-gray-600 hover:bg-gray-50 border-b border-gray-100"
        >
          <Palette className="w-3.5 h-3.5" />
          Global Styles
          <span className="ml-auto text-gray-400">{showStyles ? '▲' : '▼'}</span>
        </button>

        {showStyles && (
          <div className="p-4 space-y-4 overflow-auto flex-1">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Site Name</label>
              <input type="text" value={styleConfig.siteName || ''} onChange={e => updateStyle(['siteName'], e.target.value)} className={inputClass} placeholder="Business Name" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Heading Font</label>
                <select value={styleConfig.fonts?.heading || 'Playfair Display'} onChange={e => updateStyle(['fonts', 'heading'], e.target.value)} className={inputClass + ' text-xs'}>
                  {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Body Font</label>
                <select value={styleConfig.fonts?.body || 'Source Sans 3'} onChange={e => updateStyle(['fonts', 'body'], e.target.value)} className={inputClass + ' text-xs'}>
                  {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-2">Colors</label>
              <div className="grid grid-cols-2 gap-2">
                {COLOR_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <input type="color" value={styleConfig.colors?.[key] || '#000'} onChange={e => updateStyle(['colors', key], e.target.value)} className="w-6 h-6 rounded border border-gray-200 cursor-pointer p-0" />
                    <span className="text-[10px] text-gray-500 truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — preview + controls */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top controls */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            {selectedPage && (
              <button
                onClick={() => generatePage(selectedPage.id)}
                disabled={!!generating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {generating === selectedPage?.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {selectedPage?.html ? 'Regenerate' : 'Generate'}
              </button>
            )}
            {status && (
              <span className={`text-xs ${status.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{status.msg}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
              {SIZES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setPreviewSize(s.id)}
                  className={`p-1.5 rounded text-xs transition-all ${previewSize === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <button
              onClick={onContinue}
              disabled={!allGenerated}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
            >
              Export <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 bg-gray-100 flex justify-center p-4 overflow-auto">
          {selectedPage?.html ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300" style={{ width: sizeConfig.width, maxWidth: '100%' }}>
              <iframe
                srcDoc={selectedPage.html}
                className="w-full border-0"
                style={{ height: '100%', minHeight: '800px' }}
                sandbox="allow-same-origin"
                title={`Preview: ${selectedPage?.title}`}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-gray-400 py-20">
              <Eye className="w-10 h-10 text-gray-300" />
              <p className="text-sm">Click "Generate" to create this page</p>
              <p className="text-xs text-gray-300">{selectedPage?.title || 'Select a page'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
