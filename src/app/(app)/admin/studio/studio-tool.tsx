'use client';

import { useState, useCallback } from 'react';
import { StudioSteps } from '@/components/studio/studio-steps';
import { StepBrief } from '@/components/studio/step-brief';
import { StepDesign } from '@/components/studio/step-design';
import { StepExport } from '@/components/studio/step-export';
import { Paintbrush, RotateCcw } from 'lucide-react';

let idCounter = 0;
function localId() { return `local-${++idCounter}-${Date.now()}`; }

export function StudioTool() {
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState('');
  const [briefOptions, setBriefOptions] = useState<any[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<number | null>(null);
  const [businessInfo, setBusinessInfo] = useState<any>({ pages: ['Home', 'About', 'Services', 'Contact'] });
  const [styleConfig, setStyleConfig] = useState<any>({});
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [projectName, setProjectName] = useState('');

  function reset() {
    if (!confirm('Start over? All unsaved work will be lost.')) return;
    setStep(1);
    setBrief('');
    setBriefOptions([]);
    setSelectedBrief(null);
    setBusinessInfo({ pages: ['Home', 'About', 'Services', 'Contact'] });
    setStyleConfig({});
    setPages([]);
    setSelectedPageId('');
    setProjectName('');
    idCounter = 0;
  }

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
                : ['Home', 'About', 'Services', 'Contact'];
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
