'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles, Loader2, Check, FileText, Palette, ArrowRight, Send,
  Monitor, Tablet, Smartphone, Eye, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, Plus, Trash2, LayoutTemplate,
  Upload, X, Globe2, Download, ShoppingBag, Newspaper, Wrench, RotateCcw,
} from 'lucide-react';
import { fetchWithRetry } from '@/lib/fetch-retry';
import { ASSEMBLER_VARIATIONS, type StudioStylePreset } from '@/lib/studio-style-presets';
import { extractStylesFromHtml } from '@/lib/extract-styles-from-html';
import { stripHtmlForPage } from '@/lib/studio-html-strip';
import { downloadPageAsXml } from '@/lib/studio-wxr';
import { replaceSectionBlock, ensureAnchorOnFirstBlock } from '@/lib/studio-block-splice';
import { WOOCOMMERCE_TEMPLATES, BLOG_TEMPLATES, SYSTEM_TEMPLATES, getTemplateByTitle } from '@/lib/studio-page-templates';

const FONT_OPTIONS = [
  'Playfair Display', 'DM Serif Display', 'Fraunces', 'Libre Baskerville',
  'Cormorant Garamond', 'Lora', 'Merriweather', 'Source Serif 4',
  'Space Grotesk', 'Plus Jakarta Sans', 'Source Sans 3', 'Libre Franklin',
  'Work Sans', 'Outfit', 'Manrope', 'Inter', 'Sora', 'DM Sans', 'Albert Sans', 'Figtree',
];

const COLOR_FIELDS = [
  { key: 'primary', label: 'Primary' }, { key: 'secondary', label: 'Secondary' },
  { key: 'accent', label: 'Accent' }, { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Surface' }, { key: 'text', label: 'Text' },
  { key: 'textMuted', label: 'Text Muted' }, { key: 'border', label: 'Border' },
];

const SIZES = [
  { id: 'desktop', width: '100%', icon: Monitor },
  { id: 'tablet', width: '768px', icon: Tablet },
  { id: 'mobile', width: '375px', icon: Smartphone },
] as const;

// Special page types
const SPECIAL_PAGES = ['Header', 'Footer'];

// Pages that belong to the WooCommerce category in the sidebar when
// WooCommerce is enabled on the brief.
const WOOCOMMERCE_PAGE_TITLES = new Set(['Shop', 'Single Product', 'Cart', 'Checkout', 'My Account']);
const BLOG_PAGE_TITLES = new Set(['Blog', 'Single Post']);
const SYSTEM_PAGE_TITLES = new Set(['404', 'Search Results']);

/**
 * Return just the <body> inner HTML of a document string, or the original
 * string if it isn't a full HTML doc. Used when compositing the header +
 * content + footer for preview so we don't duplicate <html>/<head>.
 */
function extractBody(html: string): string {
  if (!html) return '';
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return m ? m[1] : html;
}

/**
 * Return the <head> inner HTML (minus <title>) of a document, so we can
 * preserve per-page <style> blocks and fonts in the preview composite.
 */
function extractHead(html: string): string {
  if (!html) return '';
  const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (!m) return '';
  return m[1].replace(/<title>[\s\S]*?<\/title>/i, '');
}

/**
 * Build a <style> block that injects the studio's current global styleConfig
 * as CSS custom properties, plus a Google Fonts import for the chosen heading
 * and body fonts. Generated pages reference these variables, so changing
 * global styles updates every preview live.
 */
function buildStyleOverride(style: any): string {
  const colors = style?.colors || {};
  const fonts = style?.fonts || {};
  const heading = fonts.heading || 'Inter';
  const body = fonts.body || 'Inter';
  const fontsQuery = [heading, body].filter(Boolean)
    .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@300;400;500;600;700`)
    .join('&');

  // Assembler preset mapping (same as the export buildChildThemeJson)
  const theme1 = colors.background || '#FFFFFF';
  const theme2 = colors.surface || '#EEEEEE';
  const theme3 = colors.border || colors.textMuted || '#BBBBBB';
  const theme4 = colors.primary || colors.text || '#1E1E1E';
  const theme5 = colors.accent || '#000000';
  const radius = style?.borderRadius || '0';
  const maxW = style?.maxWidth || '620px';

  return `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontsQuery}&display=swap" />
<base target="_self" />
<style id="envosta-live-styles">
:root {
  --wp--preset--color--theme-1: ${theme1};
  --wp--preset--color--theme-2: ${theme2};
  --wp--preset--color--theme-3: ${theme3};
  --wp--preset--color--theme-4: ${theme4};
  --wp--preset--color--theme-5: ${theme5};
  --wp--preset--font-family--heading: '${heading}', serif;
  --wp--preset--font-family--body: '${body}', sans-serif;
  --envosta-radius: ${radius};
  --envosta-max-width: ${maxW};
}
html, body { margin: 0; background: var(--wp--preset--color--theme-1); color: var(--wp--preset--color--theme-4); font-family: var(--wp--preset--font-family--body); line-height: 1.6; }
*, *::before, *::after { box-sizing: border-box; }
img { max-width: 100%; height: auto; display: block; }
h1, h2, h3, h4, h5, h6 { font-family: var(--wp--preset--font-family--heading); color: var(--wp--preset--color--theme-4); font-weight: 500; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 0.5em; }
h1 { font-size: clamp(44px, 7vw, 80px); }
h2 { font-size: clamp(32px, 5vw, 60px); }
h3 { font-size: clamp(22px, 3vw, 38px); }
p { margin: 0 0 1em; }

/* Auto-generated WP block classes (has-{slug}-background-color, etc.) */
.has-theme-1-background-color { background-color: var(--wp--preset--color--theme-1) !important; }
.has-theme-2-background-color { background-color: var(--wp--preset--color--theme-2) !important; }
.has-theme-3-background-color { background-color: var(--wp--preset--color--theme-3) !important; }
.has-theme-4-background-color { background-color: var(--wp--preset--color--theme-4) !important; }
.has-theme-5-background-color { background-color: var(--wp--preset--color--theme-5) !important; }
.has-theme-1-color { color: var(--wp--preset--color--theme-1) !important; }
.has-theme-2-color { color: var(--wp--preset--color--theme-2) !important; }
.has-theme-3-color { color: var(--wp--preset--color--theme-3) !important; }
.has-theme-4-color { color: var(--wp--preset--color--theme-4) !important; }
.has-theme-5-color { color: var(--wp--preset--color--theme-5) !important; }
.has-heading-font-family { font-family: var(--wp--preset--font-family--heading) !important; }
.has-body-font-family { font-family: var(--wp--preset--font-family--body) !important; }
.has-small-font-size { font-size: 16px; }
.has-medium-font-size { font-size: clamp(20px, 2vw, 24px); }
.has-large-font-size { font-size: 38px; }
.has-x-large-font-size { font-size: 60px; }
.has-xx-large-font-size { font-size: clamp(40px, 6vw, 80px); }
.has-xxx-large-font-size { font-size: clamp(40px, 8vw, 160px); line-height: 0.95; }

/* Core block layout helpers — mimic how WordPress renders blocks. */
.wp-block-group.is-layout-constrained { max-width: 1440px; margin-left: auto; margin-right: auto; padding-left: 24px; padding-right: 24px; }
.wp-block-group > .wp-block-group { max-width: none; }
.alignfull,
.wp-block-group.alignfull {
  width: 100vw;
  max-width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}
.alignfull.is-layout-constrained,
.wp-block-group.alignfull.is-layout-constrained {
  padding-left: max(24px, calc(50vw - 720px));
  padding-right: max(24px, calc(50vw - 720px));
}
.alignwide {
  width: 100%;
  max-width: min(1440px, 100%);
  margin-left: auto;
  margin-right: auto;
}
.has-background { background-clip: padding-box; }

/* Flex layouts (wp:group with layout.type:"flex") */
.is-layout-flex {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--wp--style--block-gap, 0.5em);
}
.is-layout-flex.is-nowrap { flex-wrap: nowrap; }
.is-layout-flex.is-vertical-orientation,
.is-layout-flex.is-layout-flex-vertical { flex-direction: column; }
.is-layout-flex.is-content-justification-left { justify-content: flex-start; }
.is-layout-flex.is-content-justification-center { justify-content: center; }
.is-layout-flex.is-content-justification-right { justify-content: flex-end; }
.is-layout-flex.is-content-justification-space-between { justify-content: space-between; }
.is-layout-flex.is-content-justification-space-around { justify-content: space-around; }
.is-layout-flex.is-vertical-alignment-top { align-items: flex-start; }
.is-layout-flex.is-vertical-alignment-center { align-items: center; }
.is-layout-flex.is-vertical-alignment-bottom { align-items: flex-end; }
/* In vertical orientation, the alignment axes swap */
.is-layout-flex.is-vertical-orientation.is-content-justification-center { align-items: center; justify-content: flex-start; }

/* Text alignment helpers */
.has-text-align-left   { text-align: left; }
.has-text-align-center { text-align: center; }
.has-text-align-right  { text-align: right; }

/* wp:columns — use CSS columns as intended by Gutenberg */
.wp-block-columns {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
  margin-bottom: 1.75em;
}
.wp-block-columns.are-vertically-aligned-top    { align-items: flex-start; }
.wp-block-columns.are-vertically-aligned-center { align-items: center; }
.wp-block-columns.are-vertically-aligned-bottom { align-items: flex-end; }
.wp-block-column {
  flex: 1 1 0;
  min-width: 0;
}
.wp-block-column.is-vertically-aligned-top    { align-self: flex-start; }
.wp-block-column.is-vertically-aligned-center { align-self: center; }
.wp-block-column.is-vertically-aligned-bottom { align-self: flex-end; }
@media (max-width: 780px) {
  .wp-block-columns:not(.is-not-stacked-on-mobile) { flex-direction: column; }
  .wp-block-columns:not(.is-not-stacked-on-mobile) > .wp-block-column { flex-basis: 100% !important; }
}

/* wp:media-text — side-by-side media and copy */
.wp-block-media-text {
  display: grid;
  grid-template-columns: 50% 1fr;
  align-items: center;
  gap: 48px;
}
.wp-block-media-text.has-media-on-the-right { grid-template-columns: 1fr 50%; }
.wp-block-media-text.has-media-on-the-right .wp-block-media-text__media { order: 2; }
.wp-block-media-text.has-media-on-the-right .wp-block-media-text__content { order: 1; }
.wp-block-media-text.is-vertically-aligned-top    { align-items: flex-start; }
.wp-block-media-text.is-vertically-aligned-center { align-items: center; }
.wp-block-media-text.is-vertically-aligned-bottom { align-items: flex-end; }
.wp-block-media-text__media img { width: 100%; height: auto; display: block; }
.wp-block-media-text__content { padding: 0 8%; }
@media (max-width: 780px) {
  .wp-block-media-text.is-stacked-on-mobile { grid-template-columns: 1fr; }
  .wp-block-media-text.is-stacked-on-mobile .wp-block-media-text__content { padding: 24px; }
}
.wp-block-columns { display: grid; gap: 32px; grid-template-columns: 1fr; }
@media (min-width: 780px) {
  .wp-block-columns { grid-template-columns: repeat(var(--envosta-cols, 2), 1fr); }
  .wp-block-columns.has-2-columns { --envosta-cols: 2; }
  .wp-block-columns.has-3-columns { --envosta-cols: 3; }
  .wp-block-columns.has-4-columns { --envosta-cols: 4; }
}
.wp-block-column { min-width: 0; }
.wp-block-buttons { display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0; }
.wp-block-button__link {
  display: inline-flex; align-items: center; padding: 16px 28px;
  font-family: var(--wp--preset--font-family--heading);
  font-weight: 500; font-size: 15px; letter-spacing: 0.02em;
  border: 1px solid currentColor; text-decoration: none; cursor: pointer;
  background: var(--wp--preset--color--theme-4); color: var(--wp--preset--color--theme-1);
  transition: background 150ms ease, transform 150ms ease;
}
.wp-block-button__link:hover { background: var(--wp--preset--color--theme-5); transform: translateY(-1px); }
.wp-block-separator { border: 0; border-top: 1px solid var(--wp--preset--color--theme-3); margin: 48px auto; max-width: 120px; }
.wp-block-spacer { display: block; }
.wp-block-cover { position: relative; min-height: 480px; display: flex; align-items: center; justify-content: center; padding: 64px 24px; background-size: cover; background-position: center; color: var(--wp--preset--color--theme-1); }
.wp-block-cover__inner-container { position: relative; z-index: 1; max-width: 780px; text-align: center; }
.wp-block-image img { max-width: 100%; height: auto; display: block; }
.wp-block-quote { border-left: 3px solid var(--wp--preset--color--theme-4); padding: 8px 0 8px 24px; margin: 32px 0; font-size: 20px; }
.wp-block-list { padding-left: 1.2em; }
</style>
<script>
// Preview click-proofing: prevent any in-iframe navigation so clicking a
// nav link or button doesn't blow away the preview doc. Hover states,
// focus rings, and visual feedback stay intact.
document.addEventListener('click', function (e) {
  var target = e.target && e.target.closest ? e.target.closest('a, button[type="submit"], form') : null;
  if (target) { e.preventDefault(); e.stopPropagation(); }
}, true);
document.addEventListener('submit', function (e) { e.preventDefault(); }, true);
</script>`;
}

/**
 * Build the preview doc shown in the iframe. If the selected page is a
 * content page, sandwich it between the Header and Footer template parts.
 * If it's a template part (Header/Footer), preview it alone.
 * Always injects live CSS variables from styleConfig so style tweaks are visible instantly.
 */
function buildPreviewDoc(selected: any, header: any, footer: any, style: any): string {
  if (!selected?.html) return '';
  const override = buildStyleOverride(style);
  const isPart = SPECIAL_PAGES.includes(selected.title);

  if (isPart) {
    // Wrap the part alone so CSS vars still apply
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
${override}
${extractHead(selected.html)}
</head>
<body>
${extractBody(selected.html)}
</body>
</html>`;
  }

  const contentBody = extractBody(selected.html);
  const contentHead = extractHead(selected.html);
  const headerBody = header?.html ? extractBody(header.html) : '';
  const footerBody = footer?.html ? extractBody(footer.html) : '';
  const headerHead = header?.html ? extractHead(header.html) : '';
  const footerHead = footer?.html ? extractHead(footer.html) : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
${override}
${contentHead}
${headerHead}
${footerHead}
</head>
<body>
${headerBody}
${contentBody}
${footerBody}
</body>
</html>`;
}

export function StepDesign({
  projectId, brief, styleConfig, pages, selectedPageId, businessInfo,
  onStyleChange, onPagesChange, onSelectPage, onContinue, onAuthRequired,
}: {
  projectId: string;
  brief?: string;
  styleConfig: any;
  pages: any[];
  selectedPageId: string;
  businessInfo: any;
  onStyleChange: (config: any) => void;
  onPagesChange: (pages: any[]) => void;
  onSelectPage: (id: string) => void;
  onContinue: () => void;
  onAuthRequired?: () => void;
}) {
  const [showPages, setShowPages] = useState(true);
  const [showStyles, setShowStyles] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [referenceHtml, setReferenceHtml] = useState('');
  const [addingPage, setAddingPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<Element | null>(null);

  // Grab the studio header's toolbar slot so we can portal our controls into it
  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Poll briefly in case this step mounts before the header (StrictMode, transitions)
    let tries = 0;
    const tick = () => {
      const el = document.getElementById('studio-header-slot');
      if (el) { setHeaderSlot(el); return; }
      if (tries++ < 10) setTimeout(tick, 30);
    };
    tick();
    return () => setHeaderSlot(null);
  }, []);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const selectedPage = pages.find(p => p.id === selectedPageId);
  const hasAnyGenerated = pages.some(p => p.html);
  const sizeConfig = SIZES.find(s => s.id === previewSize)!;

  // Ensure Header and Footer exist in-memory (fallback if wireframe didn't include them)
  useEffect(() => {
    const hasHeader = pages.some(p => p.title === 'Header');
    const hasFooter = pages.some(p => p.title === 'Footer');
    if (hasHeader && hasFooter) return;
    const toAdd: any[] = [];
    if (!hasHeader) toAdd.push({ id: `local-hdr-${Date.now()}`, title: 'Header', slug: 'header', sort_order: -2, prompt: `Site header template part — full design freedom for the desktop layout (logo placement, nav positioning, CTA button style, announcement bar, cart + account icons if WooCommerce is on, etc.).

MOBILE REQUIREMENT (non-negotiable): the mobile navigation MUST use the WordPress core Navigation block with its built-in responsive/overlay behaviour, not a hand-rolled hamburger + <ul>. Embed it like this (customise attributes freely):

<!-- wp:navigation {"ref":0,"overlayMenu":"mobile","icon":"menu","openSubmenusOnClick":true,"overlayBackgroundColor":"theme-1","overlayTextColor":"theme-4","style":{"spacing":{"blockGap":"var:preset|spacing|40"}}} /-->

You're welcome to customise the attributes: overlayMenu can be "mobile"|"always"|"never"; icon can be "menu"|"menu-alt"|"menu-alt2"|"menu-alt3"; overlayBackgroundColor/overlayTextColor accept any theme-N slug; add hasIcon:true for a branded trigger; openSubmenusOnClick:true makes nested menus tap-to-open. You can wrap the Navigation block in a <div> with your own styles for position, padding, background, and motion — just keep the <!-- wp:navigation /--> comment intact so WordPress renders the real mobile slide-out menu on import. If WooCommerce is on, also include a styled cart icon that links to /cart and an account icon linking to /my-account alongside the nav.`, html: '' });
    if (!hasFooter) toAdd.push({ id: `local-ftr-${Date.now()}`, title: 'Footer', slug: 'footer', sort_order: -1, prompt: 'Site footer with company info, quick links, social media icons, and copyright.', html: '' });
    if (toAdd.length) onPagesChange([...toAdd, ...pages]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup any pending timers on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function exportPageXml(pageId: string) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    if (!page.html) { setStatus({ type: 'error', msg: 'Generate or import HTML first' }); return; }
    const siteName = styleConfig.siteName || 'Untitled';
    downloadPageAsXml(siteName, {
      title: page.title,
      slug: page.slug || page.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      html: page.html,
    });
    setStatus({ type: 'success', msg: `Exported ${page.title}.xml` });
  }

  function addPageFromTemplate(title: string) {
    const tpl = getTemplateByTitle(title);
    if (!tpl) return;
    // Skip if a page with this title already exists
    if (pages.some(p => p.title.toLowerCase() === tpl.title.toLowerCase())) {
      setStatus({ type: 'error', msg: `"${tpl.title}" already exists` });
      return;
    }
    const newPage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: tpl.title,
      slug: tpl.slug,
      sort_order: pages.length,
      prompt: tpl.prompt,
      html: '',
      sections: [] as Array<{ id: string; title: string; description: string }>,
    };
    onPagesChange([...pages, newPage]);
    onSelectPage(newPage.id);
    setStatus({ type: 'success', msg: `Added "${tpl.title}" — hit Send to generate it` });
  }

  function resetPage(pageId: string) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    if (page.html && !confirm(`Clear "${page.title}" content? This removes the generated HTML so you can regenerate from scratch.`)) return;
    onPagesChange(pages.map(p => p.id === pageId ? { ...p, html: '' } : p));
    setStatus({ type: 'success', msg: `Cleared "${page.title}"` });
  }

  async function importPageHtml(pageId: string, file: File) {
    try {
      const raw = await file.text();
      const page = pages.find(p => p.id === pageId);
      const stripped = stripHtmlForPage(raw, page?.title ?? '');
      const updated = pages.map(p => p.id === pageId ? { ...p, html: stripped } : p);
      onPagesChange(updated);
      onSelectPage(pageId);
      const kind = page?.title === 'Header' ? 'header' : page?.title === 'Footer' ? 'footer' : 'page content';
      setStatus({ type: 'success', msg: `Imported ${kind} for ${page?.title ?? 'page'}` });
    } catch (err: any) {
      setStatus({ type: 'error', msg: err?.message || 'Import failed' });
    }
  }

  function promoteToGlobal(pageId: string) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    if (!page.html) { setStatus({ type: 'error', msg: 'Generate or import HTML first' }); return; }
    const extracted = extractStylesFromHtml(page.html);
    if (!extracted.colors && !extracted.fonts) {
      // Pages generated by the studio reference CSS variables rather than
      // embedding hex values, so there's nothing distinct to promote —
      // they already use the global styles.
      const isGenerated = /var\s*\(\s*--wp--preset--color--theme-/.test(page.html);
      setStatus({
        type: 'error',
        msg: isGenerated
          ? 'This page already uses global styles — no hardcoded values to promote.'
          : 'Could not detect styles in this page',
      });
      return;
    }
    const colorCount = extracted.colors ? Object.keys(extracted.colors).length : 0;
    const fontCount = extracted.fonts ? Object.keys(extracted.fonts).length : 0;
    if (!confirm(`Promote "${page.title}" styles to global?\n\nDetected: ${colorCount} color${colorCount === 1 ? '' : 's'}, ${fontCount} font${fontCount === 1 ? '' : 's'}.\nThis will update your global palette and typography and apply to every future page generation.`)) return;
    const next: any = { ...styleConfig };
    if (extracted.colors) next.colors = { ...(styleConfig.colors || {}), ...extracted.colors };
    if (extracted.fonts) next.fonts = { ...(styleConfig.fonts || {}), ...extracted.fonts };
    next.mode = next.mode === 'parent' ? 'custom' : (next.mode || 'custom');
    delete next.presetId;
    onStyleChange(next);
    setStatus({ type: 'success', msg: `Global styles updated from "${page.title}" — ${colorCount} colors, ${fontCount} fonts` });
  }

  function applyPreset(preset: StudioStylePreset) {
    // Merge preset on top of the current config so the user's site name is preserved.
    // Applying an Envosta parent-theme variation keeps us in parent mode;
    // applying one of our custom curated presets implies the user wants
    // Full Custom (so flip them to it).
    const isParentVariation = preset.id.startsWith('assembler-');
    const nextMode = isParentVariation ? (styleConfig.mode || 'parent') : 'custom';
    onStyleChange({
      ...styleConfig,
      ...preset.config,
      presetId: preset.id,
      mode: nextMode,
    });
    setStatus({ type: 'success', msg: `Applied "${preset.name}"` });
  }

  async function suggestPreset() {
    setSuggesting(true);
    setStatus(null);
    try {
      const res = await fetchWithRetry('/api/studio/suggest-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, businessInfo }),
      }, { retries: 0 });
      if (res.status === 401 && onAuthRequired) { onAuthRequired(); return; }
      const data = await res.json();
      if (!res.ok) { setStatus({ type: 'error', msg: data.error || 'Failed to suggest' }); return; }
      if (data.preset) {
        applyPreset(data.preset as StudioStylePreset);
        setStatus({ type: 'success', msg: `AI picked "${data.preset.name}"` });
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err?.message || 'Network error' });
    } finally {
      setSuggesting(false);
    }
  }

  function updateStyle(path: string[], value: string) {
    const next = JSON.parse(JSON.stringify(styleConfig));
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] ??= {};
    obj[path[path.length - 1]] = value;
    // User tweaked something — no longer a pure preset
    if (path[0] !== 'siteName') delete next.presetId;
    onStyleChange(next);
  }

  // Track which (pageId, sectionId) is currently regenerating so we can show
  // inline feedback on the right row.
  const [regenKey, setRegenKey] = useState<string | null>(null);

  async function regenerateSection(pageId: string, sectionId: string, extraPrompt?: string) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    const section = (page.sections || []).find((s: any) => s.id === sectionId);
    if (!section) { setStatus({ type: 'error', msg: 'Section not found' }); return; }
    setRegenKey(`${pageId}:${sectionId}`);
    setStatus({ type: 'success', msg: `Regenerating "${section.title}"…` });
    try {
      const res = await fetchWithRetry('/api/studio/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: styleConfig,
          pageName: page.title,
          pageContext: page.prompt,
          allSections: page.sections,
          section,
          extraPrompt,
        }),
      }, { retries: 0 });
      if (res.status === 401 && onAuthRequired) { onAuthRequired(); return; }
      const data = await res.json();
      if (!res.ok) { setStatus({ type: 'error', msg: data.error || 'Section regen failed' }); return; }

      const anchor = `section-${section.id}`;
      // Safety net: make sure the returned block carries the right anchor
      // so our splice always finds it and so the id on the output div is
      // stable for subsequent edits.
      const replacement = ensureAnchorOnFirstBlock(String(data.html || ''), anchor);

      if (!page.html) {
        // No existing page yet — just store the single section's markup.
        onPagesChange(pages.map(p => p.id === pageId ? { ...p, html: replacement } : p));
        setStatus({ type: 'success', msg: `Generated "${section.title}" (first section on the page)` });
        return;
      }

      const spliced = replaceSectionBlock(page.html, anchor, replacement);
      if (spliced !== null) {
        onPagesChange(pages.map(p => p.id === pageId ? { ...p, html: spliced } : p));
        setStatus({ type: 'success', msg: `Updated "${section.title}"` });
      } else {
        // Fall back: append the new block to the end of page.html. Not ideal
        // but better than losing the generation — user can re-plan to fix order.
        onPagesChange(pages.map(p => p.id === pageId ? { ...p, html: (p.html || '') + '\n\n' + replacement } : p));
        setStatus({
          type: 'error',
          msg: `Couldn't find the existing "${section.title}" section to replace — appended to the end. Full regen will fix ordering.`,
        });
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err?.message || 'Section regen failed' });
    } finally {
      setRegenKey(null);
    }
  }

  async function planSections(pageId: string): Promise<Array<{ id: string; title: string; description: string }> | null> {
    const page = pages.find(p => p.id === pageId);
    if (!page) return null;
    try {
      const res = await fetchWithRetry('/api/studio/plan-sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief, businessInfo,
          pageName: page.title, pagePrompt: page.prompt,
          allPageNames: pages.filter(p => !SPECIAL_PAGES.includes(p.title)).map(p => p.title),
          woocommerce: !!businessInfo?.woocommerce,
          blog: !!businessInfo?.blog,
          isTemplatePart: SPECIAL_PAGES.includes(page.title),
        }),
      }, { retries: 0 });
      if (res.status === 401 && onAuthRequired) { onAuthRequired(); return null; }
      const data = await res.json();
      if (!res.ok) { setStatus({ type: 'error', msg: data.error || 'Section planning failed' }); return null; }
      return Array.isArray(data.sections) ? data.sections : null;
    } catch (err: any) {
      setStatus({ type: 'error', msg: err?.message || 'Section planning failed' });
      return null;
    }
  }

  async function generatePage(pageId: string, extraPrompt?: string) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    setGenerating(pageId);
    setStatus(null);

    const prompt = extraPrompt
      ? `${page.prompt}\n\nAdditional instructions: ${extraPrompt}`
      : page.prompt;

    try {
      // Plan sections if this page has none yet — first-ever generation.
      // Skipped when a reference HTML is present (user's dictating structure).
      let sections: any[] = Array.isArray(page.sections) ? page.sections : [];
      if (sections.length === 0 && !referenceHtml) {
        setStatus({ type: 'success', msg: `Planning sections for ${page.title}…` });
        const planned = await planSections(pageId);
        if (planned && planned.length > 0) {
          sections = planned;
          // Persist the plan on the page BEFORE generating so it survives
          // errors / retries.
          onPagesChange(pages.map(p => p.id === pageId ? { ...p, sections } : p));
        }
      }

      const strippedReference = referenceHtml
        ? stripHtmlForPage(referenceHtml, page.title)
        : undefined;

      const res = await fetchWithRetry('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId, pageId, style: styleConfig,
          pageName: page.title, pagePrompt: prompt,
          isTemplatePart: SPECIAL_PAGES.includes(page.title),
          templatePartKind: page.title === 'Header' ? 'header' : page.title === 'Footer' ? 'footer' : undefined,
          allPageNames: pages.filter(p => !SPECIAL_PAGES.includes(p.title)).map(p => p.title),
          referenceHtml: strippedReference,
          sections: sections.length > 0 ? sections : undefined,
        }),
      }, { retries: 0 });
      if (res.status === 401 && onAuthRequired) { onAuthRequired(); return; }
      const data = await res.json();
      if (!res.ok) { setStatus({ type: 'error', msg: data.error || 'Failed' }); return; }

      const updated = pages.map(p => p.id === pageId ? { ...p, html: data.html, sections } : p);
      onPagesChange(updated);
      setStatus({ type: 'success', msg: `${page.title} generated!` });
    } catch (err: any) {
      const msg = err?.name === 'AbortError'
        ? 'Request timed out — the page is too complex. Try a shorter prompt.'
        : err?.message
        ? `Network error: ${err.message}`
        : 'Network error — check your connection and try again.';
      setStatus({ type: 'error', msg });
    } finally {
      setGenerating(null);
    }
  }


  async function handleAiEdit() {
    if (!selectedPage) return;
    setAiLoading(true);
    // An empty prompt means "just generate this page from its brief prompt" —
    // the bottom bar doubles as both the AI edit bar AND the generate button.
    const prompt = aiPrompt.trim() || (referenceHtml ? 'Rebuild this page exactly using my style system' : '');
    await generatePage(selectedPage.id, prompt || undefined);
    setAiPrompt('');
    setReferenceHtml(''); // clear after use
    setAiLoading(false);
  }

  function addPage() {
    if (!newPageTitle.trim()) return;
    const slug = newPageTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const newPage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: newPageTitle.trim(),
      slug,
      sort_order: pages.length,
      prompt: `${newPageTitle.trim()} page for the website`,
      html: '',
    };
    onPagesChange([...pages, newPage]);
    onSelectPage(newPage.id);
    setNewPageTitle('');
    setAddingPage(false);
  }

  function deletePage(id: string) {
    const page = pages.find(p => p.id === id);
    if (!page || SPECIAL_PAGES.includes(page.title)) return;
    if (!confirm(`Delete "${page.title}"?`)) return;
    const updated = pages.filter(p => p.id !== id);
    onPagesChange(updated);
    if (selectedPageId === id) onSelectPage(updated[0]?.id || '');
  }

  const inputClass = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors';

  // Separate header/footer from content pages
  const headerPage = pages.find(p => p.title === 'Header');
  const footerPage = pages.find(p => p.title === 'Footer');

  // Memoise the preview iframe's srcDoc so it only regenerates when the
  // selected page's HTML, the header/footer parts, or the global styleConfig
  // actually change. Prevents unrelated re-renders (AI prompt typing, etc.)
  // from reloading the iframe, which would drop scroll position and flash fonts.
  const previewSrcDoc = useMemo(
    () => buildPreviewDoc(selectedPage, headerPage, footerPage, styleConfig),
    [selectedPage?.id, selectedPage?.html, headerPage?.html, footerPage?.html, styleConfig],
  );
  // Split content pages into categories for the sidebar.
  const nonPart = pages.filter(p => !SPECIAL_PAGES.includes(p.title));
  const wcEnabled = !!businessInfo?.woocommerce;
  const blogEnabled = !!businessInfo?.blog;
  const wooCommercePages = wcEnabled ? nonPart.filter(p => WOOCOMMERCE_PAGE_TITLES.has(p.title)) : [];
  const blogPages = blogEnabled ? nonPart.filter(p => BLOG_PAGE_TITLES.has(p.title)) : [];
  const systemPages = nonPart.filter(p => SYSTEM_PAGE_TITLES.has(p.title));
  const contentPages = nonPart.filter(p =>
    !(wcEnabled && WOOCOMMERCE_PAGE_TITLES.has(p.title)) &&
    !(blogEnabled && BLOG_PAGE_TITLES.has(p.title)) &&
    !SYSTEM_PAGE_TITLES.has(p.title)
  );

  return (
    <div className="flex h-full">
      {/* ═══ LEFT: Pages sidebar (toggleable) ═══ */}
      {showPages && (
        <div className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-auto">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Template Parts</h3>
            </div>
            {[headerPage, footerPage].filter(Boolean).map(page => (
              <div key={page!.id} className="group flex items-center mb-0.5">
                <button
                  onClick={() => onSelectPage(page!.id)}
                  className={`flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all text-left ${
                    page!.id === selectedPageId ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <LayoutTemplate className="w-3 h-3 shrink-0" />
                  <span className="flex-1 truncate">{page!.title}</span>
                  {generating === page!.id && <Loader2 className="w-3 h-3 animate-spin text-purple-500" />}
                  {page!.html && generating !== page!.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                </button>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => resetPage(page!.id)} disabled={!page!.html}
                    className="p-0.5 rounded text-gray-300 hover:text-amber-600 disabled:opacity-30 disabled:hover:text-gray-300"
                    title="Reset this part to blank">
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => exportPageXml(page!.id)} disabled={!page!.html}
                    className="p-0.5 rounded text-gray-300 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-300"
                    title="Export just this part as WordPress XML">
                    <Download className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* WooCommerce category — always shown so users can add WC pages
              on demand from the + picker, even if none exist yet. */}
          <PageCategory
            title="WooCommerce"
            icon={<ShoppingBag className="w-3 h-3 text-amber-500" />}
            activeClasses="bg-amber-50 text-amber-700"
            accentClass="text-amber-500"
            pages={wooCommercePages}
            selectedPageId={selectedPageId}
            generating={generating}
            onSelectPage={onSelectPage}
            exportPageXml={exportPageXml}
            deletePage={deletePage}
            resetPage={resetPage}
            RowIcon={ShoppingBag}
            availableTemplates={WOOCOMMERCE_TEMPLATES}
            onAddTemplate={addPageFromTemplate}
          />

          {/* Blog category */}
          <PageCategory
            title="Blog"
            icon={<Newspaper className="w-3 h-3 text-rose-500" />}
            activeClasses="bg-rose-50 text-rose-700"
            accentClass="text-rose-500"
            pages={blogPages}
            selectedPageId={selectedPageId}
            generating={generating}
            onSelectPage={onSelectPage}
            exportPageXml={exportPageXml}
            deletePage={deletePage}
            resetPage={resetPage}
            RowIcon={Newspaper}
            availableTemplates={BLOG_TEMPLATES}
            onAddTemplate={addPageFromTemplate}
          />

          {/* System category */}
          <PageCategory
            title="System"
            icon={<Wrench className="w-3 h-3 text-gray-500" />}
            activeClasses="bg-gray-100 text-gray-800"
            accentClass="text-gray-500"
            pages={systemPages}
            selectedPageId={selectedPageId}
            generating={generating}
            onSelectPage={onSelectPage}
            exportPageXml={exportPageXml}
            deletePage={deletePage}
            resetPage={resetPage}
            RowIcon={Wrench}
            availableTemplates={SYSTEM_TEMPLATES}
            onAddTemplate={addPageFromTemplate}
          />

          {/* When a category has no pages, show a tiny hint row so it
              doesn't look empty. Placed here rather than in PageCategory
              so each category's `pages` list drives the render cleanly. */}
          {wooCommercePages.length === 0 && blogPages.length === 0 && systemPages.length === 0 && (
            <div className="px-3 pb-2 -mt-2 text-[10px] text-gray-400 leading-snug">
              Use the <strong>+</strong> buttons above to add Shop / Cart / Blog / Single Post / 404 / Search Results templates on demand.
            </div>
          )}

          <div className="p-3 flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Pages</h3>
              <button onClick={() => setAddingPage(true)} className="p-0.5 rounded text-gray-400 hover:text-indigo-600" title="Add page">
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-0.5">
              {contentPages.map(page => (
                <div key={page.id} className="group flex items-center">
                  <button
                    onClick={() => onSelectPage(page.id)}
                    className={`flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all text-left ${
                      page.id === selectedPageId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="flex-1 truncate">{page.title}</span>
                    {generating === page.id && <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />}
                    {page.html && generating !== page.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                  </button>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all mr-1">
                    <button onClick={() => resetPage(page.id)} disabled={!page.html}
                      className="p-0.5 rounded text-gray-300 hover:text-amber-600 disabled:opacity-30 disabled:hover:text-gray-300"
                      title="Reset this page to blank">
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                    <button onClick={() => exportPageXml(page.id)} disabled={!page.html}
                      className="p-0.5 rounded text-gray-300 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-300"
                      title="Export just this page as WordPress XML">
                      <Download className="w-2.5 h-2.5" />
                    </button>
                    <button onClick={() => deletePage(page.id)} className="p-0.5 rounded text-gray-300 hover:text-red-500" title="Delete this page">
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {addingPage && (
              <div className="mt-2">
                <input
                  type="text" autoFocus value={newPageTitle}
                  onChange={e => setNewPageTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addPage(); if (e.key === 'Escape') setAddingPage(false); }}
                  className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-indigo-500 outline-none"
                  placeholder="Page name..."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ CENTER: Preview + AI Prompt (top bar is portalled into the studio header) ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {headerSlot && createPortal(
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <button onClick={() => setShowPages(!showPages)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" title={showPages ? 'Hide pages' : 'Show pages'}>
              {showPages ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
            <select
              value={selectedPageId}
              onChange={e => onSelectPage(e.target.value)}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-indigo-500 outline-none max-w-[160px]"
            >
              {pages.map(p => <option key={p.id} value={p.id}>{p.title}{p.html ? '' : ' (empty)'}</option>)}
            </select>
            {generating && (
              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" /> Generating…
              </span>
            )}
            {status && (
              <span className={`text-[11px] truncate ${status.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>{status.msg}</span>
            )}
            <div className="flex-1" />
            <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
              {SIZES.map(s => (
                <button key={s.id} onClick={() => setPreviewSize(s.id)} className={`p-1 rounded text-xs transition-all ${previewSize === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                  <s.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            <button onClick={() => setShowStyles(!showStyles)} className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100" title={showStyles ? 'Hide styles' : 'Show styles'}>
              {showStyles ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
            <button
              onClick={onContinue}
              disabled={!hasAnyGenerated}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md disabled:opacity-50"
              title={hasAnyGenerated ? 'Continue to export' : 'Generate at least one page first'}
            >
              Export <ArrowRight className="w-3 h-3" />
            </button>
          </div>,
          headerSlot,
        )}

        {/* Preview area */}
        <div className="flex-1 bg-gray-100 flex justify-center p-4 overflow-auto">
          {selectedPage?.html ? (
            <div className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300" style={{ width: sizeConfig.width, maxWidth: '100%' }}>
              <iframe
                srcDoc={previewSrcDoc}
                className="w-full border-0"
                style={{ height: '100%', minHeight: '800px' }}
                sandbox="allow-same-origin allow-scripts"
                title={`Preview: ${selectedPage?.title}`}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-gray-400 py-20">
              <Eye className="w-10 h-10 text-gray-300" />
              <p className="text-sm">Click "Generate" to create this page</p>
            </div>
          )}
        </div>

        {/* Sections panel — shows the planned sections for the selected page */}
        {selectedPage && Array.isArray(selectedPage.sections) && selectedPage.sections.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50/60 px-4 py-2 shrink-0 max-h-[140px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Sections in {selectedPage.title}</span>
              <button
                onClick={async () => {
                  if (!confirm(`Re-plan sections for "${selectedPage.title}"? This replaces the current section list. The next generation will use the new plan.`)) return;
                  const planned = await planSections(selectedPage.id);
                  if (planned && planned.length > 0) {
                    onPagesChange(pages.map(p => p.id === selectedPage.id ? { ...p, sections: planned } : p));
                    setStatus({ type: 'success', msg: `Sections re-planned (${planned.length})` });
                  }
                }}
                className="text-[10px] text-indigo-600 hover:text-indigo-800"
                title="Ask the AI to re-plan sections from the full site context"
              >
                Re-plan
              </button>
              <button
                onClick={() => {
                  const title = prompt('Section title (e.g. "Testimonials"):', '')?.trim();
                  if (!title) return;
                  const description = prompt('One-sentence description:', '')?.trim() || '';
                  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `section-${Date.now()}`;
                  const next = [...selectedPage.sections, { id, title, description }];
                  onPagesChange(pages.map(p => p.id === selectedPage.id ? { ...p, sections: next } : p));
                  setStatus({ type: 'success', msg: `Added "${title}" — regenerate the page to render it` });
                }}
                className="text-[10px] text-indigo-600 hover:text-indigo-800"
              >
                + Add
              </button>
            </div>
            <ol className="space-y-0.5 text-[11px]">
              {selectedPage.sections.map((s: any, i: number) => {
                const isRegening = regenKey === `${selectedPage.id}:${s.id}`;
                return (
                <li key={s.id} className="group flex items-start gap-2">
                  <span className="text-gray-400 font-mono shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-700">{s.title}</span>
                    {s.description && <span className="text-gray-500"> — {s.description}</span>}
                    {isRegening && <Loader2 className="inline-block w-2.5 h-2.5 ml-1 animate-spin text-indigo-500" />}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => regenerateSection(selectedPage.id, s.id)}
                      disabled={!!regenKey}
                      className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                      title="Regenerate just this section"
                    ><Sparkles className="w-2.5 h-2.5" /></button>
                    <button
                      onClick={async () => {
                        const instr = window.prompt(`Regenerate "${s.title}" with what changes?\n(Examples: "make it darker with a full-width CTA", "add a video under the heading")`, '')?.trim();
                        if (!instr) return;
                        // Also update the section's description so the plan
                        // reflects the user's intent.
                        const next = selectedPage.sections.map((x: any) =>
                          x.id === s.id ? { ...x, description: instr } : x
                        );
                        onPagesChange(pages.map(p => p.id === selectedPage.id ? { ...p, sections: next } : p));
                        regenerateSection(selectedPage.id, s.id, instr);
                      }}
                      disabled={!!regenKey}
                      className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                      title="Edit instructions + regenerate"
                    ><Send className="w-2.5 h-2.5" /></button>
                    <button
                      onClick={() => {
                        if (i === 0) return;
                        const next = [...selectedPage.sections];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        onPagesChange(pages.map(p => p.id === selectedPage.id ? { ...p, sections: next } : p));
                      }}
                      disabled={i === 0}
                      className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                      title="Move up"
                    >↑</button>
                    <button
                      onClick={() => {
                        if (i === selectedPage.sections.length - 1) return;
                        const next = [...selectedPage.sections];
                        [next[i], next[i + 1]] = [next[i + 1], next[i]];
                        onPagesChange(pages.map(p => p.id === selectedPage.id ? { ...p, sections: next } : p));
                      }}
                      disabled={i === selectedPage.sections.length - 1}
                      className="p-0.5 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                      title="Move down"
                    >↓</button>
                    <button
                      onClick={() => {
                        if (!confirm(`Remove the "${s.title}" section from the plan?`)) return;
                        const next = selectedPage.sections.filter((x: any) => x.id !== s.id);
                        onPagesChange(pages.map(p => p.id === selectedPage.id ? { ...p, sections: next } : p));
                        setStatus({ type: 'success', msg: `Removed "${s.title}" — regenerate to update` });
                      }}
                      className="p-0.5 text-gray-400 hover:text-red-500"
                      title="Remove section"
                    ><X className="w-2.5 h-2.5" /></button>
                  </div>
                </li>
                );
              })}
            </ol>
            <p className="text-[10px] text-gray-400 mt-1.5 leading-snug">
              Edit the plan, then hit <strong>Send</strong> in the prompt bar to regenerate the page with the updated sections.
            </p>
          </div>
        )}

        {/* AI Chat prompt — bottom bar */}
        <div className="border-t border-gray-200 bg-white px-4 py-3 shrink-0">
          {/* Reference HTML indicator */}
          {referenceHtml && (
            <div className="flex items-center gap-2 max-w-3xl mx-auto mb-2">
              <div className="flex-1 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-700">
                <Upload className="w-3 h-3 shrink-0" />
                <span className="flex-1 truncate">Reference HTML loaded ({Math.round(referenceHtml.length / 1024)}KB) — next generation will rebuild from this</span>
                <button onClick={() => setReferenceHtml('')} className="p-0.5 rounded hover:bg-amber-100">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <input
              type="text"
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiEdit(); } }}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder={referenceHtml
                ? 'Describe changes to the reference — or just hit enter to rebuild it with your styles...'
                : selectedPage && !selectedPage.html
                ? `Hit enter to generate "${selectedPage.title}" — or type instructions to refine it...`
                : selectedPage
                ? `Edit "${selectedPage.title}" — e.g. "make the hero bigger", "add testimonials"...`
                : 'Select a page first...'}
              disabled={!selectedPage || aiLoading}
            />
            {/* File upload button */}
            <label className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer transition-colors" title="Upload HTML reference file">
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".html,.htm"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  setReferenceHtml(text);
                  if (!aiPrompt.trim()) setAiPrompt('Rebuild this page exactly using my style system');
                  e.target.value = ''; // reset so same file can be re-uploaded
                }}
              />
            </label>
            {/* Use this page's styles as global styles */}
            <button
              onClick={() => selectedPage && promoteToGlobal(selectedPage.id)}
              disabled={!selectedPage?.html}
              className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
              title={selectedPage?.html
                ? `Update global styles from "${selectedPage.title}" — affects every page`
                : 'Generate or import HTML first'}
            >
              <Globe2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleAiEdit}
              disabled={!selectedPage || aiLoading}
              className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 transition-colors"
              title={
                !selectedPage ? 'Select a page first' :
                aiPrompt.trim() ? `Send — update "${selectedPage.title}" with your instructions` :
                referenceHtml ? 'Rebuild from the uploaded reference' :
                selectedPage.html ? `Regenerate "${selectedPage.title}"` :
                `Generate "${selectedPage.title}"`
              }
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT: Global Styles sidebar (toggleable) ═══ */}
      {showStyles && (
        <div className="w-64 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-auto">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-500" /> Global Styles
            </h3>
          </div>

          <div className="p-4 space-y-5 overflow-auto flex-1">
            {/* Custom styles toggle — lives here, separate from the header's
                "Custom HTML blocks" toggle. Controls whether the child theme
                ships overrides for the parent's palette / fonts / layout. */}
            {(() => {
              const custom = (styleConfig.mode === 'preset' ? 'custom' : (styleConfig.mode || 'parent')) === 'custom';
              return (
                <div>
                  <button
                    onClick={() => onStyleChange({ ...styleConfig, mode: custom ? 'parent' : 'custom' })}
                    role="switch"
                    aria-checked={custom}
                    className={`w-full inline-flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-colors ${custom ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    title={custom
                      ? 'Custom styles ON — child theme overrides parent palette, fonts, and layout'
                      : 'Custom styles OFF — site inherits everything from the Envosta parent theme'}
                  >
                    <span className={`relative inline-flex h-3.5 w-6 rounded-full transition-colors ${custom ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-2.5 w-2.5 translate-y-[2px] rounded-full bg-white shadow transition-transform ${custom ? 'translate-x-[14px]' : 'translate-x-[2px]'}`} />
                    </span>
                    <span className="flex-1 text-left">Custom styles</span>
                    <span className="text-[10px] text-gray-400">{custom ? 'overriding parent' : 'inheriting parent'}</span>
                  </button>
                  <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                    {custom
                      ? 'Changes below write into the exported child theme and affect every page. Per-page prompts that promote styles to global ask for confirmation.'
                      : 'Site inherits palette, fonts, and layout from the Envosta parent theme. Pick one of its style variations below.'}
                  </p>
                </div>
              );
            })()}

            {/* Envosta parent theme variations */}
            {(styleConfig.mode || 'parent') === 'parent' && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-2">Envosta variation</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {ASSEMBLER_VARIATIONS.map(p => {
                    const active = styleConfig.presetId === p.id;
                    const c = p.config.colors;
                    return (
                      <button
                        key={p.id}
                        onClick={() => applyPreset(p)}
                        className={`text-left rounded-md border p-1.5 transition-all ${active ? 'border-indigo-500 ring-1 ring-indigo-300' : 'border-gray-200 hover:border-gray-300'}`}
                        title={`${p.description}\n${p.vibe}`}
                      >
                        <div className="flex gap-0.5 mb-1">
                          {[c.background, c.surface, c.primary, c.accent].map((col, i) => (
                            <span key={i} className="flex-1 h-3 rounded-sm border border-gray-200" style={{ backgroundColor: col }} />
                          ))}
                        </div>
                        <p className="text-[10px] font-medium text-gray-700 truncate">{p.name}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                  Click a variation to apply its palette + fonts. Want full control? Switch to Custom.
                </p>
              </div>
            )}

            {/* HTML → styles uploader (custom mode only) */}
            {((styleConfig.mode === 'preset' ? 'custom' : (styleConfig.mode || 'parent')) === 'custom') && (
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Derive styles from HTML</label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-gray-300 hover:border-indigo-400 cursor-pointer bg-gray-50/50 hover:bg-indigo-50/30 transition-colors">
                <Upload className="w-3 h-3 text-gray-400 shrink-0" />
                <span className="text-[11px] text-gray-600 truncate">Upload an HTML file</span>
                <input
                  type="file"
                  accept=".html,.htm"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    try {
                      const html = await file.text();
                      const extracted = extractStylesFromHtml(html);
                      if (!extracted.colors && !extracted.fonts) {
                        setStatus({ type: 'error', msg: 'No styles detected in that file' });
                        return;
                      }
                      const next: any = { ...styleConfig };
                      if (extracted.colors) next.colors = { ...(styleConfig.colors || {}), ...extracted.colors };
                      if (extracted.fonts) next.fonts = { ...(styleConfig.fonts || {}), ...extracted.fonts };
                      next.mode = 'custom';
                      delete next.presetId;
                      onStyleChange(next);
                      const colorCount = extracted.colors ? Object.keys(extracted.colors).length : 0;
                      const fontCount = extracted.fonts ? Object.keys(extracted.fonts).length : 0;
                      setStatus({ type: 'success', msg: `Applied ${colorCount} colors + ${fontCount} fonts from ${file.name}` });
                    } catch (err: any) {
                      setStatus({ type: 'error', msg: err?.message || 'Failed to read file' });
                    }
                  }}
                />
              </label>
              <p className="text-[10px] text-gray-400 mt-1 leading-snug">
                Colors & fonts will be extracted and applied as global styles.
              </p>
            </div>
            )}

            {((styleConfig.mode === 'preset' ? 'custom' : (styleConfig.mode || 'parent')) === 'custom') && <div className="h-px bg-gray-100" />}

            {/* AI Suggest — visible in custom mode only. Curated presets
                grid was removed; AI Suggest + HTML derive (above) cover
                starting-style selection when you want a quick jumping-off
                point, or edit the fields directly below. */}
            {((styleConfig.mode === 'preset' ? 'custom' : (styleConfig.mode || 'parent')) === 'custom') && (
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-2">AI-picked starting point</label>
                <button
                  onClick={suggestPreset}
                  disabled={suggesting}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md disabled:opacity-50 transition-colors"
                  title="Let Claude pick a starting palette + fonts based on your brief"
                >
                  {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {suggesting ? 'Picking…' : 'AI Suggest'}
                </button>
                <p className="text-[10px] text-gray-400 mt-2 leading-snug">
                  Hit AI Suggest or drop in an HTML reference above — then fine-tune every field below.
                </p>
              </div>
            )}

            {((styleConfig.mode === 'preset' ? 'custom' : (styleConfig.mode || 'parent')) === 'custom') && (
            <>
            <div className="h-px bg-gray-100" />

            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1">Site Name</label>
              <input type="text" value={styleConfig.siteName || ''} onChange={e => updateStyle(['siteName'], e.target.value)} className={inputClass} placeholder="Business Name" />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Heading Font</label>
              <select value={styleConfig.fonts?.heading || 'Playfair Display'} onChange={e => updateStyle(['fonts', 'heading'], e.target.value)} className={inputClass + ' text-xs'}>
                {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-1.5">Body Font</label>
              <select value={styleConfig.fonts?.body || 'Source Sans 3'} onChange={e => updateStyle(['fonts', 'body'], e.target.value)} className={inputClass + ' text-xs'}>
                {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-2">Colors</label>
              <div className="space-y-2">
                {COLOR_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input type="color" value={styleConfig.colors?.[key] || '#000'} onChange={e => updateStyle(['colors', key], e.target.value)} className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-gray-500">{label}</span>
                      <input type="text" value={styleConfig.colors?.[key] || ''} onChange={e => updateStyle(['colors', key], e.target.value)}
                        className="w-full text-[10px] font-mono text-gray-600 border-0 border-b border-gray-100 focus:border-indigo-400 outline-none bg-transparent" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Radius</label>
                <input type="text" value={styleConfig.borderRadius || '4px'} onChange={e => updateStyle(['borderRadius'], e.target.value)} className={inputClass + ' text-xs'} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-gray-500 mb-1">Max Width</label>
                <input type="text" value={styleConfig.maxWidth || '1200px'} onChange={e => updateStyle(['maxWidth'], e.target.value)} className={inputClass + ' text-xs'} />
              </div>
            </div>
            </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PageCategory: reusable sidebar section for grouped pages ───────

function PageCategory({
  title, icon, activeClasses, accentClass, pages, selectedPageId, generating,
  onSelectPage, exportPageXml, deletePage, resetPage, RowIcon,
  availableTemplates, onAddTemplate,
}: {
  title: string;
  icon: React.ReactNode;
  activeClasses: string;
  accentClass: string;
  pages: any[];
  selectedPageId: string;
  generating: string | null;
  onSelectPage: (id: string) => void;
  exportPageXml: (id: string) => void;
  deletePage: (id: string) => void;
  resetPage: (id: string) => void;
  RowIcon: React.ComponentType<{ className?: string }>;
  availableTemplates?: Array<{ title: string; description: string }>;
  onAddTemplate?: (title: string) => void;
}) {
  const [adderOpen, setAdderOpen] = useState(false);
  const existingTitles = new Set(pages.map(p => p.title.toLowerCase()));
  const addable = (availableTemplates || []).filter(t => !existingTitles.has(t.title.toLowerCase()));
  return (
    <div className="p-3 border-b border-gray-100">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex-1">{title}</h3>
        {addable.length > 0 && onAddTemplate && (
          <div className="relative">
            <button
              onClick={() => setAdderOpen(!adderOpen)}
              className="p-0.5 rounded text-gray-400 hover:text-indigo-600"
              title={`Add a ${title.toLowerCase()} template`}
            >
              <Plus className="w-3 h-3" />
            </button>
            {adderOpen && (
              <div className="absolute right-0 top-5 z-20 w-56 rounded-md border border-gray-200 bg-white shadow-lg py-1">
                {addable.map(t => (
                  <button
                    key={t.title}
                    onClick={() => { onAddTemplate(t.title); setAdderOpen(false); }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-50"
                  >
                    <p className="text-xs font-medium text-gray-900">{t.title}</p>
                    <p className="text-[10px] text-gray-500 leading-snug">{t.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        {pages.map(page => (
          <div key={page.id} className="group flex items-center">
            <button
              onClick={() => onSelectPage(page.id)}
              className={`flex-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all text-left ${
                page.id === selectedPageId ? `${activeClasses} font-medium` : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <RowIcon className="w-3 h-3 shrink-0" />
              <span className="flex-1 truncate">{page.title}</span>
              {generating === page.id && <Loader2 className={`w-3 h-3 animate-spin ${accentClass}`} />}
              {page.html && generating !== page.id && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
            </button>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all mr-1">
              <button onClick={() => resetPage(page.id)} disabled={!page.html}
                className="p-0.5 rounded text-gray-300 hover:text-amber-600 disabled:opacity-30 disabled:hover:text-gray-300"
                title="Reset this page to blank">
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
              <button onClick={() => exportPageXml(page.id)} disabled={!page.html}
                className="p-0.5 rounded text-gray-300 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-300"
                title="Export just this page as WordPress XML">
                <Download className="w-2.5 h-2.5" />
              </button>
              <button onClick={() => deletePage(page.id)} className="p-0.5 rounded text-gray-300 hover:text-red-500"
                title="Delete this page">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
