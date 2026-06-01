/**
 * Service-role client scoped to the `stripe` schema (Stripe Sync Engine mirror
 * tables: subscriptions, subscription_items, invoices, payment_methods,
 * customers, …).
 *
 * These tables MUST be read via service-role — never the cookie/anon user
 * client — so that RLS can be enabled on `stripe.*` (closing the anon-key
 * exposure) without breaking reads. The service-role key bypasses RLS.
 *
 * IMPORTANT: RLS is NOT doing per-customer filtering here. Any caller that
 * surfaces customer-specific data must still filter by the user's own
 * `stripe_customer_id` (which all current callers do).
 */
import { createClient } from '@supabase/supabase-js';

export function stripeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  ).schema('stripe' as any) as any;
}
