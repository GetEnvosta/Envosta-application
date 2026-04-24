import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * POST /api/studio/suggest-site-meta
 *
 * From the brief + whatever the user has already filled in, fill in the
 * missing site metadata fields. Called on concept select so the user
 * doesn't have to hand-type businessName / tagline / targetAudience
 * before advancing to Design.
 *
 * Request body:
 *   {
 *     brief: string,
 *     businessInfo: { businessName?, industry?, tagline?, targetAudience?, ... },
 *   }
 *
 * Response:
 *   {
 *     suggested: {
 *       businessName?: string,
 *       tagline?: string,
 *       industry?: string,
 *       targetAudience?: string,
 *     },
 *   }
 *
 * We only return values for fields the user has NOT filled in — the client
 * merges them on top of the current businessInfo so user input always wins.
 */
export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Please sign in' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const { brief, businessInfo } = await req.json();
    if (!brief || typeof brief !== 'string' || brief.trim().length < 10) {
      return NextResponse.json({ suggested: {} });
    }
    const bi = businessInfo || {};

    // Only ask the model to fill fields the user hasn't set.
    const missing: string[] = [];
    if (!bi.businessName)   missing.push('businessName   — the brand / site title shoppers will see. 1–4 words.');
    if (!bi.tagline)        missing.push('tagline        — a short, punchy 4–8-word subtitle. Benefit-led, not generic.');
    if (!bi.industry)       missing.push('industry       — one of: Restaurant / Food Service, Retail / E-commerce, Healthcare / Medical, Real Estate, Professional Services, Construction / Trades, Fitness / Wellness, Beauty / Salon, Automotive, Non-Profit, Education, Technology, Creative / Agency, Legal, Finance, Other.');
    if (!bi.targetAudience) missing.push('targetAudience — 1 concrete sentence describing the ideal customer.');
    if (missing.length === 0) {
      return NextResponse.json({ suggested: {} });
    }

    const knownLines = Object.entries(bi)
      .filter(([k, v]) => v && typeof v === 'string' && ['businessName', 'industry', 'tagline', 'targetAudience', 'phone', 'email', 'address'].includes(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    const userMsg = `Brief:
${brief}

Already filled (do NOT change or echo back):
${knownLines || '(nothing)'}

Fill in ONLY these missing fields from the brief:
${missing.join('\n')}

Respond with JSON only — a single object whose keys match the field names above. Omit any field you can't confidently infer. No markdown, no prose.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('suggest-site-meta Claude error:', res.status, errBody);
      return NextResponse.json({ suggested: {} });
    }

    const data = await res.json();
    let text = String(data?.content?.[0]?.text ?? '').trim();
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

    let parsed: Record<string, string> = {};
    try {
      const obj = JSON.parse(text);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) parsed = obj;
    } catch {
      return NextResponse.json({ suggested: {} });
    }

    // Filter to the allowed keys + non-empty strings.
    const allowed = ['businessName', 'tagline', 'industry', 'targetAudience'] as const;
    const suggested: Record<string, string> = {};
    for (const k of allowed) {
      const v = parsed[k];
      if (typeof v === 'string' && v.trim() && !bi[k]) {
        suggested[k] = v.trim();
      }
    }

    return NextResponse.json({ suggested });
  } catch (e: any) {
    console.error('suggest-site-meta fatal:', e);
    return NextResponse.json({ suggested: {} });
  }
}
