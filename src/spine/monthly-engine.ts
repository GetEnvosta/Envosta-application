/**
 * spine/monthly-engine.ts — the monthly engine (charter §4.6, rebuild brief
 * Phase 4.3).
 *
 * On the 1st of each month, for every ACTIVE client:
 *   - create the plan-cadence service-area-page tasks (pagesPerMonth from
 *     config/pricing: Business = 2, Growth = 4, Basic/Minimum = 0), and
 *   - compile the branded monthly-report template (site health, uptime,
 *     pages shipped, GBP/review stat fields),
 * all routed to the VA QA queue: deliverables start at status='planned' and
 * NOTHING ships without a human 'approved' → 'published' pass
 * (runbooks/monthly-engine.md).
 *
 * Idempotent: keyed on (client, period, type[, n]) — re-running a month
 * never duplicates tasks. Targets the NEW data model (`clients` +
 * `deliverables`, 0001_init.sql — Phase 6 dev project). Until that schema
 * exists the run reports `schemaReady: false` and does nothing, so the cron
 * can ship now and come alive at Phase 6 with zero changes.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPlan, type PlanKey } from "@/config/pricing";

let _sb: SupabaseClient | null = null;
function supabaseClient(): SupabaseClient {
  if (_sb) return _sb;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase env missing for spine/monthly-engine");
  _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

/** First of the current month (UTC) — the deliverable period key. */
export function currentPeriod(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

/** The branded monthly report template — every field a VA fills or a
 * system stat fills; no client-visible third-party dashboards (charter §4). */
export function reportTemplate() {
  return {
    site_health: { uptime_pct: null as number | null, incidents: 0, notes: "" },
    pages_shipped: [] as { title: string; url: string }[],
    gbp: { views: null as number | null, calls: null as number | null, direction_requests: null as number | null },
    reviews: { new_count: null as number | null, average_rating: null as number | null, responses_sent: null as number | null },
    summary_for_client: "",
  };
}

export interface MonthlyEngineResult {
  ok: boolean;
  schemaReady: boolean;
  period: string;
  clientsProcessed: number;
  pageTasksCreated: number;
  reportsCreated: number;
  skippedExisting: number;
  errors: string[];
}

export async function runMonthlyEngine(): Promise<MonthlyEngineResult> {
  const sb = supabaseClient();
  const period = currentPeriod();
  const result: MonthlyEngineResult = {
    ok: true, schemaReady: true, period,
    clientsProcessed: 0, pageTasksCreated: 0, reportsCreated: 0, skippedExisting: 0, errors: [],
  };

  // Active clients on the new model. Table absent (pre–Phase 6) → no-op.
  const { data: clients, error: clientsErr } = await sb
    .from("clients")
    .select("id, business_name, plan_key, industry_id, city")
    .eq("status", "active");
  if (clientsErr) {
    const msg = clientsErr.message ?? String(clientsErr);
    if (/relation .* does not exist|does not exist|schema cache/i.test(msg)) {
      return { ...result, schemaReady: false };
    }
    return { ...result, ok: false, errors: [msg] };
  }

  // Existing deliverables for this period (idempotency in one read).
  const { data: existing, error: existErr } = await sb
    .from("deliverables")
    .select("client_id, type, title")
    .eq("period", period);
  if (existErr) {
    return { ...result, ok: false, errors: [existErr.message ?? String(existErr)] };
  }
  const have = new Set((existing ?? []).map((d: any) => `${d.client_id}|${d.type}|${d.title}`));

  const dueAt = (() => {
    // Pages due by the 21st; report by month-end (QA buffer before ship).
    const d = new Date(period);
    return {
      pages: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 21)).toISOString(),
      report: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString(),
    };
  })();

  for (const client of clients ?? []) {
    result.clientsProcessed += 1;
    let cadence = 0;
    try {
      cadence = getPlan(client.plan_key as PlanKey).pagesPerMonth;
    } catch {
      result.errors.push(`unknown plan ${client.plan_key} for client ${client.id}`);
      continue;
    }

    // Service-area page tasks at plan cadence.
    for (let n = 1; n <= cadence; n++) {
      const title = `Service-area page ${n} of ${cadence} — ${period}`;
      const key = `${client.id}|service_page|${title}`;
      if (have.has(key)) { result.skippedExisting += 1; continue; }
      const { error } = await sb.from("deliverables").insert({
        client_id: client.id,
        type: "service_page",
        title,
        period,
        status: "planned",
        due_at: dueAt.pages,
        meta: { source: "monthly_engine", n, cadence },
      });
      if (error) result.errors.push(`page task (${client.id}): ${error.message}`);
      else result.pageTasksCreated += 1;
    }

    // Branded monthly report — created for EVERY active client on every
    // plan that includes reporting (all public plans do).
    const reportTitle = `Monthly report — ${period}`;
    const reportKey = `${client.id}|monthly_report|${reportTitle}`;
    if (have.has(reportKey)) { result.skippedExisting += 1; continue; }
    const { error: repErr } = await sb.from("deliverables").insert({
      client_id: client.id,
      type: "monthly_report",
      title: reportTitle,
      period,
      status: "planned",
      due_at: dueAt.report,
      meta: { source: "monthly_engine", template: reportTemplate() },
    });
    if (repErr) result.errors.push(`report (${client.id}): ${repErr.message}`);
    else result.reportsCreated += 1;
  }

  result.ok = result.errors.length === 0;
  return result;
}
