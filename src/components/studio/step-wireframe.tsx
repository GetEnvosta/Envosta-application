'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Trash2, Plus, Check, MessageSquare } from 'lucide-react';

export function StepWireframe({
  projectId,
  wireframe,
  brief,
  businessInfo,
  onWireframeChange,
  onApprove,
}: {
  projectId: string;
  wireframe: any[];
  brief: string;
  businessInfo: any;
  onWireframeChange: (wf: any[]) => void;
  onApprove: (wf: any[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modifications, setModifications] = useState('');

  // Auto-generate on first load if no wireframe
  useEffect(() => {
    if (wireframe.length === 0 && !loading) {
      handleGenerate();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate(mods?: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/studio/wireframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, businessInfo, modifications: mods }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      onWireframeChange(data.wireframe);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  function removePage(index: number) {
    const updated = wireframe.filter((_, i) => i !== index);
    onWireframeChange(updated);
  }

  function addPage() {
    onWireframeChange([...wireframe, {
      name: 'New Page',
      slug: 'new-page',
      description: '',
      sections: [],
    }]);
  }

  function updatePage(index: number, field: string, value: any) {
    const updated = wireframe.map((p, i) => i === index ? { ...p, [field]: value } : p);
    onWireframeChange(updated);
  }

  if (loading && wireframe.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-full p-8">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Generating sitemap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center min-h-full p-8">
      <div className="max-w-3xl w-full">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Sitemap & Wireframe</h2>
        <p className="text-sm text-gray-500 mb-6">Review the suggested pages. Add, remove, or modify using the prompt below.</p>

        {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4 text-sm text-red-700">{error}</div>}

        {/* Page list */}
        <div className="space-y-3 mb-6">
          {wireframe.map((page, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 group">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={page.name}
                    onChange={e => updatePage(i, 'name', e.target.value)}
                    className="text-sm font-semibold text-gray-900 border-0 border-b border-transparent focus:border-gray-200 outline-none w-full bg-transparent"
                  />
                  <textarea
                    value={page.description}
                    onChange={e => updatePage(i, 'description', e.target.value)}
                    className="text-xs text-gray-600 border-0 outline-none w-full bg-transparent resize-none mt-1 leading-relaxed"
                    rows={2}
                    placeholder="Page description..."
                  />
                  {page.sections && page.sections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {page.sections.map((s: string, j: number) => (
                        <span key={j} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-medium text-gray-600">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removePage(i)}
                  className="p-1 rounded text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={addPage} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 mb-6">
          <Plus className="w-3.5 h-3.5" /> Add a page
        </button>

        {/* Modification prompt */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            <label className="text-xs font-medium text-gray-600">Request changes</label>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={modifications}
              onChange={e => setModifications(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && modifications.trim()) { handleGenerate(modifications); setModifications(''); } }}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
              placeholder="Add a blog page, remove FAQ, combine services and portfolio..."
            />
            <button
              onClick={() => { if (modifications.trim()) { handleGenerate(modifications); setModifications(''); } }}
              disabled={loading || !modifications.trim()}
              className="px-3 py-2 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Regenerate'}
            </button>
          </div>
        </div>

        {/* Approve */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => onApprove(wireframe)}
            disabled={wireframe.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Approve Wireframe & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
