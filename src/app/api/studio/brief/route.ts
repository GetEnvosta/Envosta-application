import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { checkAiTokenBudget } from '@/lib/ai-budget';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { BRIEF_SYSTEM_PROMPT } from '@/lib/studio-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Logged-in users: check their token budget
  // Anonymous users: IP rate limit (5 briefs per hour)
  if (user) {
    const budget = await checkAiTokenBudget(user.id);
    if (!budget.allowed) {
      return NextResponse.json({
        error: `AI token limit reached. Used ${budget.dailyUsed.toLocaleString()} of ${budget.dailyLimit?.toLocaleString()} tokens today.`,
      }, { status: 429 });
    }
  } else {
    const ip = getClientIp(req);
    const { allowed } = rateLimit(`studio-brief:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit reached. Create a free account for unlimited access.' }, { status: 429 });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const { brief, businessInfo, referenceHtml } = await req.json();
    if (!brief || typeof brief !== 'string' || brief.trim().length < 10) {
      return NextResponse.json({ error: 'Please describe the website in at least a few words' }, { status: 400 });
    }

    // Build enriched user message with business details + optional HTML reference
    let userMessage = brief.trim();
    if (businessInfo && typeof businessInfo === 'object') {
      const details = Object.entries(businessInfo)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      if (details) userMessage += `\n\nBusiness Details:\n${details}`;
    }
    if (referenceHtml && typeof referenceHtml === 'string') {
      // Cap HTML reference to avoid token explosion
      const trimmedHtml = referenceHtml.slice(0, 12000);
      userMessage += `\n\nReference HTML (use this as a design/layout inspiration):\n${trimmedHtml}`;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: BRIEF_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Claude brief error:', res.status, errBody);
      let detail = `AI error: ${res.status}`;
      try { detail = JSON.parse(errBody)?.error?.message || detail; } catch {}
      return NextResponse.json({ error: detail }, { status: 502 });
    }

    const data = await res.json();
    let text = data?.content?.[0]?.text ?? '';
    const inputTokens = data?.usage?.input_tokens ?? 0;
    const outputTokens = data?.usage?.output_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;

    text = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

    // Log AI usage + deduct credits (only for logged-in users)
    if (user) {
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
          details: `studio_brief: ${totalTokens} tokens`,
          level: 'info',
          metadata: { ai_action: 'studio_brief', input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens, credits_charged: creditsCharged, model: 'claude-sonnet-4-20250514' },
        });

        if (creditsCharged > 0) {
          await supabase.rpc('fn_deduct_credits', {
            p_user_id: user.id,
            p_amount: Math.ceil(creditsCharged),
            p_service_type: 'ai_tokens',
            p_description: `Studio brief generation: ${totalTokens} tokens`,
            p_reference_id: null,
          });
        }
      } catch (logErr) {
        console.error('AI usage log error (non-fatal):', logErr);
      }
    }

    const options = JSON.parse(text);
    return NextResponse.json({ options });
  } catch (e: any) {
    console.error('Brief generation error:', e);
    return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 });
  }
}
