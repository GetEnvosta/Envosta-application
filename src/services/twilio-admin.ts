import { createClient } from '@/lib/supabase-server';

/**
 * Get aggregate Twilio stats for admin dashboard.
 */
export async function getTwilioStats() {
  const supabase = await createClient();

  // Count active phone numbers
  const { count: activeNumbers } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .not('twilio_phone_number', 'is', null);

  // Get call logs this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: callLogs } = await supabase
    .from('logs')
    .select('metadata')
    .eq('action', 'receptionist.call')
    .gte('created_at', monthStart.toISOString());

  let totalCalls = 0;
  let totalMinutes = 0;
  let totalCredits = 0;

  for (const log of callLogs ?? []) {
    const meta = (log.metadata as any) ?? {};
    totalCalls++;
    totalMinutes += meta.duration_minutes ?? 0;
    totalCredits += meta.credits_charged ?? 0;
  }

  return {
    activeNumbers: activeNumbers ?? 0,
    totalCalls,
    totalMinutes,
    totalCredits,
  };
}

/**
 * Get all sites with phone numbers + owner info.
 */
export async function getAllPhoneNumbers() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('sites')
    .select('id, label, twilio_phone_number, receptionist_enabled, user_id, users(full_name, email)')
    .not('twilio_phone_number', 'is', null)
    .order('created_at', { ascending: false });

  return (data ?? []).map((s: any) => ({
    id: s.id,
    label: s.label,
    phone_number: s.twilio_phone_number,
    enabled: s.receptionist_enabled ?? false,
    user_id: s.user_id,
    user_name: s.users?.full_name ?? '',
    user_email: s.users?.email ?? '',
  }));
}

/**
 * Get all call logs across all users, most recent first.
 */
export async function getAllCallLogs(search?: string, limit = 50) {
  const supabase = await createClient();

  let query = supabase
    .from('logs')
    .select('id, user_id, site_id, metadata, created_at, sites(label), users(full_name, email)')
    .eq('action', 'receptionist.call')
    .order('created_at', { ascending: false })
    .limit(limit);

  const { data } = await query;

  const logs = (data ?? []).map((log: any) => {
    const meta = (log.metadata as any) ?? {};
    return {
      id: log.id,
      created_at: log.created_at,
      site_label: log.sites?.label ?? '',
      user_name: log.users?.full_name ?? '',
      user_email: log.users?.email ?? '',
      caller_number: meta.caller_number ?? '',
      call_sid: meta.call_sid ?? '',
      duration_seconds: meta.duration_seconds ?? 0,
      duration_minutes: meta.duration_minutes ?? 0,
      input_tokens: meta.input_tokens ?? 0,
      output_tokens: meta.output_tokens ?? 0,
      total_tokens: meta.total_tokens ?? 0,
      call_credits: meta.call_credits ?? 0,
      ai_credits: meta.ai_credits ?? 0,
      credits_charged: meta.credits_charged ?? 0,
      transcript: meta.transcript ?? [],
      model: meta.model ?? '',
    };
  });

  // Client-side search filter (caller number or site name)
  if (search) {
    const q = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.caller_number.includes(q) ||
        l.site_label.toLowerCase().includes(q) ||
        l.user_name.toLowerCase().includes(q),
    );
  }

  return logs;
}

/**
 * Get per-user Twilio usage breakdown this cycle.
 */
export async function getTwilioUsageByUser() {
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Get all receptionist call logs this month
  const { data: callLogs } = await supabase
    .from('logs')
    .select('user_id, metadata, users(full_name, email)')
    .eq('action', 'receptionist.call')
    .gte('created_at', monthStart.toISOString());

  // Get number counts per user
  const { data: numberSites } = await supabase
    .from('sites')
    .select('user_id')
    .not('twilio_phone_number', 'is', null);

  // Aggregate per user
  const userMap = new Map<string, {
    user_id: string;
    user_name: string;
    user_email: string;
    numbers: number;
    calls: number;
    minutes: number;
    call_credits: number;
    ai_credits: number;
    total_credits: number;
  }>();

  // Count numbers per user
  for (const site of numberSites ?? []) {
    const uid = site.user_id;
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        user_id: uid,
        user_name: '',
        user_email: '',
        numbers: 0,
        calls: 0,
        minutes: 0,
        call_credits: 0,
        ai_credits: 0,
        total_credits: 0,
      });
    }
    userMap.get(uid)!.numbers++;
  }

  // Aggregate call data
  for (const log of callLogs ?? []) {
    const uid = log.user_id;
    const meta = (log.metadata as any) ?? {};
    const user = (log as any).users;

    if (!userMap.has(uid)) {
      userMap.set(uid, {
        user_id: uid,
        user_name: user?.full_name ?? '',
        user_email: user?.email ?? '',
        numbers: 0,
        calls: 0,
        minutes: 0,
        call_credits: 0,
        ai_credits: 0,
        total_credits: 0,
      });
    }

    const entry = userMap.get(uid)!;
    if (!entry.user_name && user?.full_name) entry.user_name = user.full_name;
    if (!entry.user_email && user?.email) entry.user_email = user.email;
    entry.calls++;
    entry.minutes += meta.duration_minutes ?? 0;
    entry.call_credits += meta.call_credits ?? 0;
    entry.ai_credits += meta.ai_credits ?? 0;
    entry.total_credits += meta.credits_charged ?? 0;
  }

  return Array.from(userMap.values()).sort((a, b) => b.total_credits - a.total_credits);
}
