import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { buildGenerateSystemPrompt } from '@/lib/studio-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Claude sonnet can take 60-120s generating a full HTML page


export async function POST(req: Request) {
  // Auth — any signed-in user can use the generator
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in to use the AI generator' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const { style, pageName, pagePrompt, allPageNames, referenceHtml, isTemplatePart, templatePartKind, sections } = await req.json();
    const customHtmlBlocks = !!style?.customHtmlBlocks;

    if (!pageName || !pagePrompt) {
      return NextResponse.json({ error: 'Page name and prompt are required' }, { status: 400 });
    }

    const fonts = style?.fonts || { heading: 'Playfair Display', body: 'Source Sans 3' };
    const colors = style?.colors || {};

    // ─── Reference-rebuild prompt ────────────────────────────────────
    // When a reference HTML is present we use a completely different,
    // prompt that says "convert this HTML design into real Gutenberg
    // block markup" — preserving the visual design via wp:html escape
    // hatches while surfacing headings / paragraphs / buttons / images
    // as editable core blocks. The default GENERATE prompt
    // (which forces our base-CSS utility system) is deliberately NOT used
    // here because it would restructure the reference into our layout
    // primitives instead of preserving the uploaded design.
    const referenceMode = !!referenceHtml;

    const systemPrompt = referenceMode
      ? `You are converting a reference HTML design into valid WordPress Gutenberg block markup. The design must look nearly identical to the reference when rendered, but the output has to be REAL BLOCKS so WordPress imports it as editable content (not an HTML island).

OUTPUT FORMAT — exactly like the studio's other pages:

  Emit ONE top-level <!-- wp:group {"anchor":"section-<id>","align":"full",...} -->…<!-- /wp:group --> per visually distinct section / band in the reference. The sections are recovered from the reference's own structure — look at its <header>, <section>, <article>, hero/cta/feature divs, footer regions, etc. Give each a stable kebab-case anchor id based on the section's purpose: section-hero, section-features, section-testimonials, section-pricing, section-cta, section-footer-cta, etc. No <html>, no <body>, no <style> at the document level.

INSIDE EACH wp:group YOU HAVE TWO MODES — use them in combination:

  (a) **Core Gutenberg blocks** for content users will want to edit later:
      - <!-- wp:heading {"level":N,"fontSize":"x-large"} --> for H1–H6 headings
      - <!-- wp:paragraph --> for body copy
      - <!-- wp:buttons --> + <!-- wp:button {"backgroundColor":"theme-4","textColor":"theme-1"} --> for CTAs
      - <!-- wp:image --> for content images (not decorative layout images)
      - <!-- wp:list --> / <!-- wp:list-item --> for bullet lists
      - <!-- wp:quote --> for testimonials / pull quotes
      - <!-- wp:columns --> / <!-- wp:column --> for simple multi-col layouts
      - <!-- wp:woocommerce/product-collection --> for product grids

  ${customHtmlBlocks
    ? `(b) **<!-- wp:html --> escape hatches** for the bespoke design work core blocks can't express: custom CSS grids, SVG decoration, gradients, CSS animations, absolutely-positioned overlays, pseudo-element decorations, etc. Scope the CSS classes inside wp:html to that section only (e.g. envosta-hero__stack) so nothing leaks.`
    : `⚠️ CUSTOM HTML BLOCKS ARE DISABLED — do NOT emit any <!-- wp:html --> blocks under any circumstance. If the reference has bespoke design that core blocks can't express (custom grids, SVG overlays, pseudo-element decoration), simplify that section using core blocks + block attributes only. Dropping decorative complexity is ALWAYS preferable to an escape hatch.`}

The split: take the reference's TEXT CONTENT (headings, paragraphs, button labels, list items, quote text) and extract it into editable core blocks. Take the reference's VISUAL LAYOUT${customHtmlBlocks ? ' (the surrounding grid, decorative imagery, gradient bands, animations, custom type treatments) and wrap it in wp:html blocks' : ' (column count, alignments, spacing) and express it with wp:columns, wp:group layout attributes, and wp:cover'}.

THEME TOKENS — reference vars, never hardcode:

  Every color / background / border in your output MUST reference var(--wp--preset--color--theme-N) for N in 1..5 (mapping below). Every font-family MUST reference var(--wp--preset--font-family--heading|body). Gradient stops use the vars too. The reference's hex values map like this:

  - Lightest backgrounds in the reference → theme-1
  - Secondary soft backgrounds → theme-2
  - Borders / muted text → theme-3
  - Primary text / headings / primary buttons → theme-4
  - Deepest dark / strong accent → theme-5

  For attribute-style usage (on core blocks):
    "backgroundColor":"theme-2", "textColor":"theme-1", "fontFamily":"heading"

  For section-level gradient backgrounds, put them on the outer wp:group with style.color.gradient (CSS gradient string using the vars) AND add has-background to the wrapper div's class + inline background:… on the wrapper. Full-width sections need align:"full" and class alignfull so the gradient bleeds edge-to-edge.

STRUCTURE RULES:
1. Preserve the reference's section order, section count, and the purpose of each section. If the reference has hero → features → testimonials → CTA, your blocks do the same.
2. Preserve every piece of text verbatim. Headlines, subheads, paragraph copy, button labels, list items, form labels — exact.
3. Preserve the visual layout (columns, grids, alignments, image ratios, spacing rhythm) ${customHtmlBlocks ? 'using core blocks where possible, falling back to wp:html when they can\'t express the design' : 'using core blocks + wp:columns / wp:group layout attributes only (no wp:html available)'}.
4. Every external image URL → https://placehold.co/WIDTHxHEIGHT with alt text copied from the original.
5. ${isTemplatePart
    ? `This is a template part. Output ONE outer <!-- wp:group --> (anchor:"header-main" or "footer-main") containing the part's blocks. Do NOT wrap in <html>/<body>.`
    : `This is a CONTENT page. Do NOT emit a site header, primary navigation, logo bar, or site footer — those are separate template parts wrapped around the page. If the reference HAS a site header/footer, drop it (the reference was likely pre-stripped by the studio, but double-check).`}

FORBIDDEN:
- Plain HTML output without block comments — every piece of the page must be inside a <!-- wp:... --> block.
- <!doctype>, <html>, <head>, <body> — never emit these.
- Any hardcoded hex / rgb / hsl color, or hardcoded font-family name. The parent theme handles fonts, so never emit a Google Fonts <link>.${customHtmlBlocks ? '' : '\n- ANY <!-- wp:html --> block. None. Core blocks only.'}
- Paraphrasing or "improving" the reference's copy.
- Reordering or dropping sections.
- Markdown fences, explanations, comments outside block comments.

The goal: the rendered result is pixel-close to the reference AND imports into WordPress as REAL editable blocks — not an HTML blob.`
      : buildGenerateSystemPrompt({ customHtmlBlocks });

    const userMessage = referenceMode
      ? `ACTIVE GLOBAL STYLES — use these CSS variables in your block output. Don't hardcode hex.
Heading font: ${fonts.heading} → var(--wp--preset--font-family--heading)
Body font:    ${fonts.body}    → var(--wp--preset--font-family--body)
theme-1 (lightest / page bg):          ${colors.background || '#FFFFFF'}
theme-2 (soft / alternate bg):         ${colors.surface || '#EEEEEE'}
theme-3 (borders / muted text):        ${colors.border || colors.textMuted || '#BBBBBB'}
theme-4 (primary / heading / button):  ${colors.primary || colors.text || '#1E1E1E'}
theme-5 (deepest accent / dark CTA):   ${colors.accent || '#000000'}

${isTemplatePart
  ? `TEMPLATE PART: "${pageName}" (${templatePartKind || 'template-part'})`
  : `CONTENT PAGE: "${pageName}"`}

REFERENCE HTML TO CONVERT (the structure + content + visual design to preserve; output as Gutenberg block markup per the system rules):
${referenceHtml}`
      : `ACTIVE GLOBAL STYLES — the studio injects these at preview time as CSS variables. Your output MUST reference the variables (var(--wp--preset--color--theme-N), var(--wp--preset--font-family--heading|body)), never the raw values below. The values are listed here only so you can pick the closest variable for any given use case:

Site name: ${style?.siteName || 'Untitled'}
Heading font: ${fonts.heading}   → var(--wp--preset--font-family--heading)
Body font:    ${fonts.body}      → var(--wp--preset--font-family--body)

Theme-1 (page background, light):     ${colors.background || '#FFFFFF'}   → var(--wp--preset--color--theme-1)
Theme-2 (soft / alternate background): ${colors.surface || '#EEEEEE'}      → var(--wp--preset--color--theme-2)
Theme-3 (borders, muted text):         ${colors.border || colors.textMuted || '#BBBBBB'} → var(--wp--preset--color--theme-3)
Theme-4 (primary / heading / button):  ${colors.primary || colors.text || '#1E1E1E'}    → var(--wp--preset--color--theme-4)
Theme-5 (deepest accent, dark CTA):    ${colors.accent || '#000000'}        → var(--wp--preset--color--theme-5)

Border radius default: ${style?.borderRadius || '0'}  (use var(--envosta-radius))
Content max-width:     ${style?.maxWidth || '620px'}  (use var(--envosta-max-width))

Google Fonts <link> — emit this exact URL in <head> so both fonts load:
https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonts.heading).replace(/%20/g, '+')}:wght@400;500;600;700&family=${encodeURIComponent(fonts.body).replace(/%20/g, '+')}:wght@300;400;500;600;700&display=swap

Navigation pages (other pages on this site): ${(allPageNames || [pageName]).join(', ')}

${isTemplatePart
  ? `TEMPLATE PART TO GENERATE: "${pageName}" (${templatePartKind || 'template-part'})
Emit ONLY the template-part block markup — a single outer <!-- wp:group --> (or equivalent) containing everything needed for a ${templatePartKind === 'header' ? 'site header' : templatePartKind === 'footer' ? 'site footer' : 'template part'}. No <html>/<body>/<style>.`
  : `PAGE TO GENERATE: "${pageName}" (content page)
CONTENT PAGE RULES: do NOT include a site header, primary navigation, logo bar, or site footer — those are separate template parts wrapped around this page. Emit a sequence of block-level sections (each a <!-- wp:group --> or <!-- wp:cover -->) in order.`}

${Array.isArray(sections) && sections.length > 0 ? `SECTIONS — the studio has planned these for this page. Emit ONE top-level <!-- wp:group --> (or <!-- wp:cover --> for hero-style visual sections) per section, in this exact order. Each group's inner content fulfils the section's description. Alternate background slugs intentionally (no 3+ consecutive same bg).

${sections.map((s: any, i: number) => `${i + 1}. id:"${s.id}" — ${s.title}\n   ${s.description || ''}`).join('\n\n')}

To make section boundaries recoverable, add a data-section-id attribute on the outer block's wrapper div (via the block's "anchor" attribute, e.g. \`<!-- wp:group {"anchor":"section-${sections[0]?.id}", ...} -->\`). The "anchor" attribute emits as an id on the div and lets the studio target sections for per-section edits later.` : ''}

DESCRIPTION: ${pagePrompt}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        // Reference rebuilds convert input HTML into block markup — output
        // is usually similar in size to input (sometimes larger because of
        // block comments). 24k gives headroom for bigger pages.
        max_tokens: referenceMode ? 24000 : 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Claude API error:', res.status, errBody);
      // Parse error for user-friendly message
      let detail = `AI error: ${res.status}`;
      try {
        const parsed = JSON.parse(errBody);
        detail = parsed?.error?.message || detail;
      } catch {}
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const data = await res.json();
    let html = data?.content?.[0]?.text ?? '';

    // Strip markdown code fences if Claude wraps output despite instructions
    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

    return NextResponse.json({ html });
  } catch (e: any) {
    console.error('Studio generate error:', e);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
