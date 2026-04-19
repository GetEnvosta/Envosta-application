'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sparkles, Loader2, Check, FileText, Palette, ArrowRight, Send,
  Monitor, Tablet, Smartphone, Eye, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Plus, Trash2, LayoutTemplate,
  Upload, X,
} from 'lucide-react';
import { fetchWithRetry } from '@/lib/fetch-retry';

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

// Special page types
const SPECIAL_PAGES = ['Header', 'Footer'];

export function StepDesign({
  projectId, styleConfig, pages, selectedPageId, businessInfo,
  onStyleChange, onPagesChange, onSelectPage, onContinue, onAuthRequired,
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
  onAuthRequired?: () => void;
}) {
  const [showPages, setShowPages] = useState(true);
  const [showStyles, setShowStyles] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [previewSize, setPreviewSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [referenceHtml, setReferenceHtml] = useState('');
  const [addingPage, setAddingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedPage = pages.find(p => p.id === selectedPageId);
  const allGenerated = pages.length > 0 && pages.every(p => p.html);
  const sizeConfig = SIZES.find(s => s.id === previewSize)!;

  // Ensure Header and Footer exist in-memory (fallback if wireframe didn't include them)
  useEffect(() => {
    const hasHeader = pages.some(p => p.title === 'Header');
    const hasFooter = pages.some(p => p.title === 'Footer');
    if (hasHeader && hasFooter) return;
    const toAdd: any[] = [];
    if (!hasHeader) toAdd.push({ id: `local-hdr-${Date.now()}`, title: 'Header', slug: 'header', sort_order: -2, prompt: 'Site header with logo, primary navigation, and CTA button. Mobile responsive with hamburger menu.', html: '' });
    if (!hasFooter) toAdd.push({ id: `local-ftr-${Date.now()}`, title: 'Footer', slug: 'footer', sort_order: -1, prompt: 'Site footer with company info, quick links, social media icons, and copyright.', html: '' });
    if (toAdd.length) onPagesChange([...toAdd, ...pages]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Style changes are kept in-memory only (no DB persistence)
  const saveStyle = useCallback((_config: any) => {}, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function updateStyle(path: string[], value: string) {
    const next = JSON.parse(JSON.stringify(styleConfig));
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] ??= {};
    obj[path[path.length - 1]] = value;
    onStyleChange(next);
    saveStyle(next);
  }

  async function generatePage(pageId: string, extraPrompt?: string) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    setGenerating(pageId);
    setStatus(null);

    const prompt = extraPrompt
      ? `${page.prompt}\n\nAdditional instructions: ${extraPrompt}`
      : page.prompt;

    try {
      const res = await fetchWithRetry('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, pageId, style: styleConfig,
          pageName: page.title, pagePrompt: prompt,
          allPageNames: pages.filter(p => !SPECIAL_PAGES.includes(p.title)).map(p => p.title),
          referenceHtml: referenceHtml || undefined,
        }),
      }, { retries: 0 });
      if (res.status === 401 && onAuthRequired) { onAuthRequired(); return; }
      const data = await res.json();
      if (!res.ok) { setStatus({ type: 'error', msg: data.error || 'Failed' }); return; }

      const updated = pages.map(p => p.id === pageId ? { ...p, html: data.html } : p);
      onPagesChange(updated);
      setStatus({ type: 'success', msg: `${page.title} generated!` });
    } catch (err: any) {
      const msg = err?.name === 'AbortError'
        ? 'Request timed out — the page is too complex. Try a shorter prompt.'
        : err?.message
        ? `Network error: ${err.message}`
        : 'Network error — check your connection and try again.';
      setStatus({ type: 'error', msg });
    } finally {
      setGenerating(null);
    }
  }

  async function generateAllPages() {
    setGeneratingAll(true);
    for (const page of pages) {
      if (!page.html) await generatePage(page.id);
    }
    setGeneratingAll(false);
  }

  async function handleAiEdit() {
    if ((!aiPrompt.trim() && !referenceHtml) || !selectedPage) return;
    setAiLoading(true);
    const prompt = aiPrompt.trim() || (referenceHtml ? 'Rebuild this page exactly using my style system' : '');
    await generatePage(selectedPage.id, prompt);
    setAiPrompt('');
    setReferenceHtml(''); // clear after use
    setAiLoading(false);
  }

  function addPage() {
    if (!newPageTitle.trim()) return;
    const slug = newPageTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const newPage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newPageTitle.trim(),
      slug,
      sort_order: pages.length,
      prompt: `${newPageTitle.trim()} page for the website`,
      html: '',
    };
    onPagesChange([...pages, newPage]);
    onSelectPage(newPage.id);
    setNewPageTitle('');
    setAddingPage(false);
  }

  function deletePage(id: string) {
    const page = pages.find(p => p.id === id);
    if (!page || SPECIAL_PAGES.includes(page.title)) return;
    if (!confirm(`Delete "${page.title}"?`)) return;
    const updated = pages.filter(p => p.id !== id);
    onPagesChange(updated);
    if (selectedPageId === id) onSelectPage(updated[0]?.id || '');
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  // Separate header/footer from content pages
  const headerPage = pages.find(p => p.title === 'Header');
  const footerPage = pages.find(p => p.title === 'Footer');
  const contentPages = pages.filter(p => !SPECIAL_PAGES.includes(p.title));

  return (
    <div className="flex h-full">
      {/* ═══ LEFT: Pages sidebar (toggleable) ═══ */}
      {showPages && (
        <div className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-auto">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Template Parts</h3>
            </div>
            {[headerPage, footerPage].filter(Boolean).map(page => (
              <button
                key={page!.id}
                onClick={() => onSelectPage(page!.id)}
                className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all text-left mb-0.5 ${
                  page!.id === selectedPageId ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <LayoutTemplate className="w-3 h-3 shrink-0" />
                <span className="flex-1 truncate">{page!.title}</span>
                {generating === page!.id && <Loader2 className="w-3 h-3 animate-spin text-purple-500" />}
                {page!.html && generating !== page!.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
              </button>
            ))}
          </div>

          <div className="p-3 flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Pages</h3>
              <button onClick={() => setAddingPage(true)} className="p-0.5 rounded text-gray-400 hover:text-indigo-600" title="Add page">
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-0.5">
              {contentPages.map(page => (
                <div key={page.id} className="group flex items-center">
                  <button
                    onClick={() => onSelectPage(page.id)}
                    className={`flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all text-left ${
                      page.id === selectedPageId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate">{page.title}</span>
                    {generating === page.id && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                    {page.html && generating !== page.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                  </button>
                  <button onClick={() => deletePage(page.id)} className="p-0.5 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all mr-1">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>

            {addingPage && (
              <div className="mt-2">
                <input
                  type="text" autoFocus value={newPageTitle}
                  onChange={e => setNewPageTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addPage(); if (e.key === 'Escape') setAddingPage(false); }}
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-indigo-500 outline-none"
                  placeholder="Page name..."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ CENTER: Top bar + Preview + AI Prompt ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
          {/* Left: sidebar toggles */}
          <button onClick={() => setShowPages(!showPages)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" title={showPages ? 'Hide pages' : 'Show pages'}>
            {showPages ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="w-px h-5 bg-gray-200" />

          {/* Page selector dropdown */}
          <select
            value={selectedPageId}
            onChange={e => onSelectPage(e.target.value)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-indigo-500 outline-none max-w-[160px]"
          >
            {pages.map(p => <option key={p.id} value={p.id}>{p.title}{p.html ? '' : ' (empty)'}</option>)}
          </select>

          {/* Generate buttons */}
          {selectedPage && (
            <button
              onClick={() => generatePage(selectedPage.id)}
              disabled={!!generating}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50"
            >
              {generating === selectedPage?.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {selectedPage?.html ? 'Regen' : 'Generate'}
            </button>
          )}
          <button
            onClick={generateAllPages}
            disabled={generatingAll || allGenerated}
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-40 px-2 py-1"
          >
            {generatingAll ? 'Generating...' : allGenerated ? '✓ All done' : 'Gen All'}
          </button>

          {status && (
            <span className={`text-[11px] ${status.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{status.msg}</span>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Responsive toggles */}
          <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
            {SIZES.map(s => (
              <button key={s.id} onClick={() => setPreviewSize(s.id)} className={`p-1 rounded text-xs transition-all ${previewSize === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                <s.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-gray-200" />

          {/* Right: styles toggle + export */}
          <button onClick={() => setShowStyles(!showStyles)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" title={showStyles ? 'Hide styles' : 'Show styles'}>
            {showStyles ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </button>

          <button
            onClick={onContinue}
            disabled={!allGenerated}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50"
          >
            Export <ArrowRight className="w-3 h-3" />
          </button>
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
            </div>
          )}
        </div>

        {/* AI Chat prompt — bottom bar */}
        <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
          {/* Reference HTML indicator */}
          {referenceHtml && (
            <div className="flex items-center gap-2 max-w-3xl mx-auto mb-2">
              <div className="flex-1 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
                <Upload className="w-3 h-3 shrink-0" />
                <span className="flex-1 truncate">Reference HTML loaded ({Math.round(referenceHtml.length / 1024)}KB) — next generation will rebuild from this</span>
                <button onClick={() => setReferenceHtml('')} className="p-0.5 rounded hover:bg-amber-100">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <input
              type="text"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiEdit(); } }}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder={referenceHtml
                ? 'Describe changes to the reference — or just hit enter to rebuild it with your styles...'
                : selectedPage
                ? `Edit "${selectedPage.title}" — e.g. "make the hero bigger", "add testimonials"...`
                : 'Select a page first...'}
              disabled={!selectedPage || aiLoading}
            />
            {/* File upload button */}
            <label className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors" title="Upload HTML reference file">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".html,.htm"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  setReferenceHtml(text);
                  if (!aiPrompt.trim()) setAiPrompt('Rebuild this page exactly using my style system');
                  e.target.value = ''; // reset so same file can be re-uploaded
                }}
              />
            </label>
            <button
              onClick={handleAiEdit}
              disabled={(!aiPrompt.trim() && !referenceHtml) || !selectedPage || aiLoading}
              className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Global Styles sidebar (toggleable) ═══ */}
      {showStyles && (
        <div className="w-64 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-auto">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-500" /> Global Styles
            </h3>
          </div>

          <div className="p-4 space-y-5 overflow-auto flex-1">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Site Name</label>
              <input type="text" value={styleConfig.siteName || ''} onChange={e => updateStyle(['siteName'], e.target.value)} className={inputClass} placeholder="Business Name" />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Heading Font</label>
              <select value={styleConfig.fonts?.heading || 'Playfair Display'} onChange={e => updateStyle(['fonts', 'heading'], e.target.value)} className={inputClass + ' text-xs'}>
                {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Body Font</label>
              <select value={styleConfig.fonts?.body || 'Source Sans 3'} onChange={e => updateStyle(['fonts', 'body'], e.target.value)} className={inputClass + ' text-xs'}>
                {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-2">Colors</label>
              <div className="space-y-2">
                {COLOR_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input type="color" value={styleConfig.colors?.[key] || '#000'} onChange={e => updateStyle(['colors', key], e.target.value)} className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-gray-500">{label}</span>
                      <input type="text" value={styleConfig.colors?.[key] || ''} onChange={e => updateStyle(['colors', key], e.target.value)}
                        className="w-full text-[10px] font-mono text-gray-600 border-0 border-b border-gray-100 focus:border-indigo-400 outline-none bg-transparent" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Radius</label>
                <input type="text" value={styleConfig.borderRadius || '4px'} onChange={e => updateStyle(['borderRadius'], e.target.value)} className={inputClass + ' text-xs'} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Max Width</label>
                <input type="text" value={styleConfig.maxWidth || '1200px'} onChange={e => updateStyle(['maxWidth'], e.target.value)} className={inputClass + ' text-xs'} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
