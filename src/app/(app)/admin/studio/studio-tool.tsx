'use client';

import { useState, useEffect, useRef } from 'react';
import { StudioSteps } from '@/components/studio/studio-steps';
import { StepBrief } from '@/components/studio/step-brief';
import { StepDesign } from '@/components/studio/step-design';
import { StepExport } from '@/components/studio/step-export';
import { Paintbrush, RotateCcw, Check, Loader2, Upload } from 'lucide-react';
import { importStudioZip, importStudioXml } from '@/lib/studio-import';

let idCounter = 0;
function localId() { return `local-${++idCounter}-${Date.now()}`; }

const STORAGE_KEY = 'envosta.studio.draft.v1';
const DEFAULT_PAGES = ['Home', 'About', 'Services', 'Contact'];

type Snapshot = {
  step: number;
  brief: string;
  briefOptions: any[];
  selectedBrief: number | null;
  businessInfo: any;
  styleConfig: any;
  pages: any[];
  selectedPageId: string;
  projectName: string;
  savedAt: number;
};

export function StudioTool() {
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState('');
  const [briefOptions, setBriefOptions] = useState<any[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<number | null>(null);
  const [businessInfo, setBusinessInfo] = useState<any>({ pages: DEFAULT_PAGES });
  const [styleConfig, setStyleConfig] = useState<any>({});
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [projectName, setProjectName] = useState('');

  // Persistence state
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportError('');
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith('.zip')) {
        const result = await importStudioZip(file);
        setBrief(prev => prev || `Imported from ${result.projectName}`);
        setProjectName(result.projectName);
        setBusinessInfo((prev: any) => ({
          ...prev,
          businessName: prev.businessName || result.projectName,
          pages: result.pages.length > 0 ? result.pages.map(p => p.title) : (prev.pages || DEFAULT_PAGES),
        }));
        setStyleConfig(result.styleConfig);
        if (result.pages.length > 0) {
          setPages(result.pages);
          setSelectedPageId(result.pages[0].id);
        }
        setStep(2); // jump to design
      } else if (name.endsWith('.xml')) {
        const importedPages = await importStudioXml(file);
        if (importedPages.length === 0) throw new Error('No pages found in XML');
        setPages(importedPages);
        setSelectedPageId(importedPages[0].id);
        setStep(2);
      } else {
        throw new Error('Please upload a .zip or .xml file');
      }
    } catch (err: any) {
      setImportError(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  // Load saved draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s: Snapshot = JSON.parse(raw);
        if (s && typeof s === 'object') {
          setStep(s.step ?? 1);
          setBrief(s.brief ?? '');
          setBriefOptions(s.briefOptions ?? []);
          setSelectedBrief(s.selectedBrief ?? null);
          setBusinessInfo(s.businessInfo ?? { pages: DEFAULT_PAGES });
          setStyleConfig(s.styleConfig ?? {});
          setPages(s.pages ?? []);
          setSelectedPageId(s.selectedPageId ?? '');
          setProjectName(s.projectName ?? '');
          setSavedAt(s.savedAt ?? null);
        }
      }
    } catch (err) {
      console.error('Failed to load studio draft:', err);
    }
    setHydrated(true);
  }, []);

  // Auto-save (debounced) on any state change after hydration
  useEffect(() => {
    if (!hydrated) return;
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const snap: Snapshot = {
          step, brief, briefOptions, selectedBrief, businessInfo,
          styleConfig, pages, selectedPageId, projectName,
          savedAt: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
        setSavedAt(snap.savedAt);
      } catch (err) {
        console.error('Failed to save studio draft:', err);
      } finally {
        setSaving(false);
      }
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [hydrated, step, brief, briefOptions, selectedBrief, businessInfo, styleConfig, pages, selectedPageId, projectName]);

  function reset() {
    if (!confirm('Start over? This will erase your saved draft.')) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setStep(1);
    setBrief('');
    setBriefOptions([]);
    setSelectedBrief(null);
    setBusinessInfo({ pages: DEFAULT_PAGES });
    setStyleConfig({});
    setPages([]);
    setSelectedPageId('');
    setProjectName('');
    setSavedAt(null);
    idCounter = 0;
  }

  const savedLabel = (() => {
    if (saving) return 'Saving…';
    if (!savedAt) return null;
    const diff = Date.now() - savedAt;
    if (diff < 5000) return 'Saved';
    if (diff < 60_000) return `Saved ${Math.floor(diff / 1000)}s ago`;
    if (diff < 3_600_000) return `Saved ${Math.floor(diff / 60_000)}m ago`;
    return `Saved ${new Date(savedAt).toLocaleTimeString()}`;
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-purple-600" />
          <h1 className="text-sm font-semibold text-gray-900">Studio</h1>
        </div>
        {step > 1 && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Start Over
          </button>
        )}
        <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer" title="Import an exported theme .zip or WordPress .xml">
          {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {importing ? 'Importing…' : 'Import'}
          <input
            type="file"
            accept=".zip,.xml"
            className="hidden"
            disabled={importing}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) handleImportFile(file);
            }}
          />
        </label>
        {importError && <span className="text-[11px] text-red-600">{importError}</span>}
        {savedLabel && (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-500" />}
            {savedLabel}
          </span>
        )}
        <div className="ml-auto">
          <StudioSteps currentStep={step} onStepClick={(s) => { if (s <= step) setStep(s); }} />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        {step === 1 && (
          <StepBrief
            projectId=""
            brief={brief}
            briefOptions={briefOptions}
            selectedBrief={selectedBrief}
            businessInfo={businessInfo}
            onBriefChange={setBrief}
            onOptionsGenerated={setBriefOptions}
            onBusinessInfoChange={setBusinessInfo}
            onSelect={(idx) => {
              setSelectedBrief(idx);
              if (businessInfo.businessName) setProjectName(businessInfo.businessName);
              const pageNames: string[] = (businessInfo.pages && businessInfo.pages.length > 0)
                ? businessInfo.pages
                : DEFAULT_PAGES;
              const selectedConcept = briefOptions[idx]?.description || brief;
              const newPages = pageNames.map((name: string, i: number) => ({
                id: localId(),
                title: name,
                slug: name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `page-${i + 1}`,
                prompt: `${name} page for this website. Concept: ${selectedConcept}`,
                sort_order: i,
                html: '',
              }));
              setPages(newPages);
              if (newPages.length > 0) setSelectedPageId(newPages[0].id);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <StepDesign
            projectId=""
            brief={briefOptions[selectedBrief ?? 0]?.description || brief}
            styleConfig={styleConfig}
            pages={pages}
            selectedPageId={selectedPageId}
            businessInfo={businessInfo}
            onStyleChange={setStyleConfig}
            onPagesChange={setPages}
            onSelectPage={setSelectedPageId}
            onContinue={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepExport
            projectId=""
            project={{ name: projectName || 'Theme', slug: (projectName || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-') }}
            styleConfig={styleConfig}
            pages={pages}
          />
        )}
      </div>
    </div>
  );
}
