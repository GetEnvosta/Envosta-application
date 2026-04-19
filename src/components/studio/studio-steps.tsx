'use client';

import { Check, MessageSquare, Paintbrush, Download } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Brief', icon: MessageSquare },
  { id: 2, label: 'Design', icon: Paintbrush },
  { id: 3, label: 'Export', icon: Download },
];

export function StudioSteps({ currentStep, onStepClick }: { currentStep: number; onStepClick?: (step: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const isComplete = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isClickable = onStepClick && step.id <= currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isCurrent
                  ? 'bg-indigo-600 text-white'
                  : isComplete
                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer'
                  : 'bg-gray-50 text-gray-400 cursor-default'
              }`}
            >
              {isComplete ? (
                <Check className="w-3 h-3" />
              ) : (
                <step.icon className="w-3 h-3" />
              )}
              {step.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px mx-0.5 ${currentStep > step.id ? 'bg-indigo-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
