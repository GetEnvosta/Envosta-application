'use client';

import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, Globe, Search, Upload, FileCode, X } from 'lucide-react';
import { fetchWithRetry } from '@/lib/fetch-retry';

const INDUSTRIES = [
  'Restaurant / Food Service', 'Retail / E-commerce', 'Healthcare / Medical',
  'Real Estate', 'Professional Services', 'Construction / Trades',
  'Fitness / Wellness', 'Beauty / Salon', 'Automotive', 'Non-Profit',
  'Education', 'Technology', 'Creative / Agency', 'Legal', 'Finance', 'Other',
];

export function StepBrief({
  projectId,
  brief,
  briefOptions,
  selectedBrief,
  businessInfo,
  onBriefChange,
  onOptionsGenerated,
  onBusinessInfoChange,
  onSelect,
  onAuthRequired,
}: {
  projectId: string;
  brief: string;
  briefOptions: any[];
  selectedBrief: number | null;
  businessInfo: any;
  onBriefChange: (brief: string) => void;
  onOptionsGenerated: (options: any[]) => void;
  onBusinessInfoChange: (info: any) => void;
  onSelect: (index: number) => void;
  onAuthRequired?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [referenceHtml, setReferenceHtml] = useState('');
  const [htmlFileName, setHtmlFileName] = useState('');

  const form = businessInfo;

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      onBusinessInfoChange({ ...form, [key]: e.target.value });
  }

  async function handleScrape() {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setError('');
    try {
      const res = await fetchWithRetry('/api/studio/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scrapeUrl.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Could not scrape site');
        return;
      }
      const data = await res.json();
      // Merge scraped data into business info
      const merged = { ...form };
      if (data.businessName && !form.businessName) merged.businessName = data.businessName;
      if (data.industry && !form.industry) merged.industry = data.industry;
      if (data.tagline && !form.tagline) merged.tagline = data.tagline;
      if (data.phone && !form.phone) merged.phone = data.phone;
      if (data.email && !form.email) merged.email = data.email;
      if (data.address && !form.address) merged.address = data.address;
      if (data.description && !brief) onBriefChange(data.description);
      onBusinessInfoChange(merged);
      setDetailsOpen(true); // Show the details so user can review
    } catch {
      setError('Failed to scrape website');
    } finally {
      setScraping(false);
    }
  }

  async function handleGenerate() {
    if (!brief.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithRetry('/api/studio/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: brief.trim(),
          businessInfo: Object.values(form).some((v: any) => v) ? form : undefined,
          referenceHtml: referenceHtml || undefined,
        }),
      });
      if (res.status === 401 && onAuthRequired) { onAuthRequired(); return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Generation failed'); return; }
      onOptionsGenerated(data.options);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  return (
    <div className="flex items-start justify-center min-h-full p-8">
      <div className="max-w-3xl w-full">
        {/* Prompt + Details area */}
        {briefOptions.length === 0 && (
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

            {/* Scrape URL */}
            <div className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={scrapeUrl}
                    onChange={e => setScrapeUrl(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    placeholder="Paste an existing website URL to auto-fill details..."
                  />
                </div>
                <button
                  onClick={handleScrape}
                  disabled={scraping || !scrapeUrl.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                  {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  {scraping ? 'Scanning...' : 'Auto-fill'}
                </button>
              </div>
            </div>

            {/* Main prompt */}
            <textarea
              value={brief}
              onChange={e => onBriefChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-5 py-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none min-h-[120px] mb-4"
              placeholder="A plumbing company in Calgary that needs a professional website to generate more leads. They specialize in emergency plumbing and bathroom renovations..."
            />

            {/* HTML reference upload */}
            <div className="mb-4">
              {!htmlFileName ? (
                <label className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-gray-300 hover:border-indigo-400 cursor-pointer transition-colors bg-gray-50/50 hover:bg-indigo-50/30">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-600">Upload an HTML reference</span>
                    <span className="text-xs text-gray-400 block">Optional — helps AI match a specific layout or style</span>
                  </div>
                  <input
                    type="file"
                    accept=".html,.htm"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setHtmlFileName(file.name);
                      const reader = new FileReader();
                      reader.onload = () => setReferenceHtml(reader.result as string);
                      reader.readAsText(file);
                    }}
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-indigo-200 bg-indigo-50/50">
                  <FileCode className="w-4 h-4 text-indigo-600" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-indigo-700 truncate block">{htmlFileName}</span>
                    <span className="text-xs text-indigo-500">{(referenceHtml.length / 1024).toFixed(1)} KB loaded</span>
                  </div>
                  <button
                    onClick={() => { setReferenceHtml(''); setHtmlFileName(''); }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
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

            {/* Generate button */}
            <div className="text-center">
              <button
                onClick={handleGenerate}
                disabled={loading || brief.trim().length < 10}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating concepts...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate 3 Concepts</>
                )}
              </button>
              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            </div>
          </div>
        )}

        {/* Concept options */}
        {briefOptions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1 text-center">Pick a direction</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">Choose the concept that best matches your vision.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {briefOptions.map((opt: any, i: number) => (
                <button
                  key={i}
                  onClick={() => onSelect(i)}
                  className="text-left rounded-xl border-2 border-gray-200 hover:border-indigo-400 p-5 transition-all hover:shadow-md group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700">{opt.title}</h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{opt.description}</p>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => { onOptionsGenerated([]); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Start over with a different prompt
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
