'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ChevronRight, Loader2 } from 'lucide-react';

const STAGES = [
  { key: 'inquiry', label: 'Inquiry', desc: 'New lead received' },
  { key: 'qualifying', label: 'Qualifying', desc: 'Evaluating fit and needs' },
  { key: 'discovery', label: 'Discovery Call', desc: 'Initial call scheduled or completed' },
  { key: 'proposal', label: 'Proposal Sent', desc: 'Quote or plan recommendation sent' },
  { key: 'negotiation', label: 'Negotiation', desc: 'Finalizing terms and pricing' },
  { key: 'onboarding', label: 'Onboarding', desc: 'Account setup and site provisioning' },
  { key: 'setup_complete', label: 'Setup Complete', desc: 'Site live and configured' },
  { key: 'active', label: 'Active Customer', desc: 'Handed off — customer is live' },
] as const;

type Stage = typeof STAGES[number]['key'];

export function OnboardingProgressBar({ currentStage }: { currentStage: string }) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);

  return (
    <div className="card p-5 mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Onboarding Pipeline</h3>
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {STAGES.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;

          return (
            <div key={stage.key} className="flex items-center" style={{ minWidth: 0 }}>
              <div className="flex flex-col items-center" style={{ minWidth: 72 }}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400 ring-offset-2'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span
                  className={`text-[10px] mt-1.5 text-center leading-tight font-medium ${
                    isCurrent ? 'text-emerald-700' : isDone ? 'text-emerald-500' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 mt-[-12px] ${
                    isDone ? 'bg-emerald-400' : 'bg-gray-200'
                  }`}
                  style={{ minWidth: 16 }}
                />
              )}
            </div>
          );
        })}
      </div>
      {currentIdx >= 0 && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          <span className="font-medium text-emerald-600">{STAGES[currentIdx].label}</span>
          {' — '}{STAGES[currentIdx].desc}
        </p>
      )}
    </div>
  );
}

export function OnboardingStageAdvancer({
  ticketId,
  currentStage,
}: {
  ticketId: string;
  currentStage: string;
}) {
  const [advancing, setAdvancing] = useState(false);
  const [stage, setStage] = useState(currentStage);
  const [selectStage, setSelectStage] = useState('');

  const currentIdx = STAGES.findIndex(s => s.key === stage);
  const nextStage = currentIdx < STAGES.length - 1 ? STAGES[currentIdx + 1] : null;
  const isCompleted = stage === 'active';

  async function advanceTo(targetStage: string) {
    setAdvancing(true);
    const supabase = createClient();
    const targetLabel = STAGES.find(s => s.key === targetStage)?.label ?? targetStage;

    const { data: ticket } = await supabase
      .from('tickets')
      .select('metadata, status')
      .eq('id', ticketId)
      .single();

    const metadata = { ...(ticket?.metadata as any ?? {}), onboarding_stage: targetStage };

    let newStatus = ticket?.status;
    if (targetStage === 'inquiry' || targetStage === 'qualifying') newStatus = 'open';
    else if (['discovery', 'proposal', 'negotiation', 'onboarding', 'setup_complete'].includes(targetStage)) newStatus = 'in-progress';
    else if (targetStage === 'active') newStatus = 'closed';

    await supabase.from('tickets').update({ metadata, status: newStatus }).eq('id', ticketId);

    const stageMessages: Record<string, string> = {
      qualifying: 'We\'re reviewing your inquiry and will be in touch shortly.',
      discovery: 'A discovery call has been scheduled to learn more about your needs.',
      proposal: 'We\'ve sent over a proposal with our recommended plan and pricing.',
      negotiation: 'We\'re working through the final details with you.',
      onboarding: 'Welcome aboard! We\'re setting up your account and provisioning your site.',
      setup_complete: 'Your site is live and fully configured. Here\'s everything you need to get started.',
      active: 'You\'re all set! Your account is active and you\'re officially an Envosta customer.',
    };

    const message = stageMessages[targetStage];
    if (message) {
      await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender: 'admin',
        message: `**Stage: ${targetLabel}** — ${message}`,
      });
    }

    setStage(targetStage);
    setSelectStage('');
    setAdvancing(false);
  }

  return (
    <div className="card p-5 mb-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Advance Stage</h3>

      {isCompleted ? (
        <p className="text-sm text-emerald-600 font-medium">Customer is active</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          {nextStage && (
            <button
              onClick={() => advanceTo(nextStage.key)}
              disabled={advancing}
              className="btn-admin text-sm inline-flex items-center gap-1.5"
            >
              {advancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              Advance to {nextStage.label}
            </button>
          )}

          <div className="flex items-center gap-2">
            <select
              className="input text-sm py-2"
              value={selectStage}
              onChange={e => setSelectStage(e.target.value)}
            >
              <option value="">Jump to stage...</option>
              {STAGES.map(s => (
                <option key={s.key} value={s.key} disabled={s.key === stage}>
                  {s.label}
                </option>
              ))}
            </select>
            {selectStage && (
              <button
                onClick={() => advanceTo(selectStage)}
                disabled={advancing}
                className="btn-admin-secondary text-sm"
              >
                Go
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
