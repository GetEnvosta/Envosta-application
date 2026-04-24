import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { STUDIO_PRESETS, getPresetById } from '@/lib/studio-style-presets';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const { brief, businessInfo } = await req.json();

    const presetList = STUDIO_PRESETS.map(p =>
      `  - id: "${p.id}" | name: ${p.name} | fit: ${p.vibe}`
    ).join('\n');

    const userMsg = `You are picking the best starting style preset for a new website.

Brief: ${brief || '(none)'}
Business: ${businessInfo?.businessName || '(unknown)'} — ${businessInfo?.industry || 'industry unknown'}
Tagline: ${businessInfo?.tagline || '(none)'}
Target audience: ${businessInfo?.targetAudience || '(unknown)'}

Available presets:
${presetList}

Pick the SINGLE best preset id from the list above. Respond with ONLY the id (e.g. "editorial-serif"). No explanation, no quotes, no punctuation.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 50,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Claude suggest-style error:', res.status, errBody);
      // Fall back to the default preset rather than error out
      return NextResponse.json({ preset: getPresetById('assembler-default'), fallback: true });
    }

    const data = await res.json();
    const raw = String(data?.content?.[0]?.text ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    const picked = getPresetById(raw) || getPresetById('assembler-default')!;

    // Log AI usage (non-fatal)
    try {
      const inputTokens = data?.usage?.input_tokens ?? 0;
      const outputTokens = data?.usage?.output_tokens ?? 0;
      await supabase.from('logs').insert({
        user_id: user.id,
        action: 'ai.usage',
        details: `studio_suggest_style: picked ${picked.id}`,
        level: 'info',
        metadata: { ai_action: 'studio_suggest_style', input_tokens: inputTokens, output_tokens: outputTokens, model: 'claude-haiku-4-5' },
      });
    } catch {}

    return NextResponse.json({ preset: picked });
  } catch (e: any) {
    console.error('Suggest style error:', e);
    return NextResponse.json({ error: 'Failed to suggest style' }, { status: 500 });
  }
}
