import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { isStaffRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(profile?.role)) return NextResponse.json({ error: 'Staff access required' }, { status: 403 });

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
        system: `You are a UX architect at Envosta, a premium WordPress hosting and design agency. Given a website brief and optional business details, suggest a sitemap optimized for conversion and user flow.

Return ONLY valid JSON — no markdown, no code fences, no explanation. The format must be:
[
  {
    "name": "Home",
    "slug": "home",
    "description": "Main landing page with hero, services overview, testimonials, and CTA",
    "sections": ["Hero", "Services Grid", "Social Proof", "CTA Banner"]
  },
  ...more pages
]

Guidelines:
- Always include Home as the first page
- Include a Contact page with form, map, and contact details
- Suggest 4-8 pages total (not too many, not too few)
- Each page should have a clear purpose tied to conversion
- Sections should be specific and descriptive
- Slugs should be lowercase, hyphenated
- Order pages by importance (Home first, Contact usually last)`,
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
    text = text.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim();

    const wireframe = JSON.parse(text);
    return NextResponse.json({ wireframe });
  } catch (e: any) {
    console.error('Wireframe generation error:', e);
    return NextResponse.json({ error: 'Failed to generate wireframe' }, { status: 500 });
  }
}
