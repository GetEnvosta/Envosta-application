'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Globe, Upload, FileCode, X, Plus, FileArchive } from 'lucide-react';
import { fetchWithRetry } from '@/lib/fetch-retry';

const INDUSTRIES = [
  'Restaurant / Food Service', 'Retail / E-commerce', 'Healthcare / Medical',
  'Real Estate', 'Professional Services', 'Construction / Trades',
  'Fitness / Wellness', 'Beauty / Salon', 'Automotive', 'Non-Profit',
  'Education', 'Technology', 'Creative / Agency', 'Legal', 'Finance', 'Other',
];

const SUGGESTED_PAGES = ['Home', 'About', 'Services', 'Contact', 'Blog', 'Gallery', 'Testimonials', 'FAQ', 'Pricing', 'Portfolio', 'Team', 'Careers'];

// Default WooCommerce pages created by WooCommerce core on install,
// plus the Single Product template for the product-detail layout.
const WOOCOMMERCE_PAGES = ['Shop', 'Single Product', 'Cart', 'Checkout', 'My Account'];

// Blog pages: a Blog archive + a Single Post template.
const BLOG_PAGES = ['Blog', 'Single Post'];

// System pages: WordPress-wide templates every site should have.
const SYSTEM_PAGES = ['404', 'Search Results'];

export function StepBrief({
  projectId,
  brief,
  briefOptions,
  selectedBrief,
  businessInfo,
  referenceHtml,
  referenceHtmlName,
  onBriefChange,
  onOptionsGenerated,
  onBusinessInfoChange,
  onReferenceHtmlChange,
  onImportPreviousWebsite,
  importing: externalImporting,
  importError,
  importedSummary,
  onContinueToDesign,
  onDismissImportSummary,
  onSelect,
  onAuthRequired,
}: {
  projectId: string;
  brief: string;
  briefOptions: any[];
  selectedBrief: number | null;
  businessInfo: any;
  referenceHtml?: string;
  referenceHtmlName?: string;
  onBriefChange: (brief: string) => void;
  onOptionsGenerated: (options: any[]) => void;
  onBusinessInfoChange: (info: any) => void;
  onReferenceHtmlChange?: (html: string, name: string) => void;
  onImportPreviousWebsite?: (file: File) => void | Promise<void>;
  importing?: boolean;
  importError?: string;
  importedSummary?: { projectName: string; pageCount: number } | null;
  onContinueToDesign?: () => void;
  onDismissImportSummary?: () => void;
  onSelect: (index: number) => void;
  onAuthRequired?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [customPage, setCustomPage] = useState('');

  // Use lifted state if a callback was provided, otherwise fall back to local
  const [localHtml, setLocalHtml] = useState('');
  const [localName, setLocalName] = useState('');
  const refHtml = referenceHtml ?? localHtml;
  const refName = referenceHtmlName ?? localName;
  const setRefHtml = (html: string, name: string) => {
    if (onReferenceHtmlChange) onReferenceHtmlChange(html, name);
    else { setLocalHtml(html); setLocalName(name); }
  };
  const [pickedIdx, setPickedIdx] = useState(0);

  // Reset picker when the options list changes (regenerate or clear)
  useEffect(() => { setPickedIdx(0); }, [briefOptions.length]);

  const form = businessInfo;
  const pages: string[] = Array.isArray(form.pages) ? form.pages : ['Home', 'About', 'Services', 'Contact'];

  function togglePage(name: string) {
    const next = pages.includes(name) ? pages.filter(p => p !== name) : [...pages, name];
    onBusinessInfoChange({ ...form, pages: next });
  }

  function addCustomPage() {
    const name = customPage.trim();
    if (!name) return;
    if (pages.some(p => p.toLowerCase() === name.toLowerCase())) { setCustomPage(''); return; }
    onBusinessInfoChange({ ...form, pages: [...pages, name] });
    setCustomPage('');
  }

  function removePage(name: string) {
    onBusinessInfoChange({ ...form, pages: pages.filter(p => p !== name) });
  }

  // WC + blog flags are still carried on businessInfo for back-compat (older
  // saved drafts may have them set). They're not exposed on the UI anymore —
  // users add WC / blog pages from the design tool's sidebar categories.
  const wooEnabled = !!form.woocommerce;

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onBusinessInfoChange({ ...form, [key]: e.target.value });
  }

  /**
   * Detect URLs the user may have dropped in the brief text itself so we
   * can auto-scrape them alongside the URL field. Matches bare www. or
   * http(s):// forms.
   */
  function findUrlsInText(text: string): string[] {
    const matches = text.match(/\b(?:https?:\/\/|www\.)[^\s,;)]+/gi) || [];
    return Array.from(new Set(matches));
  }

  async function runScrape(url: string): Promise<void> {
    const res = await fetchWithRetry('/api/studio/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, existingInfo: form, brief }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (!data || typeof data !== 'object') return;
    // Field-level "locked" = any field the user already has a value for.
    // Scrape respects that — only fills blanks.
    const merged = { ...form };
    const fields = ['businessName', 'industry', 'tagline', 'phone', 'email', 'address'] as const;
    for (const k of fields) {
      if (data[k] && !merged[k]) merged[k] = data[k];
    }
    // If the user hasn't written any brief yet, seed it with the scraped
    // description so the concepts generator has something to chew on.
    if (data.description && !brief.trim()) onBriefChange(data.description);
    onBusinessInfoChange(merged);
  }

  async function runSuggestMeta(): Promise<void> {
    if (!brief.trim()) return;
    try {
      const res = await fetch('/api/studio/suggest-site-meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, businessInfo: form }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const s = data?.suggested;
      if (!s || typeof s !== 'object') return;
      const merged = { ...form };
      for (const k of Object.keys(s)) {
        if (!merged[k]) merged[k] = s[k];
      }
      onBusinessInfoChange(merged);
    } catch {}
  }

  /**
   * "Generate brief rewrites + auto-fill" — the one big button on the brief.
   *
   * Runs three things in parallel:
   *   1. /api/studio/brief — returns 3 alternative brief rewrites the user
   *      can click to replace their text with. Not a final answer.
   *   2. /api/studio/suggest-site-meta — fills in any blank
   *      businessName / tagline / industry / targetAudience.
   *   3. /api/studio/scrape — if the user gave a URL in the URL field OR
   *      mentioned one in the brief text, scrape it. Fills only blank
   *      business-info fields.
   *
   * All three respect the "field has a value = locked" rule — existing
   * values are never overwritten.
   */
  async function handleGenerate() {
    if (!brief.trim() && !scrapeUrl.trim()) {
      setError('Add a brief or a URL to start');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Kick off all three in parallel. If any one fails, the others still land.
      const briefPromise = brief.trim() ? fetchWithRetry('/api/studio/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: brief.trim(),
          businessInfo: Object.values(form).some((v: any) => v) ? form : undefined,
          pages,
          woocommerce: wooEnabled,
          referenceHtml: refHtml || undefined,
        }),
      }).then(async (res) => {
        if (res.status === 401 && onAuthRequired) { onAuthRequired(); return null; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Generation failed');
        return data.options;
      }) : Promise.resolve(null);

      const urls = [scrapeUrl.trim(), ...findUrlsInText(brief)].filter(Boolean);
      const scrapePromises = urls.slice(0, 2).map(u => runScrape(u).catch(() => {}));
      const metaPromise = runSuggestMeta().catch(() => {});

      const [options] = await Promise.all([briefPromise, ...scrapePromises, metaPromise]);
      if (options) onOptionsGenerated(options);
      setDetailsOpen(true); // surface the auto-filled fields
    } catch (e: any) {
      setError(e?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  /** Click a concept rewrite → replace the brief text with it. No advancement. */
  function applyConceptAsBrief(idx: number) {
    const opt = briefOptions[idx];
    if (!opt) return;
    // Compose: title + description — the description is the substantial part.
    const nextBrief = opt.description || opt.title || '';
    if (nextBrief) onBriefChange(nextBrief);
    onOptionsGenerated([]); // clear concepts after picking one
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  const pickedOption = briefOptions[pickedIdx];

  return (
    <div className="flex items-start justify-center min-h-full p-8">
      <div className="max-w-3xl w-full">
        {/* Prompt + Details area — always visible */}
        <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">What kind of website?</h2>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Describe the website you want to create. Add business details below for better results, or paste a URL to auto-fill.
              </p>
            </div>

            {/* Unified upload — accepts .html/.htm (design reference) or
                .zip/.xml (previous Envosta export → skip to design). */}
            {!importedSummary && (refName ? (
              <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg border border-indigo-200 bg-indigo-50/50">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-indigo-700 truncate block">{refName}</span>
                  <span className="text-xs text-indigo-500">
                    {(refHtml.length / 1024).toFixed(1)} KB loaded — design reference + style source. You can continue to design now or keep refining the brief.
                  </span>
                </div>
                {onContinueToDesign && (
                  <button
                    onClick={onContinueToDesign}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                  >
                    Continue →
                  </button>
                )}
                <button
                  onClick={() => setRefHtml('', '')}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove reference"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                externalImporting
                  ? 'border-indigo-300 bg-indigo-50/40 cursor-wait'
                  : 'border-gray-300 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/30'
              }`}>
                {externalImporting ? <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" /> : <Upload className="w-5 h-5 text-gray-400" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {externalImporting ? 'Importing…' : 'Upload a file to start (optional)'}
                  </p>
                  <p className="text-[11px] text-gray-500 leading-snug mt-0.5">
                    <strong>.html / .htm</strong> — use as a design reference, extract colors + fonts as global styles.{' '}
                    <strong>.zip / .xml</strong> — import a previous Envosta export (pages + styles) and skip straight to design.
                  </p>
                </div>
                <input
                  type="file"
                  accept=".html,.htm,.zip,.xml"
                  className="hidden"
                  disabled={externalImporting}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    const name = file.name.toLowerCase();
                    if (name.endsWith('.zip') || name.endsWith('.xml')) {
                      if (onImportPreviousWebsite) await onImportPreviousWebsite(file);
                    } else {
                      // Treat as design reference — read text + stash.
                      const reader = new FileReader();
                      reader.onload = () => setRefHtml(reader.result as string, file.name);
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            ))}
            {importError && <p className="text-xs text-red-600 -mt-2 mb-4">{importError}</p>}

            {/* Post-import success banner — appears after .zip/.xml import. */}
            {importedSummary && (
              <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileArchive className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-900">
                      Imported "{importedSummary.projectName}"
                      <span className="text-emerald-700 font-normal"> — {importedSummary.pageCount} page{importedSummary.pageCount === 1 ? '' : 's'} + styles loaded.</span>
                    </p>
                    <p className="text-xs text-emerald-700 mt-0.5 leading-snug">
                      Continue to design now, or keep tweaking the brief first.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      {onContinueToDesign && (
                        <button
                          onClick={onContinueToDesign}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                        >
                          Continue to design →
                        </button>
                      )}
                      {onDismissImportSummary && (
                        <button
                          onClick={onDismissImportSummary}
                          className="text-[11px] text-emerald-700 hover:text-emerald-900"
                        >
                          Keep editing the brief
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Optional URL — scraped when you hit "Improve brief". */}
            <div className="mb-4">
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={scrapeUrl}
                  onChange={e => setScrapeUrl(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Business website URL (optional) — scraped for details when you improve the brief"
                />
              </div>
            </div>

            {/* Main prompt */}
            <textarea
              value={brief}
              onChange={e => onBriefChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-5 py-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none min-h-[120px] mb-4"
              placeholder="A plumbing company in Calgary that needs a professional website to generate more leads. They specialize in emergency plumbing and bathroom renovations..."
            />

            {/* WooCommerce + Blog toggles are intentionally NOT here.
                The Envosta parent theme ships WC + blog templates baked in
                and activates them automatically when the plugins are
                installed / the page types exist. Shop / Cart / Checkout /
                My Account / Single Product / Blog / Single Post can all be
                added from the design tool's sidebar categories on demand. */}

            {/* Pages wanted */}
            <div className="rounded-xl border border-gray-200 overflow-hidden mb-4">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700">Pages wanted <span className="text-xs text-gray-400 font-normal">— {pages.length} selected</span></p>
              </div>
              <div className="px-5 py-4">
                {pages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {pages.map(name => (
                      <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium">
                        {name}
                        <button onClick={() => removePage(name)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {SUGGESTED_PAGES.filter(s => !pages.includes(s)).map(name => (
                    <button
                      key={name}
                      onClick={() => togglePage(name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-xs font-medium border border-gray-200 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> {name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPage}
                    onChange={e => setCustomPage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomPage(); } }}
                    className={inputClass}
                    placeholder="Add custom page (e.g. Case Studies)"
                  />
                  <button
                    onClick={addCustomPage}
                    disabled={!customPage.trim()}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
            </div>

            {/* Collapsible business details */}
            <div className="rounded-xl border border-gray-200 overflow-hidden mb-6">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span>Business Details {Object.values(form).filter((v: any) => v).length > 0 && (
                  <span className="ml-2 text-xs text-indigo-600">({Object.values(form).filter((v: any) => v).length} filled)</span>
                )}</span>
                {detailsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {detailsOpen && (
                <div className="px-5 py-4 space-y-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Business Name</label>
                      <input type="text" value={form.businessName || ''} onChange={set('businessName')} className={inputClass} placeholder="Acme Plumbing" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Industry</label>
                      <select value={form.industry || ''} onChange={set('industry')} className={inputClass}>
                        <option value="">Select...</option>
                        {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tagline / Slogan</label>
                    <input type="text" value={form.tagline || ''} onChange={set('tagline')} className={inputClass} placeholder="Calgary's most trusted plumber since 2005" />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input type="tel" value={form.phone || ''} onChange={set('phone')} className={inputClass} placeholder="(403) 555-1234" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <input type="email" value={form.email || ''} onChange={set('email')} className={inputClass} placeholder="info@acme.com" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                      <input type="text" value={form.address || ''} onChange={set('address')} className={inputClass} placeholder="123 Main St, Calgary" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Target Audience</label>
                    <input type="text" value={form.targetAudience || ''} onChange={set('targetAudience')} className={inputClass} placeholder="Homeowners in Calgary who need reliable plumbing services" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Brand Primary Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.primaryColor || '#1E1E1E'} onChange={set('primaryColor')} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                        <input type="text" value={form.primaryColor || ''} onChange={set('primaryColor')} className={inputClass} placeholder="#1E1E1E" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Accent / Dark Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.accentColor || '#000000'} onChange={set('accentColor')} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                        <input type="text" value={form.accentColor || ''} onChange={set('accentColor')} className={inputClass} placeholder="#000000" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reference Sites</label>
                    <input type="text" value={form.referenceSites || ''} onChange={set('referenceSites')} className={inputClass} placeholder="https://example.com, https://competitor.com" />
                  </div>
                </div>
              )}
            </div>

            {/* Improve brief + auto-fill — runs concepts + suggest-site-meta
                + URL scrape in parallel. Concepts are rewrite suggestions
                you can click to replace your brief text; they're NOT the
                final gate to move on. */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={loading || (!brief.trim() && !scrapeUrl.trim())}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                  title="Ask the AI for 3 brief rewrites, fill in any blank business details, and (if a URL is set) scrape it for more info"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Working…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> {briefOptions.length > 0 ? 'Improve again' : 'Improve brief + auto-fill'}</>
                  )}
                </button>
                <button
                  onClick={onContinueToDesign}
                  disabled={!onContinueToDesign || (!brief.trim() && !refHtml)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-40"
                  title="Continue to the design editor — you can always come back and tweak the brief"
                >
                  Continue to design →
                </button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            {/* Concept rewrites — click one to REPLACE the brief text.
                Doesn't advance; the Continue button above does that. */}
            {briefOptions.length > 0 && (
              <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-indigo-900">Pick one to replace your brief (or ignore)</p>
                  <button
                    onClick={() => onOptionsGenerated([])}
                    className="text-[10px] text-indigo-700 hover:text-indigo-900"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="grid gap-2">
                  {briefOptions.map((opt: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => applyConceptAsBrief(i)}
                      className="text-left rounded-lg border border-indigo-200 bg-white hover:border-indigo-500 hover:shadow-sm p-3 transition-all"
                    >
                      <p className="text-xs font-semibold text-indigo-900 mb-1">{opt.title}</p>
                      <p className="text-[11px] text-gray-600 leading-snug">{opt.description}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-indigo-700/80 mt-3 leading-snug">
                  These are suggested rewrites of your brief, not final designs. Clicking one just replaces the text above — you can keep editing freely. Happy with the brief? Hit <strong>Continue to design</strong>.
                </p>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}
