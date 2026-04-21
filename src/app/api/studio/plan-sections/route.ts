import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { checkAiTokenBudget } from '@/lib/ai-budget';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/studio/plan-sections
 *
 * Given the full site context and a target page, returns an ordered list of
 * sections that page should contain. Used on first generation to seed the
 * page's sections[] before the studio calls /api/studio/generate to emit
 * the actual block markup.
 *
 * Request body:
 *   {
 *     brief: string,
 *     businessInfo?: { businessName, industry, ... },
 *     pageName: string,               // e.g. "Home"
 *     pagePrompt?: string,            // any per-page override the user set
 *     allPageNames: string[],         // other pages on the site
 *     woocommerce?: boolean,
 *     blog?: boolean,
 *     isTemplatePart?: boolean,
 *   }
 *
 * Response:
 *   { sections: [{ id, title, description }] }
 */
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const budget = await checkAiTokenBudget(user.id);
  if (!budget.allowed) {
    return NextResponse.json({
      error: `AI token limit reached. Used ${budget.dailyUsed.toLocaleString()} of ${budget.dailyLimit?.toLocaleString()} tokens today.`,
    }, { status: 429 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const {
      brief, businessInfo, pageName, pagePrompt, allPageNames,
      woocommerce, blog, isTemplatePart,
    } = await req.json();

    if (!pageName) return NextResponse.json({ error: 'pageName is required' }, { status: 400 });

    const bizLines: string[] = [];
    if (businessInfo?.businessName) bizLines.push(`Business name: ${businessInfo.businessName}`);
    if (businessInfo?.industry) bizLines.push(`Industry: ${businessInfo.industry}`);
    if (businessInfo?.tagline) bizLines.push(`Tagline: ${businessInfo.tagline}`);
    if (businessInfo?.targetAudience) bizLines.push(`Target audience: ${businessInfo.targetAudience}`);

    const userMsg = `You are planning the sections of a single page on a WordPress site. Think about the whole site first, then design this page so its sections don't overlap with other pages and collectively tell the brand's story.

═══ SITE CONTEXT ═══
Brief: ${brief || '(none provided)'}
${bizLines.join('\n')}
WooCommerce store: ${woocommerce ? 'yes' : 'no'}
Blog: ${blog ? 'yes' : 'no'}
Pages on this site (in site order): ${(allPageNames || [pageName]).join(', ')}

═══ PAGE TO PLAN ═══
Page name: "${pageName}"
${isTemplatePart ? 'This is a TEMPLATE PART (header or footer), not a content page.' : 'This is a CONTENT page.'}
${pagePrompt ? `Per-page instructions from the user:\n${pagePrompt}` : ''}

═══ YOUR JOB ═══
Return an ordered JSON array of sections for THIS page only. Each section is one logical band in the page layout (hero, social proof, services grid, testimonials, FAQ, final CTA, etc.).

Guidelines:
- 4–9 sections for a typical content page; 2–3 for template parts.
- Match the page's role: don't duplicate what another page on the site will cover.
- End content pages with a strong CTA section.
- For WooCommerce pages: include blocks that leverage Product Collection / Cart / Checkout / My Account / Single Product where relevant.
- For the Blog archive: include a Query Loop section.
- Each section gets a short, punchy title and a 1-sentence description of what it contains and its purpose.
- id = kebab-case of the title.

Respond with JSON ONLY, no markdown fences, no prose:
[
  { "id": "hero", "title": "Hero", "description": "..." },
  { "id": "social-proof", "title": "Social proof", "description": "..." },
  ...
]`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('plan-sections Claude error:', res.status, errBody);
      let detail = `AI error: ${res.status}`;
      try { detail = JSON.parse(errBody)?.error?.message || detail; } catch {}
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const data = await res.json();
    let text = String(data?.content?.[0]?.text ?? '').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let sections: any[];
    try {
      sections = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 502 });
    }
    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'AI did not return a section array' }, { status: 502 });
    }

    // Normalise: ensure id + title + description strings, drop garbage.
    const normalised = sections
      .map((s, i) => {
        const title = String(s?.title || '').trim() || `Section ${i + 1}`;
        const description = String(s?.description || '').trim();
        const id = String(s?.id || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          || `section-${i + 1}`;
        return { id, title, description };
      })
      .filter(s => s.title);

    return NextResponse.json({ sections: normalised });
  } catch (e: any) {
    console.error('plan-sections error:', e);
    return NextResponse.json({ error: 'Failed to plan sections' }, { status: 500 });
  }
}
