/**
 * Audit-log helper. Used by workflows, webhooks, and any service-role
 * code path that mutates a customer-facing resource. Records actor,
 * resource, and before/after JSONB so the audit_log table becomes a
 * permanent forensic trail.
 *
 * This file builds a service-role Supabase client inline (per the
 * convention in src/lib/supabase-server.ts — no getAdmin() helper).
 * The audit_log table itself has RLS enabled but no policies, so only
 * service-role can insert rows.
 */
import { createClient } from '@supabase/supabase-js';

export type AuditActorType = 'user' | 'admin' | 'system' | 'webhook' | 'workflow';

export interface AuditParams {
  actorId?: string;
  actorType?: AuditActorType;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(params: AuditParams): Promise<void> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } }
  );

  const { error } = await sb.from('audit_log').insert({
    actor_id: params.actorId ?? null,
    actor_type: params.actorType ?? 'system',
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId ?? null,
    before_state: params.before ?? null,
    after_state: params.after ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    // Never throw from audit logging — it should never block business
    // logic. But log noisily so we can spot misconfigurations.
    console.error('recordAudit failed', { action: params.action, error });
  }
}
