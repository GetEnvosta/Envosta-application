/**
 * Best-effort extraction of colors and fonts from an HTML page.
 * Used by the studio to promote a page's styles to global styles.
 *
 * Strategy (browser-only — uses DOMParser):
 *   1. Concatenate all <style> block contents
 *   2. Look for Assembler-style CSS variables (--wp--preset--color--theme-1..5)
 *   3. Fall back to heuristics on h1..h6 / body rules for fonts
 *   4. Fall back to the first font-family declaration anywhere
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

export function extractStylesFromHtml(html: string): ExtractedStyles {
  if (typeof DOMParser === 'undefined') return {};
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const styleText = Array.from(doc.querySelectorAll('style'))
    .map(s => s.textContent || '')
    .join('\n');

  // Also pull values from the first inline <body style="..."> if present
  const bodyInline = doc.body?.getAttribute('style') || '';

  const findCssVar = (name: string): string | undefined => {
    const re = new RegExp(`--wp--preset--color--${name}\\s*:\\s*([^;}]+)`, 'i');
    const m = styleText.match(re);
    return m?.[1]?.trim();
  };

  const colors: ExtractedStyles['colors'] = {};
  const t1 = findCssVar('theme-1'); if (t1) colors.background = t1;
  const t2 = findCssVar('theme-2'); if (t2) colors.surface = t2;
  const t3 = findCssVar('theme-3'); if (t3) { colors.border = t3; colors.textMuted = t3; }
  const t4 = findCssVar('theme-4'); if (t4) { colors.primary = t4; colors.text = t4; colors.secondary = t4; }
  const t5 = findCssVar('theme-5'); if (t5) colors.accent = t5;

  // Fallback: body background / text colors
  if (!colors.background) {
    const bgMatch = styleText.match(/body[^{]*\{[^}]*background(?:-color)?\s*:\s*([^;}]+)/i)
      || bodyInline.match(/background(?:-color)?\s*:\s*([^;]+)/i);
    if (bgMatch) colors.background = bgMatch[1].trim();
  }
  if (!colors.text) {
    const textMatch = styleText.match(/body[^{]*\{[^}]*(?<!-)color\s*:\s*([^;}]+)/i);
    if (textMatch) colors.text = textMatch[1].trim();
  }

  // Font extraction
  const fonts: ExtractedStyles['fonts'] = {};
  const headingRe = /(?:h[1-6]|\.heading|h[1-6]\s*,)[^{]*\{[^}]*font-family\s*:\s*([^;}]+)/i;
  const bodyRe = /body[^{]*\{[^}]*font-family\s*:\s*([^;}]+)/i;
  const anyRe = /font-family\s*:\s*([^;}]+)/i;

  const firstFont = (s: string) =>
    s.split(',')[0].trim().replace(/^['"]|['"]$/g, '').trim();

  const headingMatch = styleText.match(headingRe);
  if (headingMatch) fonts.heading = firstFont(headingMatch[1]);
  const bodyMatch = styleText.match(bodyRe);
  if (bodyMatch) fonts.body = firstFont(bodyMatch[1]);
  if (!fonts.heading && !fonts.body) {
    const any = styleText.match(anyRe);
    if (any) {
      const f = firstFont(any[1]);
      fonts.heading = f;
      fonts.body = f;
    }
  }

  const result: ExtractedStyles = {};
  if (colors && Object.keys(colors).length) result.colors = colors;
  if (fonts && Object.keys(fonts).length) result.fonts = fonts;
  return result;
}
