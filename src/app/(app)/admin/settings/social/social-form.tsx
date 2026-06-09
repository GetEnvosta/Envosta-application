'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { SOCIAL_PLATFORMS, type SocialLinks } from '@/lib/social-platforms';

/**
 * Admin form to edit the brand's social-media URLs. Saves to
 * /api/admin/settings/social; the marketing footer renders whatever is set.
 */
export function SocialForm({ initial }: { initial: SocialLinks }) {
  const [links, setLinks] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const p of SOCIAL_PLATFORMS) o[p.key] = initial[p.key] ?? '';
    return o;
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  function update(key: string, val: string) {
    setLinks((prev) => ({ ...prev, [key]: val }));
    setStatus('idle');
  }

  async function save() {
    setStatus('saving');
    setError('');
    // Normalize: prepend https:// when the value omits a protocol.
    const normalized: Record<string, string> = {};
    for (const [k, v] of Object.entries(links)) {
      const t = v.trim();
      if (!t) continue;
      normalized[k] = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    }
    try {
      const res = await fetch('/api/admin/settings/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: normalized }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Save failed');
        setStatus('error');
        return;
      }
      // Reflect the cleaned/normalized values back into the inputs.
      const next: Record<string, string> = {};
      for (const p of SOCIAL_PLATFORMS) next[p.key] = data.links?.[p.key] ?? '';
      setLinks(next);
      setStatus('saved');
    } catch {
      setError('Network error');
      setStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      {SOCIAL_PLATFORMS.map((p) => (
        <div key={p.key}>
          <label htmlFor={`social-${p.key}`} className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" className="text-gray-400" aria-hidden="true">
              <path d={p.path} />
            </svg>
            {p.label}
          </label>
          <input
            id={`social-${p.key}`}
            type="url"
            inputMode="url"
            value={links[p.key]}
            onChange={(e) => update(p.key, e.target.value)}
            placeholder={p.placeholder}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
          />
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={status === 'saving'}
          className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60"
        >
          {status === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {status === 'saving' ? 'Saving…' : 'Save links'}
        </button>
        {status === 'saved' && (
          <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
            <Check className="w-4 h-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
