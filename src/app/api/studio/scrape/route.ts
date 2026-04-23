import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * POST /api/studio/scrape
 * Fetches a URL, extracts text content, then uses Claude to pull out
 * structured business info (name, industry, tagline, phone, email, etc.)
 */
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  try {
    const { url, existingInfo, brief } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    const existing = (existingInfo && typeof existingInfo === 'object') ? existingInfo : {};

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) targetUrl = `https://${targetUrl}`;

    // Fetch the page
    let html: string;
    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EnvostaStudio/1.0)',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return NextResponse.json({ error: `Could not fetch site (${res.status})` }, { status: 400 });
      html = await res.text();
    } catch {
      return NextResponse.json({ error: 'Could not reach that website' }, { status: 400 });
    }

    // Strip scripts/styles, extract text content (rough but effective)
    const textContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // Cap to avoid token explosion

    // Extract title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const pageTitle = titleMatch?.[1]?.trim() || '';

    // Extract meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const metaDesc = metaMatch?.[1]?.trim() || '';

    // Use Claude to extract structured business info
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You extract business information from website content and return ONLY valid JSON. The requested fields are:
{
  "businessName": "Company name",
  "industry": "One of: Restaurant / Food Service, Retail / E-commerce, Healthcare / Medical, Real Estate, Professional Services, Construction / Trades, Fitness / Wellness, Beauty / Salon, Automotive, Non-Profit, Education, Technology, Creative / Agency, Legal, Finance, Other",
  "tagline": "Company slogan or tagline",
  "phone": "Phone number",
  "email": "Email address",
  "address": "Physical address",
  "description": "A 2-3 sentence description of what the business does, suitable as a website brief"
}

IMPORTANT — locked fields: the user has already approved some of these values. They will be listed in the user message as LOCKED. Do NOT return any value for a locked field — omit the key entirely from your JSON. The user's locked values are authoritative; your job is only to fill the blanks.

If you can't confidently determine a value, omit the key. Empty string is fine too but omitting is cleaner.`,
        messages: [{
          role: 'user',
          content: `LOCKED FIELDS (do not return these — user already set them):
${Object.entries(existing).filter(([k, v]) => v && typeof v === 'string' && ['businessName','industry','tagline','phone','email','address'].includes(k)).map(([k, v]) => `  ${k}: ${v}`).join('\n') || '  (none)'}
${brief ? `\nUser's brief so far (use as extra context, don't overwrite):\n${String(brief).slice(0, 2000)}\n` : ''}
Page title: ${pageTitle}
Meta description: ${metaDesc}

Page content:
${textContent}`,
        }],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'AI extraction failed' }, { status: 502 });
    }

    const data = await res.json();
    let text = data?.content?.[0]?.text ?? '{}';
    text = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

    const extracted = JSON.parse(text);
    return NextResponse.json(extracted);
  } catch (e: any) {
    console.error('Scrape error:', e);
    return NextResponse.json({ error: 'Failed to analyze website' }, { status: 500 });
  }
}
