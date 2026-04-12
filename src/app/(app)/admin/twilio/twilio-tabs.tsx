'use client';

import { useState } from 'react';
import { Phone, ScrollText, BarChart3, ChevronDown, ChevronUp, Loader2, Trash2 } from 'lucide-react';

const TABS = [
  { id: 'numbers', label: 'Numbers', icon: Phone },
  { id: 'calls', label: 'Call Log', icon: ScrollText },
  { id: 'usage', label: 'Usage', icon: BarChart3 },
] as const;

type TabId = typeof TABS[number]['id'];

export function TwilioTabs({ children }: { children: Record<string, React.ReactNode> }) {
  const [active, setActive] = useState<TabId>('numbers');

  return (
    <div>
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              active === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>
      {children[active]}
    </div>
  );
}

/**
 * Expandable call transcript row — used in the Call Log tab.
 */
export function CallTranscript({ transcript }: { transcript: { speaker: string; text: string }[] }) {
  const [open, setOpen] = useState(false);

  if (!transcript || transcript.length === 0) {
    return <span className="text-xs text-gray-300">No transcript</span>;
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {transcript.length} messages
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 max-h-48 overflow-auto border-t border-gray-100 pt-2">
          {transcript.map((t, i) => (
            <div key={i} className={`flex ${t.speaker === 'ai' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${
                t.speaker === 'ai' ? 'bg-brand-50 text-brand-800' : 'bg-gray-100 text-gray-700'
              }`}>
                <span className="font-medium text-[10px] text-gray-400 block mb-0.5">
                  {t.speaker === 'ai' ? 'AI' : 'Caller'}
                </span>
                {t.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Release number button — used in the Numbers tab.
 */
export function ReleaseNumberButton({ siteId, phoneNumber }: { siteId: string; phoneNumber: string }) {
  const [releasing, setReleasing] = useState(false);

  async function handleRelease() {
    if (!confirm(`Release ${phoneNumber}? This permanently deletes the number from Twilio.`)) return;
    setReleasing(true);
    try {
      const res = await fetch('/api/admin/release-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to release number');
      }
    } catch (e: any) {
      alert(e.message);
    }
    setReleasing(false);
  }

  return (
    <button onClick={handleRelease} disabled={releasing}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50">
      {releasing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      Release
    </button>
  );
}
