// lib/provisioning.ts — the automation spine orchestrator (charter §3)
// Sign -> OpenSRS -> wp.cloud -> Studio build -> GBP -> monitoring -> live.
// Idempotent + resumable: each step records into provisioning_jobs.steps and
// re-running a job skips completed steps. Dry-run is global via env.
// Run via: cron/queue worker calling runNextJob(), or per-job runJob(id).

import { createClient } from "@supabase/supabase-js";
import { registerDomain, setNameservers } from "@/lib/opensrs";
import { createSite, mapDomain, confirmSsl, wpcloudNameservers } from "@/lib/wpcloud";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const STEPS = [
  "register_domain",
  "configure_dns",
  "create_site",
  "map_domain",
  "issue_ssl",
  "studio_build",
  "gbp_setup",
  "monitoring",
  "go_live",
] as const;
type Step = (typeof STEPS)[number];

type StepRecord = { step: Step; status: "done" | "manual" | "failed"; at: string; detail?: string };

export async function enqueueProvisioning(clientId: string) {
  // One open job per client.
  const { data: existing } = await supabase
    .from("provisioning_jobs").select("id")
    .eq("client_id", clientId).in("status", ["queued", "running", "blocked"]).maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await supabase.from("provisioning_jobs")
    .insert({ client_id: clientId, dry_run: process.env.PROVISIONING_DRY_RUN !== "false" })
    .select("id").single();
  if (error) throw error;
  await supabase.from("audit_log").insert({
    actor: "system", action: "provisioning.enqueued", entity: "client", entity_id: clientId, meta: {},
  });
  return data.id as string;
}

function stepDone(steps: StepRecord[], step: Step) {
  return steps.some(s => s.step === step && (s.status === "done" || s.status === "manual"));
}

export async function runJob(jobId: string) {
  const { data: job, error } = await supabase.from("provisioning_jobs").select("*").eq("id", jobId).single();
  if (error || !job) throw new Error(`Job not found: ${jobId}`);
  const steps: StepRecord[] = (job.steps as StepRecord[]) ?? [];

  const { data: client } = await supabase.from("clients").select("*").eq("id", job.client_id).single();
  if (!client) throw new Error("Client missing for job");

  await supabase.from("provisioning_jobs").update({ status: "running", attempts: job.attempts + 1 }).eq("id", jobId);

  const record = async (step: Step, status: StepRecord["status"], detail?: string) => {
    steps.push({ step, status, at: new Date().toISOString(), detail });
    await supabase.from("provisioning_jobs").update({ steps, current_step: step }).eq("id", jobId);
  };

  try {
    // ---- 1. register_domain -------------------------------------------------
    if (!stepDone(steps, "register_domain")) {
      let { data: domain } = await supabase.from("domains").select("*").eq("client_id", client.id).maybeSingle();
      if (!domain) {
        const { data: created, error: dErr } = await supabase.from("domains").insert({
          client_id: client.id,
          domain: deriveDomain(client.business_name, client.city), // rep can override pre-run
          registrant: null, // filled at intake; required before live runs
        }).select("*").single();
        if (dErr) throw dErr;
        domain = created;
      }
      if (!job.dry_run && !domain.registrant) {
        await record("register_domain", "failed", "registrant details missing — blocked");
        await supabase.from("provisioning_jobs").update({ status: "blocked", error: "Missing registrant details" }).eq("id", jobId);
        return;
      }
      await registerDomain({
        domainId: domain.id, domain: domain.domain,
        registrant: domain.registrant ?? placeholderRegistrant(client),
        nameservers: wpcloudNameservers(),
      });
      await record("register_domain", "done");
    }

    // ---- 2. configure_dns ---------------------------------------------------
    if (!stepDone(steps, "configure_dns")) {
      const { data: domain } = await supabase.from("domains").select("*").eq("client_id", client.id).single();
      await setNameservers(domain.id, domain.domain, wpcloudNameservers());
      await record("configure_dns", "done");
    }

    // ---- 3. create_site -----------------------------------------------------
    if (!stepDone(steps, "create_site")) {
      const { data: domain } = await supabase.from("domains").select("*").eq("client_id", client.id).single();
      let { data: site } = await supabase.from("sites").select("*").eq("client_id", client.id).maybeSingle();
      if (!site) {
        const { data: created, error: sErr } = await supabase.from("sites")
          .insert({ client_id: client.id, domain_id: domain.id }).select("*").single();
        if (sErr) throw sErr;
        site = created;
      }
      await createSite({ siteRowId: site.id, clientId: client.id, primaryDomain: domain.domain });
      await record("create_site", "done");
    }

    // ---- 4. map_domain ------------------------------------------------------
    if (!stepDone(steps, "map_domain")) {
      const { data: site } = await supabase.from("sites").select("*").eq("client_id", client.id).single();
      const { data: domain } = await supabase.from("domains").select("*").eq("client_id", client.id).single();
      await mapDomain(site.id, site.wpcloud_site_id ?? "", domain.domain);
      await record("map_domain", "done");
    }

    // ---- 5. issue_ssl -------------------------------------------------------
    if (!stepDone(steps, "issue_ssl")) {
      const { data: site } = await supabase.from("sites").select("*").eq("client_id", client.id).single();
      await confirmSsl(site.id, site.wpcloud_site_id ?? "");
      await record("issue_ssl", "done");
    }

    // ---- 6..8: human-in-the-loop tasks (Studio build / GBP / monitoring) ----
    // These create deliverable tasks; the run pauses ('blocked') until staff
    // marks them complete in the admin dashboard, then the job resumes.
    for (const manual of ["studio_build", "gbp_setup", "monitoring"] as const) {
      if (!stepDone(steps, manual)) {
        await supabase.from("deliverables").insert({
          client_id: client.id,
          type: "site_edit",
          title: manual === "studio_build" ? "Build site in Studio + migrate live"
               : manual === "gbp_setup"    ? "GBP setup + optimization + Turnstile check"
               : "Register uptime monitor",
          period: firstOfMonth(),
          status: "planned",
          due_at: new Date(Date.now() + 3 * 864e5).toISOString(),
          meta: { provisioning_step: manual, job_id: jobId },
        });
        await record(manual, "manual", "task created; awaiting staff completion");
        await supabase.from("provisioning_jobs").update({ status: "blocked" }).eq("id", jobId);
        return; // resume when staff completes the task (admin dashboard calls resumeJob)
      }
    }

    // ---- 9. go_live ---------------------------------------------------------
    if (!stepDone(steps, "go_live")) {
      await supabase.from("sites").update({ status: "live" }).eq("client_id", client.id);
      await supabase.from("clients").update({
        status: "active",
        guarantee_start_at: client.plan_key === "growth" ? new Date().toISOString() : null,
      }).eq("id", client.id);
      await record("go_live", "done");
    }

    await supabase.from("provisioning_jobs").update({ status: "done", error: null }).eq("id", jobId);
    await supabase.from("audit_log").insert({
      actor: "system", action: "provisioning.completed", entity: "client", entity_id: client.id, meta: { jobId },
    });
  } catch (err) {
    await supabase.from("provisioning_jobs").update({ status: "failed", error: String(err) }).eq("id", jobId);
    throw err;
  }
}

/** Staff marks a manual step's task done; this flips the step and re-runs. */
export async function resumeJob(jobId: string, completedStep: Step) {
  const { data: job } = await supabase.from("provisioning_jobs").select("*").eq("id", jobId).single();
  if (!job) throw new Error("Job not found");
  const steps: StepRecord[] = (job.steps as StepRecord[]) ?? [];
  const idx = steps.findIndex(s => s.step === completedStep && s.status === "manual");
  if (idx >= 0) steps[idx] = { ...steps[idx], status: "done", at: new Date().toISOString() };
  await supabase.from("provisioning_jobs").update({ steps, status: "queued" }).eq("id", jobId);
  return runJob(jobId);
}

export async function runNextJob() {
  const { data } = await supabase.from("provisioning_jobs")
    .select("id").eq("status", "queued").order("created_at").limit(1).maybeSingle();
  if (data) await runJob(data.id);
}

// --- helpers -----------------------------------------------------------------
function deriveDomain(business: string, city: string) {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${slug(business)}${slug(city)}.com`; // placeholder; intake overrides
}
function firstOfMonth() {
  const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function placeholderRegistrant(client: { business_name: string; contact_name: string; email: string; phone: string | null; city: string; region: string }) {
  const [first, ...rest] = client.contact_name.split(" ");
  return {
    first_name: first ?? "Owner", last_name: rest.join(" ") || "Owner",
    org_name: client.business_name, address1: "TBD", city: client.city,
    state: client.region, country: "CA", postal_code: "T0T0T0",
    phone: client.phone ?? "+1.4035550100", email: client.email,
  };
}
