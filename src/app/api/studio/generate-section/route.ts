import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { checkAiTokenBudget } from '@/lib/ai-budget';

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
    const budget = await checkAiTokenBudget(user.id);
    if (!budget.allowed) {
      return NextResponse.json({
        error: `AI token limit reached. Used ${budget.dailyUsed.toLocaleString()} of ${budget.dailyLimit?.toLocaleString()} tokens today.`,
      }, { status: 429 });
    }

    const { style, pageName, pageContext, allSections, section, extraPrompt } = await req.json();

    if (!section?.id || !section?.title) {
      return NextResponse.json({ error: 'section { id, title } is required' }, { status: 400 });
    }

    const fonts = style?.fonts || { heading: 'Inter', body: 'Inter' };
    const colors = style?.colors || {};

    const planLines = Array.isArray(allSections) && allSections.length > 0
      ? allSections.map((s: any, i: number) => `  ${i + 1}. ${s.id === section.id ? '▸ ' : '  '}${s.title}${s.description ? ' — ' + s.description : ''}`).join('\n')
      : '';

    const systemPrompt = `You are a world-class designer shipping ONE section of a WordPress page. Design with full creative freedom — custom grids, bold typography, gradients, decorative SVG, CSS animations, anything that makes this section feel bespoke.

STRUCTURE — this is the only hard constraint:

Output EXACTLY one top-level <!-- wp:group {"anchor":"section-{ID}","align":"full",...} -->…<!-- /wp:group --> block (using the id the user supplied). Nothing outside the group. Sections are full-width bands, so the outer group MUST include \`"align":"full"\` with class \`alignfull\` on the wrapper div so any background (solid color OR gradient) stretches edge-to-edge.

BACKGROUND RULE: gradients and solid colors ALWAYS live on the outer wp:group, never on an inner wp:html box. For gradient bands, set style.color.gradient with a real CSS gradient string referencing CSS vars, and add \`has-background\` to the wrapper div. Example:

  <!-- wp:group {"anchor":"section-{ID}","align":"full","style":{"color":{"gradient":"linear-gradient(135deg,var(--wp--preset--color--theme-4) 0%,var(--wp--preset--color--theme-5) 100%)"},"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}}},"textColor":"theme-1","layout":{"type":"constrained"}} -->
  <div id="section-{ID}" class="wp-block-group alignfull has-theme-1-color has-text-color has-background" style="background:linear-gradient(135deg,var(--wp--preset--color--theme-4) 0%,var(--wp--preset--color--theme-5) 100%);color:var(--wp--preset--color--theme-1);padding-top:var(--wp--preset--spacing--80);padding-bottom:var(--wp--preset--spacing--80)">

Inside the group you have total freedom:

  (a) Mix core Gutenberg blocks (wp:heading, wp:paragraph, wp:buttons, wp:columns, wp:image, wp:cover, wp:list, wp:quote, wp:query, wp:woocommerce/product-collection, etc.) for content users may want to edit in the block editor.
  (b) Use <!-- wp:html --> blocks with any HTML + inline <style> for rich design. Custom layouts, SVG, gradients, animations — all go here. HTML blocks are fully editable in WP as a single Custom HTML block.

Mix both as the design calls for. Hero sections, visual bands, decorative components typically use wp:html. Simple text rows can use core blocks.

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
6. Scope any custom CSS class names so they don't collide (e.g. envosta-{section}__{element}).`;

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
