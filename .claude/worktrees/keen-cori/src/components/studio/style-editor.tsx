'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Check } from 'lucide-react';
import { useState } from 'react';

const FONT_OPTIONS = [
  'Playfair Display', 'DM Serif Display', 'Fraunces', 'Libre Baskerville',
  'Cormorant Garamond', 'Lora', 'Merriweather', 'Source Serif 4',
  'Space Grotesk', 'Plus Jakarta Sans', 'Source Sans 3', 'Libre Franklin',
  'Work Sans', 'Outfit', 'Manrope', 'Inter', 'Sora', 'DM Sans', 'Albert Sans', 'Figtree',
];

const COLOR_FIELDS = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Surface' },
  { key: 'text', label: 'Text' },
  { key: 'textMuted', label: 'Text Muted' },
  { key: 'border', label: 'Border' },
];

export function StyleEditor({
  projectId,
  styleConfig,
  onStyleChange,
}: {
  projectId: string;
  styleConfig: any;
  onStyleChange: (config: any) => void;
}) {
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback((config: any) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase.from('studio_projects').update({
        style_config: config,
        updated_at: new Date().toISOString(),
      }).eq('id', projectId);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, 500);
  }, [projectId]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function update(path: string[], value: string) {
    const next = JSON.parse(JSON.stringify(styleConfig));
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] ??= {};
    obj[path[path.length - 1]] = value;
    onStyleChange(next);
    save(next);
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Save indicator */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm border border-emerald-200">
          <Check className="w-3 h-3" /> Saved
        </div>
      )}

      {/* Site Name */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Site Name</h3>
        <input
          type="text"
          value={styleConfig.siteName || ''}
          onChange={e => update(['siteName'], e.target.value)}
          className={inputClass}
          placeholder="Calgary Plumbing Co"
        />
      </div>

      {/* Fonts */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Fonts</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Heading Font</label>
            <select
              value={styleConfig.fonts?.heading || 'Playfair Display'}
              onChange={e => update(['fonts', 'heading'], e.target.value)}
              className={inputClass}
            >
              {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Body Font</label>
            <select
              value={styleConfig.fonts?.body || 'Source Sans 3'}
              onChange={e => update(['fonts', 'body'], e.target.value)}
              className={inputClass}
            >
              {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Colors */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Color Palette</h3>
        <div className="grid grid-cols-2 gap-3">
          {COLOR_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={styleConfig.colors?.[key] || '#000000'}
                onChange={e => update(['colors', key], e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500">{label}</label>
                <input
                  type="text"
                  value={styleConfig.colors?.[key] || ''}
                  onChange={e => update(['colors', key], e.target.value)}
                  className="w-full text-xs font-mono text-gray-700 border-0 border-b border-gray-200 focus:border-indigo-500 outline-none py-0.5 bg-transparent"
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Layout</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Border Radius</label>
            <input
              type="text"
              value={styleConfig.borderRadius || '4px'}
              onChange={e => update(['borderRadius'], e.target.value)}
              className={inputClass}
              placeholder="4px"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max Width</label>
            <input
              type="text"
              value={styleConfig.maxWidth || '1200px'}
              onChange={e => update(['maxWidth'], e.target.value)}
              className={inputClass}
              placeholder="1200px"
            />
          </div>
        </div>
      </div>

      {/* Style Preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview</h3>
        <div
          className="rounded-xl border border-gray-200 p-6"
          style={{ backgroundColor: styleConfig.colors?.background || '#0f0f1a' }}
        >
          <div className="flex gap-2 flex-wrap mb-4">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-md border border-white/10"
                  style={{ backgroundColor: styleConfig.colors?.[key] || '#000' }}
                />
                <span className="text-[10px]" style={{ color: styleConfig.colors?.textMuted || '#8a8a9a' }}>{label}</span>
              </div>
            ))}
          </div>
          <h2 style={{
            fontFamily: `'${styleConfig.fonts?.heading || 'Playfair Display'}', serif`,
            color: styleConfig.colors?.text || '#e8e8e8',
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '8px',
          }}>
            {styleConfig.siteName || 'Site Name'}
          </h2>
          <p style={{
            fontFamily: `'${styleConfig.fonts?.body || 'Source Sans 3'}', sans-serif`,
            color: styleConfig.colors?.textMuted || '#8a8a9a',
            fontSize: '0.9rem',
            lineHeight: 1.6,
          }}>
            This is how your body text will look with the selected font and colors.
          </p>
          <button style={{
            marginTop: '12px',
            background: styleConfig.colors?.accent || '#e94560',
            color: '#fff',
            border: 'none',
            padding: '10px 24px',
            borderRadius: styleConfig.borderRadius || '4px',
            fontFamily: `'${styleConfig.fonts?.body || 'Source Sans 3'}', sans-serif`,
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'default',
          }}>
            Sample Button
          </button>
        </div>
      </div>
    </div>
  );
}
