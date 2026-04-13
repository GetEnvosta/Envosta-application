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
    const { brief } = await req.json();
    if (!brief || typeof brief !== 'string' || brief.trim().length < 10) {
      return NextResponse.json({ error: 'Please describe the website in at least a few words' }, { status: 400 });
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
        system: `You are a creative director at Envosta, a premium WordPress hosting and design agency. Given a rough website description from a client, generate exactly 3 distinct website concepts. Each should take a different creative angle but all must be premium, professional, and conversion-focused.

Return ONLY valid JSON — no markdown, no code fences, no explanation. The format must be:
[
  { "title": "Concept Name", "description": "3-4 sentences describing the creative direction, visual style, key features, and target audience approach." },
  { "title": "Concept Name", "description": "..." },
  { "title": "Concept Name", "description": "..." }
]`,
        messages: [{ role: 'user', content: brief.trim() }],
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
