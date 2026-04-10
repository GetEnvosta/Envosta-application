import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Claude can take a while for large pages

const SYSTEM_PROMPT = `You are an expert web designer working for Envosta, a premium WordPress hosting and design agency. You create stunning, production-quality HTML pages that will be converted to WordPress FSE block themes.

RULES:
1. Output ONLY complete, valid HTML. No explanation, no markdown, no code fences.
2. Include <html>, <head>, <body> tags. Load Google Fonts via <link> tag in <head>.
3. Use ONLY the colors and fonts provided in the style reference. Never deviate.
4. Include a site header with the site name and navigation links to all pages listed.
5. Include a site footer consistent with the brand.
6. Make the design PREMIUM — bold typography, intentional spacing, strong visual hierarchy.
7. All content should be realistic placeholder content appropriate for the business.
8. Semantic HTML. Fully responsive. CSS in a <style> tag in the <head>.
9. No JavaScript frameworks. Pure HTML/CSS. Minimal JS only if needed for mobile nav toggle.
10. Every section should be clearly structured with semantic elements (section, article, aside) so it can be cleanly converted to WordPress block patterns.
11. Images should use placeholder services like https://placehold.co/ with appropriate dimensions.
12. Design should feel bespoke and premium, not like a template. Avoid generic layouts.`;

export async function POST(req: Request) {
  // Auth
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(profile?.role)) {
    return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const { style, pageName, pagePrompt, allPageNames, referenceHtml } = await req.json();

    if (!pageName || !pagePrompt) {
      return NextResponse.json({ error: 'Page name and prompt are required' }, { status: 400 });
    }

    const fonts = style?.fonts || { heading: 'Playfair Display', body: 'Source Sans 3' };
    const colors = style?.colors || {};

    const userMessage = `GLOBAL STYLE REFERENCE:
Site Name: ${style?.siteName || 'Untitled'}
Heading Font: ${fonts.heading}
Body Font: ${fonts.body}
Colors:
  Primary: ${colors.primary || '#1a1a2e'}
  Secondary: ${colors.secondary || '#16213e'}
  Accent: ${colors.accent || '#e94560'}
  Background: ${colors.background || '#0f0f1a'}
  Surface: ${colors.surface || '#1a1a2e'}
  Text: ${colors.text || '#e8e8e8'}
  Text Muted: ${colors.textMuted || '#8a8a9a'}
  Border: ${colors.border || '#2a2a3e'}
Border Radius: ${style?.borderRadius || '4px'}
Max Width: ${style?.maxWidth || '1200px'}

Navigation pages: ${(allPageNames || [pageName]).join(', ')}

PAGE TO GENERATE: "${pageName}"
DESCRIPTION: ${pagePrompt}${referenceHtml ? `

═══ REFERENCE HTML ═══
The user has provided an existing HTML page to use as a reference. Rebuild this page with the same layout, structure, sections, and content but apply the style reference above (colors, fonts, spacing). Match the reference design as closely as possible while using the provided design system. If sections are present, keep them in the same order. Replace any branding with the site name and colors above.

REFERENCE:
${referenceHtml}` : ''}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        system: SYSTEM_PROMPT,
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

      await supabase.from('ai_usage_log').insert({
        user_id: user.id,
        action: 'generate_page',
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        credits_charged: creditsCharged,
        model: 'claude-sonnet-4-20250514',
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
