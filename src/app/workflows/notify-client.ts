/**
 * Client notification workflow (Vercel Workflows SDK).
 *
 * Dispatches transactional emails to a user. Renders the email body via
 * the `templateId` switch and sends through the existing Resend helpers
 * in `@/lib/email`. Workflow wraps a single durable step so retries on
 * Resend 5xx come for free.
 *
 * Idempotency: keyed on `dedupToken`. Before sending, the step checks
 * `audit_log` for a row with action='workflow.notify_client.sent' and
 * matching metadata.dedup_token. If found, the step short-circuits and
 * returns { skipped: true } — no duplicate sends, no matter how many
 * times the workflow is replayed.
 *
 * `variables` is template-specific:
 *   - welcome:         { planName, loginUrl? }
 *   - invoice_paid:    { amount, description, invoiceUrl? }
 *   - payment_failed:  { amount }
 *   - sites_paused:    { siteCount }
 */
import { FatalError } from 'workflow';
import { createClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/audit';
import {
  sendEmail,
  welcomeEmail,
  invoicePaidEmail,
  paymentFailedEmail,
  sitesPausedEmail,
} from '@/lib/email';

export type NotifyTemplateId =
  | 'welcome'
  | 'invoice_paid'
  | 'payment_failed'
  | 'sites_paused';

export interface NotifyClientInput {
  userId: string;
  templateId: NotifyTemplateId | string;
  variables?: Record<string, unknown>;
  dedupToken: string;
}

// ───────────────────────────────────────────────────────────────────
// STEP 1 — render + send. Idempotent on dedupToken.
// ───────────────────────────────────────────────────────────────────
async function renderAndSend(input: NotifyClientInput) {
  'use step';

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );

  // ── Dedup check ──
  // audit_log.metadata is JSONB — match on dedup_token contained inside.
  const { data: prior } = await sb
    .from('audit_log')
    .select('id')
    .eq('action', 'workflow.notify_client.sent')
    .contains('metadata', { dedup_token: input.dedupToken })
    .limit(1)
    .maybeSingle();

  if (prior) {
    return { ok: true, skipped: true as const };
  }

  // ── Resolve recipient ──
  const { data: user, error: userErr } = await sb
    .from('users')
    .select('id, email, full_name')
    .eq('id', input.userId)
    .maybeSingle();

  if (userErr) {
    throw new Error(`users lookup failed: ${userErr.message}`);
  }
  if (!user) {
    throw new FatalError(`user ${input.userId} not found`);
  }
  if (!user.email) {
    throw new FatalError(`user ${input.userId} has no email`);
  }

  const name = user.full_name ?? 'there';
  const vars = input.variables ?? {};

  // ── Render by template ──
  let composed: { subject: string; html: string };
  switch (input.templateId) {
    case 'welcome': {
      const planName = typeof vars.planName === 'string' ? vars.planName : 'Hosting';
      const loginUrl = typeof vars.loginUrl === 'string' ? vars.loginUrl : 'https://my.envosta.com/dashboard';
      composed = welcomeEmail(name, planName, loginUrl);
      break;
    }
    case 'invoice_paid': {
      const amount = typeof vars.amount === 'string' ? vars.amount : '';
      const description = typeof vars.description === 'string' ? vars.description : 'Envosta invoice';
      const invoiceUrl = typeof vars.invoiceUrl === 'string' ? vars.invoiceUrl : null;
      composed = invoicePaidEmail(name, amount, description, invoiceUrl);
      break;
    }
    case 'payment_failed': {
      const amount = typeof vars.amount === 'string' ? vars.amount : '';
      composed = paymentFailedEmail(name, amount);
      break;
    }
    case 'sites_paused': {
      const siteCount = typeof vars.siteCount === 'number' ? vars.siteCount : 1;
      composed = sitesPausedEmail(name, siteCount);
      break;
    }
    default:
      throw new FatalError(`unknown templateId: ${input.templateId}`);
  }

  const result = await sendEmail({ to: user.email, ...composed });
  if (!result.ok) {
    // sendEmail swallows network errors and returns ok:false with a string
    // error — retry on Resend failures (could be transient 5xx / rate limit).
    throw new Error(`send failed: ${result.error ?? 'unknown'}`);
  }

  await recordAudit({
    actorType: 'workflow',
    action: 'workflow.notify_client.sent',
    resourceType: 'user',
    resourceId: input.userId,
    metadata: {
      template_id: input.templateId,
      dedup_token: input.dedupToken,
      resend_id: result.id ?? null,
      recipient: user.email,
    },
  });

  return { ok: true, skipped: false as const, resendId: result.id ?? null };
}

// ───────────────────────────────────────────────────────────────────
// Workflow orchestrator.
// ───────────────────────────────────────────────────────────────────
export async function notifyClient(input: NotifyClientInput) {
  'use workflow';
  const out = await renderAndSend(input);
  return { status: out.skipped ? ('skipped' as const) : ('sent' as const), resendId: out.resendId ?? null };
}
