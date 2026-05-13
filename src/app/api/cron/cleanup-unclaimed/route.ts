import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
      await sb.from('sites').delete().eq('user_id', user.id);

      // Delete subscriptions
      await sb.from('subscriptions').delete().eq('user_id', user.id);

      // Delete tickets + messages
      const { data: tickets } = await sb.from('tickets').select('id').eq('user_id', user.id);
      for (const t of tickets ?? []) {
        await sb.from('ticket_messages').delete().eq('ticket_id', t.id);
      }
      await sb.from('tickets').delete().eq('user_id', user.id);

      // Delete logs
      await sb.from('logs').delete().eq('user_id', user.id);

      // Delete commissions
      await sb.from('commissions').delete().eq('customer_id', user.id);

      // Delete user profile
      await sb.from('users').delete().eq('id', user.id);

      // Delete auth user
      await sb.auth.admin.deleteUser(user.id);

      // Log the cleanup (to a general log since user is deleted)
      await sb.from('logs').insert({
        action: 'account.unclaimed_expired',
        details: `Unclaimed account deleted: ${user.full_name} (${user.email})`,
        level: 'info',
        metadata: { deleted_user_id: user.id, email: user.email },
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
