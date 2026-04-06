import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { isStaffRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Verify staff
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!isStaffRole(profile?.role)) {
    return NextResponse.json({ error: 'Staff access required' }, { status: 403 });
  }

  const { ticketId } = await req.json();
  if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 });

  try {
    // Call the edge function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Get user's session token for edge function auth
    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(`${supabaseUrl}/functions/v1/ai-onboarding-brief`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({ ticketId }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'AI generation failed' }, { status: res.status });
    }

    // Store the brief as a system message on the ticket
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    await sb.from('ticket_messages').insert({
      ticket_id: ticketId,
      sender: 'system',
      message: `**AI Onboarding Brief**\n\n${data.brief}`,
      metadata: { type: 'ai_onboarding_brief', generated_by: user.id },
    });

    return NextResponse.json({ success: true, brief: data.brief });
  } catch (e: any) {
    console.error('Generate brief error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
