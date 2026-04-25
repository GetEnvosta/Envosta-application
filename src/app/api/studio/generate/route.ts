import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { buildGenerateSystemPrompt, buildReferenceRebuildSystemPrompt } from '@/lib/studio-prompts';

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

    // When a reference HTML is uploaded we use a different prompt strategy:
    // convert the HTML into real Gutenberg block markup (preserving copy +
    // visual design) instead of designing-from-brief. Both prompts honor the
    // customHtmlBlocks toggle.
    const referenceMode = !!referenceHtml;
    const systemPrompt = referenceMode
      ? buildReferenceRebuildSystemPrompt({ customHtmlBlocks, isTemplatePart })
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
