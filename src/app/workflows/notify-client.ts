/**
 * Client notification workflow:
 *   1. Look up the user's preferred channels (email, etc.)
 *   2. Render the template
 *   3. Send via Resend (email)
 *   4. Log to audit_log + api_calls
 *
 * Idempotency key: user_id + template_id + a caller-provided dedup token.
 * Triggered by: any other workflow that needs to email the client. Keeping
 * notification logic in its own workflow means retries don't accidentally
 * re-run upstream side effects.
 *
 * Phase 1: SCAFFOLD ONLY. Logic lands in Phase 5.
 */
export async function notifyClient(input: {
  userId: string;
  templateId: string;
  variables?: Record<string, unknown>;
  dedupToken: string;
}) {
  'use workflow';
  // TODO Phase 5: implement notification dispatch
  console.log('notifyClient scaffold called with', input);
  return { status: 'scaffold' as const };
}
