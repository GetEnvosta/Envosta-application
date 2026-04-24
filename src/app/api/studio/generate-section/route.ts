import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/studio/generate-section
 *
 * Regenerate ONE section of a page — returns a single top-level
 * <!-- wp:group --> (or <!-- wp:cover -->) block with the requested anchor.
 *
 * Request body:
 *   {
 *     style: styleConfig,
 *     pageName: string,
 *     pageContext?: string,        // short summary of what the page is about
 *     allSections: Array<{ id, title, description }>,  // whole plan for context
 *     section: { id, title, description },              // the one to (re)generate
 *     extraPrompt?: string,        // user instructions (e.g. "make it darker")
 *   }
 *
 * Response: { html: string }
 */
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const { style, pageName, pageContext, allSections, section, extraPrompt } = await req.json();
    const customHtmlBlocks = !!style?.customHtmlBlocks;

    if (!section?.id || !section?.title) {
      return NextResponse.json({ error: 'section { id, title } is required' }, { status: 400 });
    }

    const fonts = style?.fonts || { heading: 'Inter', body: 'Inter' };
    const colors = style?.colors || {};

    const planLines = Array.isArray(allSections) && allSections.length > 0
      ? allSections.map((s: any, i: number) => `  ${i + 1}. ${s.id === section.id ? '▸ ' : '  '}${s.title}${s.description ? ' — ' + s.description : ''}`).join('\n')
      : '';

    const systemPrompt = `You are a senior WordPress Gutenberg designer (re)building ONE section of a page. Your primary goal is to match the desired design using NATIVE core Gutenberg blocks + WooCommerce blocks as faithfully as possible — because native blocks are editable in the block editor, theme-friendly, and preview accurately.${customHtmlBlocks
      ? `

CUSTOM HTML BLOCKS are available in this generation, but ONLY as a last resort. Before reaching for <!-- wp:html -->, check whether the design can be expressed with:
  • wp:group layout attributes (flex, constrained, justifyContent, verticalAlignment, orientation)
  • wp:columns + per-column widths + verticalAlignment
  • wp:cover (overlay opacity, aligned inner content)
  • wp:media-text (mediaPosition, verticalAlignment, stacked-on-mobile)
  • wp:group + wp:spacer + wp:separator for decorative rhythm
  • block attributes (backgroundColor, textColor, fontFamily, fontSize, style.spacing, style.color.gradient, align, className)
If it can, use them — that's the standard. wp:html is reserved for visuals core blocks genuinely can't do: pseudo-element decorations, complex SVG overlays, CSS clip-paths, mix-blend-mode effects. Keep the wp:html fragment as small as possible — wrap only the one irreducible element, keep everything else native.`
      : `

⚠️ CUSTOM HTML BLOCKS ARE DISABLED — use ONLY core Gutenberg + WooCommerce blocks. Do NOT emit any <!-- wp:html --> block. Style everything via block attributes. If a design detail can't be expressed natively, simplify it.`}

STRUCTURE — this is the only hard constraint:

Output EXACTLY one top-level <!-- wp:group {"anchor":"section-{ID}","align":"full",...} -->…<!-- /wp:group --> block (using the id the user supplied). Nothing outside the group. Sections are full-width bands, so the outer group MUST include \`"align":"full"\` with class \`alignfull\` on the wrapper div so any background (solid color OR gradient) stretches edge-to-edge.

LAYOUT + ALIGNMENT RECIPE (single constrained+full group pattern):

  One wp:group with BOTH align:"full" AND layout:{type:"constrained"} →
  background bleeds edge-to-edge AND inner blocks auto-wrap at content-width
  (Gutenberg's "Inner blocks use content width"). The wrapper div gets
  classes "alignfull is-layout-constrained" plus any has-…-background-color,
  has-…-color, has-background, has-…-font-family / font-size that match the
  attributes. Padding (top/bottom via style.spacing.padding with
  var:preset|spacing|NN slugs) goes on this same group.

  Inside the section pick one of:
    • horizontal row  → wp:group layout:{type:"flex",justifyContent:"center",verticalAlignment:"center",flexWrap:"wrap"}
    • vertical stack  → wp:group layout:{type:"flex",orientation:"vertical",justifyContent:"center"}
    • column grid     → wp:columns with verticalAlignment + per-column widths
    • media + text    → wp:media-text with mediaPosition + verticalAlignment
  Centered headings / paragraphs / buttons set textAlign/align on the block
  AND the wrapper has class has-text-align-center. Flex groups must have
  matching classes: is-content-justification-{left|center|right|space-between},
  is-vertical-alignment-{top|center|bottom}, is-vertical-orientation.
  Inner blocks with align:"wide" break out to wideSize; align:"full" breaks
  to the viewport edge. Plain inner blocks stay at contentSize.

BACKGROUND RULE: section backgrounds ALWAYS live on the outer section wp:group (the one with anchor + align:"full"). Never on a nested group, never on a child wp:html.

SOLID: JSON attribute backgroundColor:"theme-N" + class has-theme-N-background-color has-background on the wrapper div. No inline background needed.

GRADIENT — the three-place contract (all three must match or WordPress drops the gradient):
  1. JSON attribute:  style.color.gradient = "<full CSS gradient string>"
  2. Class list on wrapper div:  has-background  (NOT has-theme-N-background-color)
  3. Inline style on wrapper div:  background:<same CSS gradient string>  (preserve other inline styles in the same attribute)

Template to copy exactly, substituting your gradient:

  <!-- wp:group {"anchor":"section-{ID}","align":"full","style":{"color":{"gradient":"linear-gradient(135deg,var(--wp--preset--color--theme-4) 0%,var(--wp--preset--color--theme-5) 100%)"},"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}}},"textColor":"theme-1","layout":{"type":"constrained"}} -->
  <div id="section-{ID}"
       class="wp-block-group alignfull has-theme-1-color has-text-color has-background is-layout-constrained"
       style="background:linear-gradient(135deg,var(--wp--preset--color--theme-4) 0%,var(--wp--preset--color--theme-5) 100%);color:var(--wp--preset--color--theme-1);padding-top:var(--wp--preset--spacing--80);padding-bottom:var(--wp--preset--spacing--80)">

The gradient string in \`style.color.gradient\` (JSON) and the one in \`style="background:…"\` (div) must be character-identical. Gradient stops reference var(--wp--preset--color--theme-N) — no hex. Solid + gradient are mutually exclusive; pick one.

Available native blocks — use them fluently:

  Layout / grouping: wp:group (layout.type: "constrained" | "flex" | "default"), wp:columns + wp:column (with verticalAlignment + widths), wp:cover (background image + overlay + inner content), wp:media-text (mediaPosition, verticalAlignment, is-stacked-on-mobile)
  Typography: wp:heading (level, textAlign, fontSize, fontFamily), wp:paragraph (align, fontSize, textColor, dropCap)
  CTAs: wp:buttons (layout.justifyContent) + wp:button (backgroundColor, textColor, width, className)
  Media: wp:image (sizeSlug, aspectRatio, align, linkDestination), wp:gallery (columns, imageCrop), wp:video, wp:embed
  Content rhythm: wp:separator (backgroundColor, opacity), wp:spacer (height), wp:quote (value, citation), wp:list + wp:list-item (ordered, reversed)
  Navigation + site: wp:navigation, wp:site-title, wp:site-logo, wp:search
  Post / query templates: wp:post-title, wp:post-content, wp:post-featured-image, wp:post-date, wp:post-author-name, wp:post-terms, wp:post-excerpt, wp:post-template, wp:query (with inherit, perPage, offset, orderBy), wp:query-pagination + wp:query-pagination-{previous,numbers,next}, wp:query-no-results, wp:query-title, wp:comments
  Template parts: wp:template-part
  WooCommerce: wp:woocommerce/product-collection (+ wp:woocommerce/product-template), wp:woocommerce/cart, wp:woocommerce/checkout, wp:woocommerce/customer-account, wp:woocommerce/single-product, wp:woocommerce/product-image-gallery, wp:woocommerce/product-details, wp:woocommerce/add-to-cart-form, wp:woocommerce/product-meta, wp:woocommerce/product-price, wp:woocommerce/product-rating, wp:woocommerce/mini-cart, wp:woocommerce/featured-product, wp:woocommerce/all-reviews, wp:woocommerce/related-products

Design fluency with these should be your first answer to every visual requirement — think about how a skilled Gutenberg builder would compose the section before touching anything else.${customHtmlBlocks ? '\n\nwp:html is still available for the one-off cases these blocks can\'t express (pseudo-element decoration, SVG overlays, clip-paths, mix-blend-mode). Keep wp:html fragments as small as possible — wrap only the irreducible element, everything else native.' : ''}

THEME TOKENS — USE VARIABLES EVERYWHERE (no hardcoded hex / font names):
  var(--wp--preset--color--theme-1)  light bg
  var(--wp--preset--color--theme-2)  soft bg / card
  var(--wp--preset--color--theme-3)  border / muted text
  var(--wp--preset--color--theme-4)  primary text / heading / button
  var(--wp--preset--color--theme-5)  deepest accent / dark CTA
  var(--wp--preset--font-family--heading|body)
  var(--wp--preset--font-size--small|medium|large|x-large|xx-large|xxx-large)
  var(--wp--preset--spacing--20..80) → 10,20,30,40,50,60,70px

For core-block attributes use slugs: "backgroundColor":"theme-2", "textColor":"theme-1", "fontFamily":"heading", "fontSize":"x-large", spacing as "var:preset|spacing|NN".

RULES
1. Output EXACTLY one outer wp:group with anchor="section-{ID}". No siblings, no markdown fences, no prose.
2. Real copy — no Lorem ipsum. Match the business / industry.
3. placehold.co for all images with realistic dimensions and alt text.
4. No <h1> inside a section — that's reserved for the page title. Use h2 / h3.
5. No JavaScript. CSS transitions and keyframes are fine.
6. Scope any custom CSS class names so they don't collide (e.g. envosta-{section}__{element}).
${customHtmlBlocks
  ? '7. CUSTOM HTML BLOCKS: ON — you may use <!-- wp:html --> for bespoke design inside this section. Use sparingly when core blocks can\'t express the design.'
  : '7. CUSTOM HTML BLOCKS: OFF — do NOT emit any <!-- wp:html --> blocks. Use ONLY core Gutenberg blocks + WooCommerce blocks. Style everything via block attributes (backgroundColor, textColor, fontFamily, fontSize, style.spacing, style.color.gradient, align, etc.) so the result is fully editable in Gutenberg.'}`;

    const userMessage = `GLOBAL STYLE REFERENCE (all via theme.json vars — never hardcode):
Heading font slug: "heading" (currently loads ${fonts.heading})
Body font slug: "body" (currently loads ${fonts.body})
theme-1 bg: ${colors.background || '#FFFFFF'}
theme-2 soft: ${colors.surface || '#EEEEEE'}
theme-3 muted: ${colors.border || '#BBBBBB'}
theme-4 primary: ${colors.primary || '#1E1E1E'}
theme-5 accent: ${colors.accent || '#000000'}

PAGE: "${pageName}"${pageContext ? `
Page context: ${pageContext}` : ''}

FULL SECTION PLAN for this page (▸ marks the one to generate, others are for context so you don't duplicate them):
${planLines}

═══ GENERATE THIS SECTION ═══
id: ${section.id}      (use anchor "section-${section.id}")
title: ${section.title}
description: ${section.description || '(no extra description)'}
${extraPrompt ? `\nUser instructions: ${extraPrompt}` : ''}

Output the single outer block for this section now. Remember: anchor="section-${section.id}" on the opening comment's JSON.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('generate-section error:', res.status, errBody);
      let detail = `AI error: ${res.status}`;
      try { detail = JSON.parse(errBody)?.error?.message || detail; } catch {}
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const data = await res.json();
    let html = String(data?.content?.[0]?.text ?? '').trim();
    // Strip any stray markdown fences the model may wrap around the output.
    html = html.replace(/^```(?:html|xml)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    // Log AI usage (non-fatal) so the budget tracker keeps ticking.
    try {
      const inputTokens = data?.usage?.input_tokens ?? 0;
      const outputTokens = data?.usage?.output_tokens ?? 0;
      const total = inputTokens + outputTokens;
      await supabase.from('logs').insert({
        user_id: user.id,
        action: 'ai.usage',
        details: `studio_generate_section: ${section.id} (${total} tokens)`,
        level: 'info',
        metadata: {
          ai_action: 'studio_generate_section',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: total,
          model: 'claude-sonnet-4-20250514',
        },
      });
    } catch {}

    return NextResponse.json({ html });
  } catch (e: any) {
    console.error('generate-section fatal:', e);
    return NextResponse.json({ error: 'Failed to generate section' }, { status: 500 });
  }
}
