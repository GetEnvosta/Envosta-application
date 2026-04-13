'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { fetchWithRetry } from '@/lib/fetch-retry';

export function StepBrief({
  projectId,
  brief,
  briefOptions,
  selectedBrief,
  onBriefChange,
  onOptionsGenerated,
  onSelect,
  onAuthRequired,
}: {
  projectId: string;
  brief: string;
  briefOptions: any[];
  selectedBrief: number | null;
  onBriefChange: (brief: string) => void;
  onOptionsGenerated: (options: any[]) => void;
  onSelect: (index: number) => void;
  onAuthRequired?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!brief.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithRetry('/api/studio/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim() }),
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

  return (
    <div className="flex items-center justify-center min-h-full p-8">
      <div className="max-w-3xl w-full">
        {/* Prompt area */}
        {briefOptions.length === 0 && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">What kind of website?</h2>
            <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
              Describe the website you want to create in a few sentences. AI will expand your idea into 3 polished concepts.
            </p>

            <textarea
              value={brief}
              onChange={e => onBriefChange(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-5 py-4 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none min-h-[120px] mb-4"
              placeholder="A plumbing company in Calgary that needs a professional website to generate more leads. They specialize in emergency plumbing and bathroom renovations..."
            />

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
        )}

        {/* Options */}
        {briefOptions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1 text-center">Pick a direction</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">Choose the concept that best matches your vision. You can refine details in the next steps.</p>

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
