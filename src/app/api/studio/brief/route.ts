import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { BRIEF_SYSTEM_PROMPT } from '@/lib/studio-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Anonymous users: IP rate limit (5 briefs per hour). Logged-in users are unlimited.
  if (!user) {
    const ip = getClientIp(req);
    const { allowed } = rateLimit(`studio-brief:${ip}`, 5, 60 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit reached. Create a free account for unlimited access.' }, { status: 429 });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const { brief, businessInfo, pages, woocommerce, referenceHtml } = await req.json();
    if (!brief || typeof brief !== 'string' || brief.trim().length < 10) {
      return NextResponse.json({ error: 'Please describe the website in at least a few words' }, { status: 400 });
    }

    // Build enriched user message with business details + optional HTML reference
    let userMessage = brief.trim();
    if (businessInfo && typeof businessInfo === 'object') {
      const details = Object.entries(businessInfo)
        .filter(([k, v]) => v && k !== 'pages')
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
      if (details) userMessage += `\n\nBusiness Details:\n${details}`;
    }
    if (Array.isArray(pages) && pages.length > 0) {
      userMessage += `\n\nPages the site should include: ${pages.join(', ')}`;
    }
    if (woocommerce) {
      userMessage += `\n\nThis site will include a WooCommerce online store. Concepts should account for e-commerce: product listings, shopping cart, checkout flow, customer account management, and a clean Shop page layout.`;
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

    text = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

    const options = JSON.parse(text);
    return NextResponse.json({ options });
  } catch (e: any) {
    console.error('Brief generation error:', e);
    return NextResponse.json({ error: 'Failed to generate options' }, { status: 500 });
  }
}
