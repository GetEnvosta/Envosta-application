'use client';

import { useState } from 'react';

const FONT_OPTIONS = [
  'Playfair Display', 'DM Serif Display', 'Fraunces', 'Libre Baskerville',
  'Cormorant Garamond', 'Lora', 'Merriweather', 'Source Serif 4',
  'Space Grotesk', 'Plus Jakarta Sans', 'Source Sans 3', 'Libre Franklin',
  'Work Sans', 'Outfit', 'Manrope', 'Inter', 'Sora', 'DM Sans', 'Albert Sans', 'Figtree',
];

// Maps to Assembler's theme-1 through theme-5 color tokens
const COLOR_FIELDS = [
  { key: 'background', label: 'Background (theme-1)', desc: 'Page background, light text on dark' },
  { key: 'surface', label: 'Soft BG (theme-2)', desc: 'Alternate sections, subtle dividers' },
  { key: 'border', label: 'Muted (theme-3)', desc: 'Borders, secondary text' },
  { key: 'primary', label: 'Primary (theme-4)', desc: 'Headings, buttons, brand color' },
  { key: 'accent', label: 'Dark (theme-5)', desc: 'Footer, deepest contrast' },
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
  function update(path: string[], value: string) {
    const next = JSON.parse(JSON.stringify(styleConfig));
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] ??= {};
    obj[path[path.length - 1]] = value;
    onStyleChange(next);
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  return (
    <div className="space-y-8 max-w-2xl">
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

      {/* Colors — Assembler 5-token system */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Color Palette</h3>
        <p className="text-xs text-gray-400 mb-3">Maps to Assembler&apos;s theme-1 through theme-5 tokens</p>
        <div className="space-y-3">
          {COLOR_FIELDS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="color"
                value={styleConfig.colors?.[key] || '#000000'}
                onChange={e => update(['colors', key], e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-700">{label}</label>
                <p className="text-[10px] text-gray-400">{desc}</p>
              </div>
              <input
                type="text"
                value={styleConfig.colors?.[key] || ''}
                onChange={e => update(['colors', key], e.target.value)}
                className="w-24 text-xs font-mono text-gray-700 border border-gray-200 rounded-md px-2 py-1.5 focus:border-indigo-500 outline-none"
                placeholder="#000000"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Layout */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Layout</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Button Radius</label>
            <select
              value={styleConfig.borderRadius || '0'}
              onChange={e => update(['borderRadius'], e.target.value)}
              className={inputClass}
            >
              <option value="0">Square (Assembler default)</option>
              <option value="4px">Slightly rounded</option>
              <option value="8px">Rounded</option>
              <option value="9999px">Pill</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Content Width</label>
            <input
              type="text"
              value={styleConfig.maxWidth || '620px'}
              onChange={e => update(['maxWidth'], e.target.value)}
              className={inputClass}
              placeholder="620px"
            />
          </div>
        </div>
      </div>

      {/* Style Preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Preview</h3>
        <div
          className="rounded-xl border border-gray-200 overflow-hidden"
        >
          {/* Header bar */}
          <div className="px-6 py-3 flex items-center justify-between"
            style={{ backgroundColor: styleConfig.colors?.background || '#FFFFFF' }}>
            <span style={{
              fontFamily: `'${styleConfig.fonts?.heading || 'Playfair Display'}', serif`,
              color: styleConfig.colors?.primary || '#1E1E1E',
              fontSize: '1rem',
              fontWeight: 600,
            }}>
              {styleConfig.siteName || 'Site Name'}
            </span>
            <div className="flex gap-3">
              {['Home', 'About', 'Contact'].map(l => (
                <span key={l} style={{
                  fontFamily: `'${styleConfig.fonts?.body || 'Source Sans 3'}', sans-serif`,
                  color: styleConfig.colors?.border || '#BBBBBB',
                  fontSize: '0.75rem',
                }}>{l}</span>
              ))}
            </div>
          </div>

          {/* Hero section */}
          <div className="px-6 py-8"
            style={{ backgroundColor: styleConfig.colors?.background || '#FFFFFF' }}>
            <h2 style={{
              fontFamily: `'${styleConfig.fonts?.heading || 'Playfair Display'}', serif`,
              color: styleConfig.colors?.primary || '#1E1E1E',
              fontSize: '1.5rem',
              fontWeight: 500,
              marginBottom: '8px',
              lineHeight: 1,
            }}>
              Premium Heading Style
            </h2>
            <p style={{
              fontFamily: `'${styleConfig.fonts?.body || 'Source Sans 3'}', sans-serif`,
              color: styleConfig.colors?.border || '#BBBBBB',
              fontSize: '0.85rem',
              lineHeight: 1.65,
            }}>
              This is how your body text will look with the selected font and colors.
            </p>
            <button style={{
              marginTop: '12px',
              background: styleConfig.colors?.primary || '#1E1E1E',
              color: styleConfig.colors?.background || '#FFFFFF',
              border: 'none',
              padding: '16px 24px',
              borderRadius: styleConfig.borderRadius || '0',
              fontFamily: `'${styleConfig.fonts?.heading || 'Playfair Display'}', serif`,
              fontSize: '0.85rem',
              fontWeight: 450,
              cursor: 'default',
            }}>
              Sample Button
            </button>
          </div>

          {/* Soft section */}
          <div className="px-6 py-6"
            style={{ backgroundColor: styleConfig.colors?.surface || '#EEEEEE' }}>
            <p style={{
              fontFamily: `'${styleConfig.fonts?.body || 'Source Sans 3'}', sans-serif`,
              color: styleConfig.colors?.primary || '#1E1E1E',
              fontSize: '0.8rem',
              textAlign: 'center',
            }}>
              Alternate section with soft background
            </p>
          </div>

          {/* Dark footer */}
          <div className="px-6 py-4"
            style={{ backgroundColor: styleConfig.colors?.accent || '#000000' }}>
            <p style={{
              fontFamily: `'${styleConfig.fonts?.body || 'Source Sans 3'}', sans-serif`,
              color: styleConfig.colors?.background || '#FFFFFF',
              fontSize: '0.7rem',
              textAlign: 'center',
              opacity: 0.7,
            }}>
              Footer area — darkest color (theme-5)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
