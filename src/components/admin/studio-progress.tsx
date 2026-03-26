'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { ChevronRight, Loader2 } from 'lucide-react';

const STAGES = [
  { key: 'submitted', label: 'Submitted', desc: 'Request received' },
  { key: 'reviewing', label: 'Reviewing', desc: 'Team is reviewing scope' },
  { key: 'quoted', label: 'Quoted', desc: 'Quote sent to customer' },
  { key: 'approved', label: 'Approved', desc: 'Customer approved quote' },
  { key: 'in_progress', label: 'In Progress', desc: 'Design & development' },
  { key: 'review', label: 'Client Review', desc: 'Awaiting customer feedback' },
  { key: 'revisions', label: 'Revisions', desc: 'Applying changes' },
  { key: 'completed', label: 'Completed', desc: 'Delivered & live' },
] as const;

type Stage = typeof STAGES[number]['key'];

/** Visual progress bar — used by both admin and customer views */
export function StudioProgressBar({ currentStage }: { currentStage: string }) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);

  return (
    <div className="card p-5 mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Studio Progress</h3>
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {STAGES.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isFuture = i > currentIdx;

          return (
            <div key={stage.key} className="flex items-center" style={{ minWidth: 0 }}>
              <div className="flex flex-col items-center" style={{ minWidth: 72 }}>
                {/* Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    isDone
                      ? 'bg-purple-600 text-white'
                      : isCurrent
                      ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-400 ring-offset-2'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                {/* Label */}
                <span
                  className={`text-[10px] mt-1.5 text-center leading-tight font-medium ${
                    isCurrent ? 'text-purple-700' : isDone ? 'text-purple-500' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {/* Connector line */}
              {i < STAGES.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-1 mt-[-12px] ${
                    isDone ? 'bg-purple-400' : 'bg-gray-200'
                  }`}
                  style={{ minWidth: 16 }}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Current stage description */}
      {currentIdx >= 0 && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          <span className="font-medium text-purple-600">{STAGES[currentIdx].label}</span>
          {' — '}{STAGES[currentIdx].desc}
        </p>
      )}
    </div>
  );
}

/** Admin-only: button to advance to next stage */
export function StudioStageAdvancer({
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
  const isCompleted = stage === 'completed';

  async function advanceTo(targetStage: string) {
    setAdvancing(true);
    const supabase = createClient();
    const targetLabel = STAGES.find(s => s.key === targetStage)?.label ?? targetStage;

    // Update ticket metadata with new stage
    const { data: ticket } = await supabase
      .from('tickets')
      .select('metadata, status')
      .eq('id', ticketId)
      .single();

    const metadata = { ...(ticket?.metadata as any ?? {}), studio_stage: targetStage };

    // Update ticket status to match stage
    let newStatus = ticket?.status;
    if (targetStage === 'quoted') newStatus = 'quoted';
    else if (targetStage === 'approved') newStatus = 'approved';
    else if (targetStage === 'in_progress' || targetStage === 'revisions') newStatus = 'in-progress';
    else if (targetStage === 'review') newStatus = 'in-progress';
    else if (targetStage === 'completed') newStatus = 'completed';

    await supabase.from('tickets').update({ metadata, status: newStatus }).eq('id', ticketId);

    // Auto-post a message about the stage change
    const stageMessages: Record<string, string> = {
      reviewing: 'We\'re reviewing your request and will have a quote ready soon.',
      quoted: 'We\'ve prepared a quote for this work. Please review and let us know if you\'d like to proceed.',
      approved: 'Quote approved! We\'re getting started on your project.',
      in_progress: 'Design and development is now underway. We\'ll share progress with you soon.',
      review: 'Your project is ready for review! Please take a look and let us know if you\'d like any changes.',
      revisions: 'We\'re working on the revisions you requested.',
      completed: 'Your project is complete and live! Thank you for choosing Envosta Studio.',
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
        <p className="text-sm text-green-600 font-medium">Project completed</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Quick advance to next stage */}
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

          {/* Jump to any stage */}
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
