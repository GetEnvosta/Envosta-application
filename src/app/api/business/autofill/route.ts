import { NextResponse } from 'next/server';
import { getEffectiveUserId } from '@/services/auth';
import { fetchWithRetry } from '@/lib/fetch-retry';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a business information researcher. Given a business name, website URL, or description, search the web and extract structured business details.

Return ONLY valid JSON — no markdown, no code fences, no explanation. The format must be:
{
  "name": "Full legal/trading business name",
  "phone": "Primary phone number with country code, e.g. +1 (403) 555-0199",
  "email": "Primary contact or general email",
  "website": "Full URL including https://",
  "address": "Street address",
  "city": "City name",
  "province": "Province/state abbreviation, e.g. AB, ON, CA, TX",
  "postal_code": "Postal/ZIP code",
  "country": "Two-letter country code: CA, US, GB, AU, NZ, or Other",
  "business_hours": "e.g. Mon-Fri 9am-5pm, Sat 10am-3pm",
  "services": "Comma-separated list of main services they offer",
  "description": "2-3 sentence description of what the business does"
}

Rules:
- Only include fields you can actually find or reasonably infer. Use empty string "" for unknown fields.
- For the country field, ONLY use: CA, US, GB, AU, NZ, or Other.
- Phone numbers should include the country code.
- The description should be factual and concise, written in third person.
- If given a website URL, prioritize information from that website.
- Do NOT fabricate information. If you can't find it, leave the field empty.`;

export async function POST(req: Request) {
  const userId = await getEffectiveUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

  const { query } = await req.json();
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return NextResponse.json({ error: 'Please enter a business name or website URL' }, { status: 400 });
  }

  try {
    const res = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Look up this business and extract their details: "${query.trim()}"`,
        }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error('Claude API error:', res.status, errBody);
      return NextResponse.json({ error: 'AI lookup failed. Try again.' }, { status: 502 });
    }

    const data = await res.json();
    let text = data?.content?.[0]?.text ?? '';

    // Strip markdown fences if present
    text = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

    let business: any;
    try {
      business = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Could not parse business data. Try a different query.' }, { status: 422 });
    }

    return NextResponse.json({ business });
  } catch (e: any) {
    console.error('Business autofill error:', e);
    return NextResponse.json({ error: 'Lookup failed. Try again.' }, { status: 500 });
  }
}
