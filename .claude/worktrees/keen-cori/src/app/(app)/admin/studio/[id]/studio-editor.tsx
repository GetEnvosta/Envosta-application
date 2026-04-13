'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-browser';
import { StudioSteps } from '@/components/studio/studio-steps';
import { StepBrief } from '@/components/studio/step-brief';
import { StepBusiness } from '@/components/studio/step-business';
import { StepWireframe } from '@/components/studio/step-wireframe';
import { StepDesign } from '@/components/studio/step-design';
import { StepExport } from '@/components/studio/step-export';

export function StudioEditor({ project, initialPages }: { project: any; initialPages: any[] }) {
  const [step, setStep] = useState<number>(project.step || 1);
  const [brief, setBrief] = useState(project.brief || '');
  const [briefOptions, setBriefOptions] = useState<any[]>(project.brief_options || []);
  const [selectedBrief, setSelectedBrief] = useState<number | null>(project.selected_brief ?? null);
  const [businessInfo, setBusinessInfo] = useState(project.business_info || {});
  const [wireframe, setWireframe] = useState<any[]>(project.wireframe || []);
  const [wireframeApproved, setWireframeApproved] = useState(project.wireframe_approved || false);
  const [styleConfig, setStyleConfig] = useState(project.style_config || {});
  const [pages, setPages] = useState(initialPages);
  const [selectedPageId, setSelectedPageId] = useState(initialPages[0]?.id || '');

  // Persist step + field to DB
  const saveProject = useCallback(async (fields: Record<string, any>) => {
    const supabase = createClient();
    await supabase.from('studio_projects').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', project.id);
  }, [project.id]);

  function goToStep(newStep: number) {
    setStep(newStep);
    saveProject({ step: newStep });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-gray-200 bg-white shrink-0">
        <Link href="/admin/studio" className="p-1.5 -ml-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Back to projects">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h1>
        <div className="ml-auto">
          <StudioSteps currentStep={step} onStepClick={goToStep} />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        {step === 1 && (
          <StepBrief
            projectId={project.id}
            brief={brief}
            briefOptions={briefOptions}
            selectedBrief={selectedBrief}
            onBriefChange={(b) => { setBrief(b); saveProject({ brief: b }); }}
            onOptionsGenerated={(opts) => { setBriefOptions(opts); saveProject({ brief_options: opts }); }}
            onSelect={(idx) => {
              setSelectedBrief(idx);
              saveProject({ selected_brief: idx });
              goToStep(2);
            }}
          />
        )}
        {step === 2 && (
          <StepBusiness
            businessInfo={businessInfo}
            selectedBriefText={briefOptions[selectedBrief ?? 0]?.description || brief}
            onSave={(info) => {
              setBusinessInfo(info);
              saveProject({ business_info: info });
              goToStep(3);
            }}
            onSkip={() => goToStep(3)}
          />
        )}
        {step === 3 && (
          <StepWireframe
            projectId={project.id}
            wireframe={wireframe}
            brief={briefOptions[selectedBrief ?? 0]?.description || brief}
            businessInfo={businessInfo}
            onWireframeChange={(wf) => { setWireframe(wf); saveProject({ wireframe: wf }); }}
            onApprove={async (wf) => {
              setWireframe(wf);
              setWireframeApproved(true);
              saveProject({ wireframe: wf, wireframe_approved: true });

              // Create studio_pages from wireframe
              const supabase = createClient();
              for (let i = 0; i < wf.length; i++) {
                const page = wf[i];
                const { data } = await supabase.from('studio_pages').insert({
                  project_id: project.id,
                  title: page.name,
                  slug: page.slug,
                  prompt: page.description + (page.sections ? '\n\nSections: ' + page.sections.join(', ') : ''),
                  sort_order: i,
                }).select('*').single();
                if (data) setPages(prev => [...prev, data]);
              }
              if (wf.length > 0) {
                // Select first page
                const supabase2 = createClient();
                const { data: allPages } = await supabase2.from('studio_pages').select('*').eq('project_id', project.id).order('sort_order');
                if (allPages) {
                  setPages(allPages);
                  setSelectedPageId(allPages[0]?.id || '');
                }
              }
              goToStep(4);
            }}
          />
        )}
        {step === 4 && (
          <StepDesign
            projectId={project.id}
            styleConfig={styleConfig}
            pages={pages}
            selectedPageId={selectedPageId}
            businessInfo={businessInfo}
            onStyleChange={(config) => { setStyleConfig(config); saveProject({ style_config: config }); }}
            onPagesChange={setPages}
            onSelectPage={setSelectedPageId}
            onContinue={() => goToStep(5)}
          />
        )}
        {step === 5 && (
          <StepExport
            projectId={project.id}
            project={project}
            styleConfig={styleConfig}
            pages={pages}
          />
        )}
      </div>
    </div>
  );
}
