/**
 * Best-effort extraction of colors and fonts from an HTML page.
 *
 * Strategy (browser-only — uses DOMParser):
 *   1. Concatenate all <style> block contents plus inline style="" attrs.
 *   2. If WP Assembler CSS variables are present (--wp--preset--color--theme-N),
 *      use them directly — that's our own exports.
 *   3. Otherwise, scan every color declaration (hex / rgb / rgba / hsl / hsla),
 *      count frequency, and classify by luminance + saturation:
 *        - lightest frequent color → background
 *        - second lightest         → surface
 *        - most saturated          → accent
 *        - darkest frequent color  → primary / text / secondary
 *        - mid-luminance neutral   → border / textMuted
 *   4. Fonts: count every font-family first-token, pick the most common as
 *      body, and the most common DIFFERENT family seen near h1..h6 rules
 *      as heading (fallback: second-most-common overall).
 *
 * The result populates ALL eight color fields and both font fields whenever
 * possible, so promoting an imported HTML's styles to global actually
 * updates the full palette instead of a single color.
 */

export type ExtractedStyles = {
  colors?: {
    background?: string;
    surface?: string;
    border?: string;
    primary?: string;
    text?: string;
    accent?: string;
    textMuted?: string;
    secondary?: string;
  };
  fonts?: { heading?: string; body?: string };
};

type RGB = { r: number; g: number; b: number };
type ColorInfo = { color: string; count: number; rgb: RGB; luminance: number; saturation: number };

const NAMED_COLORS: Record<string, string> = {
  white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000', blue: '#0000ff',
  gray: '#808080', grey: '#808080', silver: '#c0c0c0', maroon: '#800000', yellow: '#ffff00',
  olive: '#808000', lime: '#00ff00', aqua: '#00ffff', cyan: '#00ffff', teal: '#008080',
  navy: '#000080', fuchsia: '#ff00ff', magenta: '#ff00ff', purple: '#800080',
  orange: '#ffa500', pink: '#ffc0cb', brown: '#a52a2a',
};

function normalizeColor(raw: string): string | null {
  const c = raw.trim().toLowerCase().replace(/\s+/g, '');
  if (c.startsWith('#')) {
    if (c.length === 4) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
    if (c.length === 7 || c.length === 9) return c.slice(0, 7);
  }
  if (c.startsWith('rgb')) {
    const m = c.match(/rgba?\(([-\d.]+),([-\d.]+),([-\d.]+)(?:,([-\d.%]+))?\)/);
    if (!m) return null;
    const r = Math.max(0, Math.min(255, Math.round(Number(m[1]))));
    const g = Math.max(0, Math.min(255, Math.round(Number(m[2]))));
    const b = Math.max(0, Math.min(255, Math.round(Number(m[3]))));
    return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  }
  if (c.startsWith('hsl')) {
    const m = c.match(/hsla?\(([-\d.]+)(?:deg)?,([-\d.]+)%,([-\d.]+)%/);
    if (!m) return null;
    return hslToHex(Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100);
  }
  if (NAMED_COLORS[c]) return NAMED_COLORS[c];
  return null;
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const v = l - a * Math.max(-1, Math.min(Math.min(k(n) - 3, 9 - k(n)), 1));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function toRgb(hex: string): RGB | null {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  return {
    r: parseInt(m[1].slice(0, 2), 16),
    g: parseInt(m[1].slice(2, 4), 16),
    b: parseInt(m[1].slice(4, 6), 16),
  };
}

function relativeLuminance({ r, g, b }: RGB): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function saturation({ r, g, b }: RGB): number {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

function collectCssText(doc: Document): string {
  const styleBlocks = Array.from(doc.querySelectorAll('style')).map(s => s.textContent || '');
  return styleBlocks.join('\n');
}

const COLOR_VALUE_RE = /#[0-9a-f]{3,8}\b|rgba?\([^()]*\)|hsla?\([^()]*\)|\b(?:white|black|red|green|blue|gray|grey|silver|maroon|yellow|olive|lime|aqua|cyan|teal|navy|fuchsia|magenta|purple|orange|pink|brown)\b/gi;

/**
 * Extract all color tokens from a CSS property value, including colors
 * nested inside linear-gradient / radial-gradient / conic-gradient stops.
 */
function extractColorsFromValue(value: string): string[] {
  if (!value) return [];
  // Our COLOR_VALUE_RE already picks up colors inside gradient parens
  // (hex and rgba both work), so a direct regex scan is sufficient.
  const matches = value.match(COLOR_VALUE_RE);
  return matches ? Array.from(matches) : [];
}

/**
 * Weight a declaration by property. Background properties matter most because
 * they define section visuals; color matters for typography; border / fill
 * are secondary signals.
 */
function declarationWeight(prop: string): number {
  const p = prop.toLowerCase();
  if (p === 'background' || p === 'background-color' || p === 'background-image') return 6;
  if (p === 'color') return 3;
  if (p === 'fill' || p === 'stroke') return 3;
  if (p.startsWith('border') && p.includes('color')) return 2;
  if (p === 'outline-color' || p === 'text-decoration-color') return 1;
  // Custom property holding a color value — worth moderate weight (design tokens)
  if (p.startsWith('--')) return 3;
  return 0; // unknown property, skip
}

/**
 * Weight a CSS selector by how "section-level" it looks. Section / hero /
 * CTA / footer / main / body selectors define the page's visual rhythm,
 * so their background colors should dominate the palette extraction.
 */
function selectorWeight(selector: string): number {
  const s = selector.toLowerCase();
  if (/(?:^|[\s,>+~])(?:body|html)(?:[\s,.:#[]|$)/.test(s)) return 5;
  if (/\b(?:section|\.section|\.hero|\.cta|\.banner|\.footer|\.site-footer|\.header|\.site-header|main|\[role="banner"]|\[role="contentinfo"])\b/.test(s)) return 4;
  if (/\b(?:\.bg-|\.background|article|aside|nav|\.navbar)\b/.test(s)) return 2;
  if (/\b(?:\.card|\.feature|\.block|\.container|\.wrapper|\.hero-|\.cta-)\b/.test(s)) return 2;
  return 1;
}

function collectColorFrequency(css: string, doc: Document): ColorInfo[] {
  const freq: Record<string, number> = {};
  const add = (raw: string, weight: number) => {
    if (weight <= 0) return;
    const norm = normalizeColor(raw);
    if (!norm) return;
    freq[norm] = (freq[norm] || 0) + weight;
  };

  // Parse CSS rule blocks — selector { declarations }
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(css)) !== null) {
    const selector = match[1].trim();
    if (!selector || selector.startsWith('@')) continue; // skip @media, @keyframes, etc.
    const sw = selectorWeight(selector);
    const body = match[2];

    // Walk declarations
    for (const decl of body.split(';')) {
      const colon = decl.indexOf(':');
      if (colon < 1) continue;
      const prop = decl.slice(0, colon).trim();
      const value = decl.slice(colon + 1).trim();
      const dw = declarationWeight(prop);
      if (dw === 0) continue;
      const w = sw * dw;
      for (const c of extractColorsFromValue(value)) add(c, w);
    }
  }

  // Process inline style="" attributes — section elements in the DOM get
  // the biggest boost because they almost always define visual bands.
  doc.querySelectorAll('[style]').forEach(el => {
    const tag = el.tagName.toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '').toLowerCase();
    const id = el.id?.toLowerCase() ?? '';
    const isBigBand =
      tag === 'section' || tag === 'main' || tag === 'body' || tag === 'header' || tag === 'footer' ||
      /\b(?:hero|cta|banner|footer|header|section)\b/.test(cls) ||
      /\b(?:hero|cta|banner|footer|header|section)\b/.test(id);
    const sw = isBigBand ? 6 : tag === 'div' || tag === 'article' ? 2 : 1;

    const styleStr = el.getAttribute('style') || '';
    for (const decl of styleStr.split(';')) {
      const colon = decl.indexOf(':');
      if (colon < 1) continue;
      const prop = decl.slice(0, colon).trim();
      const value = decl.slice(colon + 1).trim();
      const dw = declarationWeight(prop);
      if (dw === 0) continue;
      const w = sw * dw;
      for (const c of extractColorsFromValue(value)) add(c, w);
    }
  });

  const infos: ColorInfo[] = [];
  for (const [color, count] of Object.entries(freq)) {
    const rgb = toRgb(color);
    if (!rgb) continue;
    infos.push({
      color, count, rgb,
      luminance: relativeLuminance(rgb),
      saturation: saturation(rgb),
    });
  }
  // Sort by weighted score descending
  return infos.sort((a, b) => b.count - a.count);
}

function pickColors(infos: ColorInfo[]): NonNullable<ExtractedStyles['colors']> {
  if (infos.length === 0) return {};
  // Focus on colors that actually appear meaningfully (>= 1 use)
  const top = infos.slice(0, 30);

  // Background: lightest color in the most-frequent 8
  const freqTop = top.slice(0, 8);
  const background = [...freqTop].sort((a, b) => b.luminance - a.luminance)[0]?.color;

  // Text / primary: darkest color in the most-frequent 8
  const text = [...freqTop].sort((a, b) => a.luminance - b.luminance)[0]?.color;

  // Surface: a second light color (not the background)
  const lights = top
    .filter(c => c.luminance > 0.85 && c.color !== background)
    .sort((a, b) => b.count - a.count);
  const surface = lights[0]?.color;

  // Accent: most saturated distinct color in the top 20
  const accentCandidates = top
    .filter(c => c.saturation > 0.25 && c.color !== background && c.color !== text)
    .sort((a, b) => b.saturation * Math.log(b.count + 1) - a.saturation * Math.log(a.count + 1));
  const accent = accentCandidates[0]?.color;

  // Border: mid-luminance, low-saturation neutral
  const borders = top
    .filter(c => c.luminance > 0.55 && c.luminance < 0.95 && c.saturation < 0.2 && c.color !== background && c.color !== surface)
    .sort((a, b) => b.count - a.count);
  const border = borders[0]?.color;

  // Text muted: slightly darker neutral than border
  const muted = top
    .filter(c => c.luminance > 0.3 && c.luminance < 0.65 && c.saturation < 0.25 && c.color !== text)
    .sort((a, b) => b.count - a.count);
  const textMuted = muted[0]?.color || border;

  const colors: NonNullable<ExtractedStyles['colors']> = {};
  if (background) colors.background = background;
  if (surface) colors.surface = surface;
  if (border) colors.border = border;
  if (textMuted) colors.textMuted = textMuted;
  if (text) { colors.text = text; colors.primary = text; colors.secondary = text; }
  if (accent) colors.accent = accent;
  return colors;
}

function extractFonts(css: string, doc: Document): NonNullable<ExtractedStyles['fonts']> {
  const fontFamilyRe = /font-family\s*:\s*([^;}]+)/gi;
  const genericFallbacks = new Set([
    'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif',
    'ui-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong', 'inherit', 'initial', 'unset',
  ]);
  const firstToken = (decl: string): string | null => {
    const first = decl.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '').trim();
    if (!first) return null;
    if (genericFallbacks.has(first.toLowerCase())) return null;
    if (first.startsWith('var(')) return null;
    return first;
  };

  const freq: Record<string, number> = {};
  const headingFreq: Record<string, number> = {};
  const headingSelector = /(h[1-6]|heading|\.h[1-6])[^{]*\{([^}]*)\}/gi;
  const matches = Array.from(css.matchAll(fontFamilyRe));
  for (const m of matches) {
    const token = firstToken(m[1]);
    if (!token) continue;
    freq[token] = (freq[token] || 0) + 1;
  }
  // Heading-specific: walk blocks containing h1..h6 selectors
  for (const block of Array.from(css.matchAll(headingSelector))) {
    const inner = block[2] || '';
    const ff = inner.match(/font-family\s*:\s*([^;}]+)/i);
    if (!ff) continue;
    const token = firstToken(ff[1]);
    if (!token) continue;
    headingFreq[token] = (headingFreq[token] || 0) + 1;
  }

  // Last-ditch: inspect the rendered document's root to see what the browser
  // resolved body / h1 to, in case styles come from external sheets.
  if (Object.keys(freq).length === 0 && typeof window !== 'undefined' && doc.body) {
    try {
      const bodyFont = (doc.body.style.fontFamily || '').split(',')[0]?.trim().replace(/['"]/g, '');
      if (bodyFont && !genericFallbacks.has(bodyFont.toLowerCase())) freq[bodyFont] = 1;
    } catch {}
  }

  const sortedBody = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const sortedHeading = Object.entries(headingFreq).sort((a, b) => b[1] - a[1]);

  const body: string | undefined = sortedBody[0]?.[0];
  // Prefer a heading font that differs from body; fall back to second-most-common
  let heading: string | undefined = sortedHeading[0]?.[0];
  if (heading && heading === body) {
    heading = sortedHeading[1]?.[0] || sortedBody.find(([name]) => name !== body)?.[0];
  }
  if (!heading) heading = body;

  const fonts: NonNullable<ExtractedStyles['fonts']> = {};
  if (heading) fonts.heading = heading;
  if (body) fonts.body = body;
  return fonts;
}

export function extractStylesFromHtml(html: string): ExtractedStyles {
  if (typeof DOMParser === 'undefined') return {};
  const doc = new DOMParser().parseFromString(html, 'text/html');

  // Prefer existing Assembler CSS variables if present — this is one of our own exports.
  const combinedCss = collectCssText(doc);
  const findVar = (name: string): string | undefined => {
    const re = new RegExp(`--wp--preset--color--${name}\\s*:\\s*([^;}]+)`, 'i');
    const m = combinedCss.match(re);
    if (!m) return undefined;
    return normalizeColor(m[1]) || m[1].trim();
  };
  const t1 = findVar('theme-1'), t2 = findVar('theme-2'), t3 = findVar('theme-3'),
        t4 = findVar('theme-4'), t5 = findVar('theme-5');
  if (t1 && t4) {
    const colors: NonNullable<ExtractedStyles['colors']> = {};
    colors.background = t1;
    if (t2) colors.surface = t2;
    if (t3) { colors.border = t3; colors.textMuted = t3; }
    colors.primary = t4; colors.text = t4; colors.secondary = t4;
    if (t5) colors.accent = t5;
    return { colors, fonts: extractFonts(combinedCss, doc) };
  }

  // Frequency-based extraction for arbitrary HTML
  const colorInfos = collectColorFrequency(combinedCss, doc);
  const colors = pickColors(colorInfos);
  const fonts = extractFonts(combinedCss, doc);

  const result: ExtractedStyles = {};
  if (Object.keys(colors).length) result.colors = colors;
  if (Object.keys(fonts).length) result.fonts = fonts;
  return result;
}
