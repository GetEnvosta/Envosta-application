import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * Daily cron: delete unclaimed accounts past their expiry date.
 * Removes auth user, user profile, sites, and all related data.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Pause check + last-run stamp (managed in Settings → Crons). Fail-open.
  const { guardCron } = await import('@/lib/crons');
  if (!(await guardCron('cleanup-unclaimed')).enabled) {
    return NextResponse.json({ ok: true, skipped: 'cron paused' });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  // Find expired unclaimed accounts
  const { data: expired } = await sb
    .from('users')
    .select('id, email, full_name')
    .eq('claimed', false)
    .lt('claim_expires_at', new Date().toISOString());

  if (!expired?.length) {
    return NextResponse.json({ message: 'No expired accounts', cleaned: 0 });
  }

  let cleaned = 0;
  const errors: string[] = [];

  for (const user of expired) {
    try {
      // Delete sites (cascade will handle related data)
      // public.subscriptions / public.invoices were dropped in the Sync
      // Engine cutover; stripe.* mirrors are managed by the Sync Engine.
      await sb.from('sites').delete().eq('user_id', user.id);

      // Delete tickets + messages
      const { data: tickets } = await sb.from('tickets').select('id').eq('user_id', user.id);
      for (const t of tickets ?? []) {
        await sb.from('ticket_messages').delete().eq('ticket_id', t.id);
      }
      await sb.from('tickets').delete().eq('user_id', user.id);

      // Note: audit_log rows reference actor_id but are intentionally
      // RETAINED on user deletion — they're an immutable audit trail.
      // (The old `logs` table used to be wiped here; that table is gone.)

      // Delete user profile
      await sb.from('users').delete().eq('id', user.id);

      // Delete auth user
      await sb.auth.admin.deleteUser(user.id);

      // Log the cleanup (to a general log since user is deleted)
      await recordAudit({
        actorType: 'system',
        action: 'account.unclaimed_expired',
        resourceType: 'user',
        resourceId: user.id,
        metadata: {
          level: 'info',
          details: `Unclaimed account deleted: ${user.full_name} (${user.email})`,
          deleted_user_id: user.id,
          email: user.email,
        },
      });

      cleaned++;
    } catch (err) {
      errors.push(`${user.email}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    message: `Cleanup complete`,
    cleaned,
    errors: errors.length > 0 ? errors : undefined,
  });
}
