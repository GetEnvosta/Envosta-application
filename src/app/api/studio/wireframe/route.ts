import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { checkAiTokenBudget } from '@/lib/ai-budget';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { WIREFRAME_SYSTEM_PROMPT } from '@/lib/studio-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Logged-in users: check their token budget
  // Anonymous users: IP rate limit (5 wireframes per hour)
  if (user) {
    const budget = await checkAiTokenBudget(user.id);
    if (!budget.allowed) {
      return NextResponse.json({ error: `AI token limit reached. Used ${budget.dailyUsed.toLocaleString()} of ${budget.dailyLimit?.toLocaleString()} tokens today.` }, { status: 429 });
    }
  } else {
    const ip = getClientIp(req);
    const { allowed } = rateLimit(`studio-wireframe:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit reached. Create a free account for unlimited access.' }, { status: 429 });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const { brief, businessInfo, modifications } = await req.json();
    if (!brief) return NextResponse.json({ error: 'Brief is required' }, { status: 400 });

    let businessContext = '';
    if (businessInfo) {
      const b = businessInfo;
      businessContext = [
        b.businessName && `Business: ${b.businessName}`,
        b.industry && `Industry: ${b.industry}`,
        b.tagline && `Tagline: ${b.tagline}`,
        b.targetAudience && `Target: ${b.targetAudience}`,
        b.referenceSites && `Reference sites: ${b.referenceSites}`,
      ].filter(Boolean).join('\n');
    }

    const userMsg = `Website Brief:
${brief}

${businessContext ? `Business Details:\n${businessContext}\n` : ''}
${modifications ? `User requested changes:\n${modifications}\n` : ''}
Generate the sitemap now.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: WIREFRAME_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Claude wireframe error:', res.status, errBody);
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

    // Log AI usage and deduct credits (only for logged-in users)
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
          details: `wireframe: ${totalTokens} tokens`,
          level: 'info',
          metadata: { ai_action: 'wireframe', input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens, credits_charged: creditsCharged, model: 'claude-sonnet-4-20250514' },
        });

        if (creditsCharged > 0) {
          await supabase.rpc('fn_deduct_credits', {
            p_user_id: user.id,
            p_amount: Math.ceil(creditsCharged),
            p_service_type: 'ai_tokens',
            p_description: `Studio wireframe: ${totalTokens} tokens`,
            p_reference_id: null,
          });
        }
      } catch (logErr) {
        console.error('AI usage log error (non-fatal):', logErr);
      }
    }

    const wireframe = JSON.parse(text);
    return NextResponse.json({ wireframe });
  } catch (e: any) {
    console.error('Wireframe generation error:', e);
    return NextResponse.json({ error: 'Failed to generate wireframe' }, { status: 500 });
  }
}
