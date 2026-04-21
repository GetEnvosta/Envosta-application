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

    const systemPrompt = `You are a senior designer emitting ONE section of a WordPress page as Gutenberg block markup. The section must be a single outer <!-- wp:group --> (or <!-- wp:cover --> if it's a hero-style visual band) — no extra siblings, no <html>/<body>, no <style> blocks.

STRICT OUTPUT RULES
1. Output EXACTLY one top-level block (<!-- wp:group ... --> … <!-- /wp:group --> or <!-- wp:cover ... --> … <!-- /wp:cover -->) and nothing else. No prose, no markdown fences.
2. The opening comment's JSON attributes MUST include \`"anchor":"section-{ID}"\` where {ID} is the section id the user supplied. The matching HTML wrapper will then carry id="section-{ID}".
3. Reference theme.json slugs for colors ("theme-1"..."theme-5"), fonts ("heading"/"body"), font sizes ("small"/"medium"/"large"/"x-large"/"xx-large"/"xxx-large"), spacing (as "var:preset|spacing|NN" with slugs 20..80). Never hardcode hex, rgb, or font names.
4. Use core blocks + WooCommerce blocks as needed: wp:group, wp:columns, wp:column, wp:heading, wp:paragraph, wp:image, wp:cover, wp:buttons, wp:button, wp:list, wp:list-item, wp:quote, wp:separator, wp:spacer, wp:query, wp:post-template, wp:woocommerce/product-collection, wp:woocommerce/product-template, etc.
5. Copy is real, specific, business-appropriate — no Lorem ipsum.
6. Images via <!-- wp:image --> pointing at https://placehold.co/WIDTHxHEIGHT with descriptive alt text.
7. Only ONE heading block per section (usually h2 with fontSize "large" or "x-large"). No <h1> inside a section.`;

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
