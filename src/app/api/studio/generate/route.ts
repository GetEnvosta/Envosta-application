import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { checkAiTokenBudget } from '@/lib/ai-budget';
import { GENERATE_SYSTEM_PROMPT } from '@/lib/studio-prompts';

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
    // Check AI token budget before calling Claude
    const budget = await checkAiTokenBudget(user.id);
    if (!budget.allowed) {
      return NextResponse.json({
        error: `AI token limit reached. Used ${budget.dailyUsed.toLocaleString()} of ${budget.dailyLimit?.toLocaleString()} tokens today. Increase your limit in site settings.`,
      }, { status: 429 });
    }

    const { style, pageName, pagePrompt, allPageNames, referenceHtml, isTemplatePart, templatePartKind } = await req.json();

    if (!pageName || !pagePrompt) {
      return NextResponse.json({ error: 'Page name and prompt are required' }, { status: 400 });
    }

    const fonts = style?.fonts || { heading: 'Playfair Display', body: 'Source Sans 3' };
    const colors = style?.colors || {};

    // ─── Reference-rebuild prompt ────────────────────────────────────
    // When a reference HTML is present we use a completely different,
    // strict preservation prompt that says "emit the reference almost
    // verbatim, only swap specific values." The default GENERATE prompt
    // (which forces our base-CSS utility system) is deliberately NOT used
    // here because it would restructure the reference into our layout
    // primitives instead of preserving the uploaded design.
    const referenceMode = !!referenceHtml;

    const systemPrompt = referenceMode
      ? `You are a faithful HTML transformer. The user has provided a reference HTML page. Your job is to OUTPUT THAT HTML ALMOST VERBATIM, changing ONLY what's listed below. You are NOT designing — you are doing a structured find-and-replace.

STRICT PRESERVATION — you MUST keep ALL of the following identical to the reference:
- Every HTML tag, in the same order, with the same attributes (id, class, data-*, role, aria-*, href/src behaviour, etc.)
- Every section, <div>, <article>, <section>, <header>, <footer>, list, grid, and table — in the same nesting.
- All text content: every heading, paragraph, list item, button label, form label, caption, quote, tooltip — VERBATIM. Do not paraphrase, shorten, or "improve" copy.
- All CSS rules for layout (display, grid-template, flex, position, margin, padding, width, height, gap, align-*, justify-*, transform, border-radius, box-shadow, transition, animation, overflow, z-index, etc.) — keep them EXACTLY.
- All media queries and responsive logic.
- All inline styles except where a specific swap below applies.

ALLOWED CHANGES — these are the ONLY modifications you may make:
1. Every hex / rgb / rgba / hsl / hsla / named color value → replace with the closest matching CSS variable:
    - Lightest background colors → var(--wp--preset--color--theme-1)
    - Secondary light / soft backgrounds → var(--wp--preset--color--theme-2)
    - Borders, muted text, dividers → var(--wp--preset--color--theme-3)
    - Primary text, dark backgrounds, heading color, primary buttons → var(--wp--preset--color--theme-4)
    - Deepest dark / footer / strongest accent → var(--wp--preset--color--theme-5)
    - Gradient stops: replace EACH stop color with its closest variable. Keep the gradient syntax intact.
2. Every font-family declaration (except generic fallbacks like sans-serif / serif / monospace):
    - Headings / h1..h6 / display type → var(--wp--preset--font-family--heading)
    - Body / paragraph / nav / everything else → var(--wp--preset--font-family--body)
    - Update the Google Fonts <link> if present to load the fonts named in the GLOBAL STYLE REFERENCE below (use those family names in the href query).
3. Every external image / video asset URL that is NOT already placehold.co → replace the src with an equivalent-dimension https://placehold.co/WIDTHxHEIGHT placeholder. Keep alt text identical.
4. ${isTemplatePart
    ? `This is a template part. Output only the <${templatePartKind || 'section'}>…</${templatePartKind || 'section'}> fragment (plus any supporting <style> block). Do NOT wrap in <html>/<head>/<body>.`
    : `This is a content page. If the reference already has a <html>/<head>/<body> shell, keep it. Keep its <style> blocks but inside those blocks apply the color/font swaps above.`}

FORBIDDEN:
- Do NOT add or remove sections.
- Do NOT re-order sections.
- Do NOT rename classes or IDs.
- Do NOT replace the reference's CSS with your own base stylesheet.
- Do NOT restructure layouts or "improve" them.
- Do NOT change the copy, even if it's placeholder/Lorem Ipsum.
- Do NOT emit explanations, markdown, or code fences. Output raw HTML only.

The goal: the rendered result should be pixel-close to the reference, just with the color and font tokens swapped to CSS variables so it stays reactive to the user's global styles.`
      : GENERATE_SYSTEM_PROMPT;

    const userMessage = referenceMode
      ? `GLOBAL STYLE REFERENCE (for mapping + Google Fonts <link>):
Heading Font: ${fonts.heading}
Body Font: ${fonts.body}
Color mapping hints (closest hex → theme slot):
  theme-1 (lightest / bg): ${colors.background || '#FFFFFF'}
  theme-2 (soft bg): ${colors.surface || '#EEEEEE'}
  theme-3 (border / muted): ${colors.border || colors.textMuted || '#BBBBBB'}
  theme-4 (primary / text / heading / button): ${colors.primary || colors.text || '#1E1E1E'}
  theme-5 (deepest / accent): ${colors.accent || '#000000'}

${isTemplatePart
  ? `TEMPLATE PART: "${pageName}" (${templatePartKind || 'template-part'})`
  : `CONTENT PAGE: "${pageName}"`}

REFERENCE HTML (transform this in-place — preserve structure, swap only the allowed values):
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
Generate ONLY the ${templatePartKind === 'header' ? 'site header (nav bar, logo area, primary navigation)' : templatePartKind === 'footer' ? 'site footer (footer links, copyright, social, etc.)' : 'template part'} markup.
Do NOT wrap it in a full <html>/<body> document — output just the <header>…</header> or <footer>…</footer> block (with any supporting <style> tag) so it can be injected into multiple pages.`
  : `PAGE TO GENERATE: "${pageName}" (content page)
IMPORTANT: This is a CONTENT page only. Do NOT include the site header, primary navigation, logo bar, or footer — those are separate template parts that will be composited around this page.`}
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
        // Reference rebuilds are essentially verbatim output + replacements,
        // so the output size ≈ input size. Bump to 24k to avoid mid-page truncation.
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
    const inputTokens = data?.usage?.input_tokens ?? 0;
    const outputTokens = data?.usage?.output_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;

    // Strip markdown code fences if Claude wraps output despite instructions
    html = html.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

    // Log AI usage and deduct credits
    try {
      const { data: pricingRow } = await supabase.from('products')
        .select('metadata')
        .eq('type', 'credit_rate')
        .eq('slug', 'ai_tokens-per_1k_tokens')
        .maybeSingle();
      const rate = Number((pricingRow?.metadata as any)?.credits_per_unit ?? 0.5);
      const creditsCharged = Math.round((totalTokens / 1000) * rate * 10000) / 10000;

      await supabase.from('logs').insert({
        user_id: user.id,
        action: 'ai.usage',
        details: `generate_page: ${totalTokens} tokens`,
        level: 'info',
        metadata: { ai_action: 'generate_page', input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens, credits_charged: creditsCharged, model: 'claude-sonnet-4-20250514' },
      });

      // Deduct from the staff user's account (or could be a project customer)
      if (creditsCharged > 0) {
        await supabase.rpc('fn_deduct_credits', {
          p_user_id: user.id,
          p_amount: Math.ceil(creditsCharged),
          p_service_type: 'ai_tokens',
          p_description: `Studio page generation: ${totalTokens} tokens`,
          p_reference_id: null,
        });
      }
    } catch (logErr) {
      console.error('AI usage log error (non-fatal):', logErr);
    }

    return NextResponse.json({ html });
  } catch (e: any) {
    console.error('Studio generate error:', e);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
