'use client';

import { useState } from 'react';
import { StudioSteps } from '@/components/studio/studio-steps';
import { StepBrief } from '@/components/studio/step-brief';
import { StepBusiness } from '@/components/studio/step-business';
import { StepWireframe } from '@/components/studio/step-wireframe';
import { StepDesign } from '@/components/studio/step-design';
import { StepExport } from '@/components/studio/step-export';
import { Paintbrush, RotateCcw, ArrowLeft, Sparkles, X } from 'lucide-react';
import Link from 'next/link';

let idCounter = 0;
function localId() { return `local-${++idCounter}-${Date.now()}`; }

export default function GeneratorPage() {
  const [step, setStep] = useState(1);
  const [brief, setBrief] = useState('');
  const [briefOptions, setBriefOptions] = useState<any[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<number | null>(null);
  const [businessInfo, setBusinessInfo] = useState<any>({});
  const [wireframe, setWireframe] = useState<any[]>([]);
  const [styleConfig, setStyleConfig] = useState<any>({});
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [showSignupGate, setShowSignupGate] = useState(false);

  function reset() {
    if (!confirm('Start over? All unsaved work will be lost.')) return;
    setStep(1);
    setBrief('');
    setBriefOptions([]);
    setSelectedBrief(null);
    setBusinessInfo({});
    setWireframe([]);
    setStyleConfig({});
    setPages([]);
    setSelectedPageId('');
    setProjectName('');
    idCounter = 0;
  }

  return (
    <div className="generator-shell">
      <style>{`
        .generator-shell {
          min-height: calc(100vh - 72px);
          display: flex;
          flex-direction: column;
          background: #fafafa;
        }
        .gen-topbar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: #fff;
          position: sticky;
          top: 72px;
          z-index: 30;
        }
        .gen-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: .78rem;
          color: #6b7280;
          text-decoration: none;
          transition: color .2s;
        }
        .gen-back:hover { color: #111827; }
        .gen-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .gen-title svg { color: #7c3aed; }
        .gen-title h1 {
          font-size: .88rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        .gen-reset {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          font-size: .7rem;
          color: #6b7280;
          background: none;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all .2s;
        }
        .gen-reset:hover { color: #374151; background: #f3f4f6; }
        .gen-steps { margin-left: auto; }
        .gen-content {
          flex: 1;
          overflow: auto;
        }
        @media (max-width: 768px) {
          .gen-topbar { flex-wrap: wrap; gap: 10px; padding: 10px 16px; }
          .gen-steps { margin-left: 0; width: 100%; overflow-x: auto; }
        }

        /* ── Signup Gate Overlay ── */
        .signup-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .signup-card {
          background: #fff;
          border-radius: 20px;
          padding: 48px 40px;
          max-width: 440px;
          width: 90%;
          text-align: center;
          position: relative;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.15);
          animation: slideUp .3s ease;
        }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        .signup-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          transition: all .2s;
        }
        .signup-close:hover { color: #374151; background: #f3f4f6; }
        .signup-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, #eef2ff, #e0e7ff);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .signup-icon svg { color: #4f46e5; }
        .signup-card h2 {
          font-size: 1.4rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 8px;
          letter-spacing: -0.5px;
        }
        .signup-card p {
          font-size: .9rem;
          color: #6b7280;
          line-height: 1.6;
          margin: 0 0 28px;
          font-weight: 300;
        }
        .signup-btn {
          display: block;
          width: 100%;
          padding: 14px 24px;
          font-size: .92rem;
          font-weight: 600;
          color: #fff;
          background: #4f46e5;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          text-decoration: none;
          text-align: center;
          transition: background .2s;
        }
        .signup-btn:hover { background: #4338ca; }
        .signup-login {
          display: block;
          margin-top: 16px;
          font-size: .82rem;
          color: #6b7280;
        }
        .signup-login a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 500;
        }
        .signup-login a:hover { text-decoration: underline; }
        .signup-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 0 0 28px;
          text-align: left;
        }
        .signup-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: .82rem;
          color: #374151;
        }
        .signup-feature-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4f46e5;
          flex-shrink: 0;
        }
      `}</style>

      {/* Signup Gate Overlay */}
      {showSignupGate && (
        <div className="signup-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSignupGate(false); }}>
          <div className="signup-card">
            <button className="signup-close" onClick={() => setShowSignupGate(false)}>
              <X style={{ width: 18, height: 18 }} />
            </button>
            <div className="signup-icon">
              <Sparkles style={{ width: 28, height: 28 }} />
            </div>
            <h2>Create a free account</h2>
            <p>Sign up to generate your AI-powered WordPress theme and download the child theme + XML import file.</p>
            <div className="signup-features">
              <div className="signup-feature"><div className="signup-feature-dot" /> AI-generated website concepts</div>
              <div className="signup-feature"><div className="signup-feature-dot" /> Custom wireframe and page design</div>
              <div className="signup-feature"><div className="signup-feature-dot" /> Download child theme + WXR import</div>
              <div className="signup-feature"><div className="signup-feature-dot" /> Free to get started</div>
            </div>
            <a href="/get-started" className="signup-btn">Sign Up Free</a>
            <div className="signup-login">
              Already have an account? <a href="/auth/login?redirect=/studio/generator">Log in</a>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="gen-topbar">
        <Link href="/studio" className="gen-back">
          <ArrowLeft style={{ width: 14, height: 14 }} /> Studio
        </Link>
        <div className="gen-title">
          <Paintbrush style={{ width: 16, height: 16 }} />
          <h1>Theme Generator</h1>
        </div>
        {step > 1 && (
          <button onClick={reset} className="gen-reset">
            <RotateCcw style={{ width: 12, height: 12 }} /> Start Over
          </button>
        )}
        <div className="gen-steps">
          <StudioSteps currentStep={step} onStepClick={(s) => { if (s <= step) setStep(s); }} />
        </div>
      </div>

      {/* Step content */}
      <div className="gen-content">
        {step === 1 && (
          <StepBrief
            projectId=""
            brief={brief}
            briefOptions={briefOptions}
            selectedBrief={selectedBrief}
            onBriefChange={setBrief}
            onOptionsGenerated={setBriefOptions}
            onSelect={(idx) => {
              setSelectedBrief(idx);
              setStep(2);
            }}
            onAuthRequired={() => setShowSignupGate(true)}
          />
        )}
        {step === 2 && (
          <StepBusiness
            businessInfo={businessInfo}
            selectedBriefText={briefOptions[selectedBrief ?? 0]?.description || brief}
            onSave={(info) => {
              setBusinessInfo(info);
              if (info.siteName) setProjectName(info.siteName);
              setStep(3);
            }}
            onSkip={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepWireframe
            projectId=""
            wireframe={wireframe}
            brief={briefOptions[selectedBrief ?? 0]?.description || brief}
            businessInfo={businessInfo}
            onWireframeChange={setWireframe}
            onApprove={(wf) => {
              setWireframe(wf);
              const newPages = wf.map((page: any, i: number) => ({
                id: localId(),
                title: page.name,
                slug: page.slug,
                prompt: page.description + (page.sections ? '\n\nSections: ' + page.sections.join(', ') : ''),
                sort_order: i,
                html: '',
              }));
              setPages(newPages);
              if (newPages.length > 0) setSelectedPageId(newPages[0].id);
              setStep(4);
            }}
            onAuthRequired={() => setShowSignupGate(true)}
          />
        )}
        {step === 4 && (
          <StepDesign
            projectId=""
            styleConfig={styleConfig}
            pages={pages}
            selectedPageId={selectedPageId}
            businessInfo={businessInfo}
            onStyleChange={setStyleConfig}
            onPagesChange={setPages}
            onSelectPage={setSelectedPageId}
            onContinue={() => setStep(5)}
            onAuthRequired={() => setShowSignupGate(true)}
          />
        )}
        {step === 5 && (
          <StepExport
            projectId=""
            project={{ name: projectName || 'Theme', slug: (projectName || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-') }}
            styleConfig={styleConfig}
            pages={pages}
            onAuthRequired={() => setShowSignupGate(true)}
          />
        )}
      </div>
    </div>
  );
}
