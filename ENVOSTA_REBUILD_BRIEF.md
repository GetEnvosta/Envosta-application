# ENVOSTA REBUILD BRIEF — Full Rework Mission (Rev 1.3)

**For:** Claude Code (Claude Fable 5)
**Authority:** `CLAUDE.md` in this repo is the source of truth. This brief tells you *what to do*; CLAUDE.md tells you *what is true*. On any conflict, CLAUDE.md wins. On any missing business fact, stop and ask Koltyn — never invent.

**Mission:** Audit the existing Envosta codebase, then rework everything — marketing site, plans, funnel, signup, and automation scaffolding — so the entire product conforms to charter Rev 1.3: **Envosta is a white-glove, hands-free, industry-specialized managed hosting company built on the canonical stack** (WordPress · wp.cloud · Tucows/OpenSRS), with plans structured on the proven subscription playbook (hosting + site base, marketing layers stacked above) at the locked price points. The industry roadmap is construction trades now, legal and professional services later — so nothing trade-specific may be hardcoded; industries scale by config alone. When you finish there should be zero traces of any previous business model or agency-style positioning, and one config-driven source of truth for pricing, industries, and Growth spot counts.

---

## How to work

- Execute phases **in order**. Do not start a phase until the previous phase's deliverable is committed.
- One commit (or PR) per phase, message format: `phase-N: <summary>`.
- Maintain `REBUILD_CHANGELOG.md` — append what changed and why after every phase.
- Deprecate before deleting: move dead pages/components to `/_deprecated/` in Phase 1; delete only in Phase 5 cleanup after Koltyn confirms.
- Ask before anything destructive or anything touching live/production data, DNS, billing, or deployed sites.
- Where a decision is listed in CLAUDE.md §9 (Open Decisions), build it behind a config flag and surface the question in `OPEN_QUESTIONS.md` — do not resolve it yourself.

---

## Phase 0 — Audit (read-only, no changes)

Produce `AUDIT.md` containing:

1. **Stack inventory** — framework(s), build system, hosting/deploy path, CMS (if any), payment integration (if any), forms, analytics, existing env vars.
2. **Page & route map** — every page/route/component, one line each: what it is, what it claims, whether it conforms to CLAUDE.md.
3. **Violation list** — every instance of: legacy pricing ($49/$132/$517, Studio Lite/Premium, Booked/Booked+/Market Leader/Floor names), Jetpack references, ad/PPC copy, guaranteed-ranking claims, fake scarcity, hardcoded prices, domain-lock-in language, **and any copy positioning Envosta as an "agency," "web design company," "marketing company," or "studio" rather than a hosting company**.
4. **Reusable assets** — components, styles, and copy worth keeping.
5. **Risk notes** — anything wired to live services (payments, DNS, email) that the rework could break.

Do not modify a single file in this phase.

## Phase 1 — Purge & single source of truth

1. Create the canonical config:
   - `config/pricing` — all four plans, setup + monthly numerals, plan contents as structured data (base hosting layer vs. marketing layer vs. full program, per CLAUDE.md §2), annual-prepay rule (13th month free), currency as a flag (default per existing site; flag in `OPEN_QUESTIONS.md`).
   - `config/industries` — the industry list (launch: HVAC, roofing — construction trades family; roadmap includes non-trade verticals like legal and professional services later), each with: slug, display name, industry-specific vocabulary/copy tokens, Growth cap = 12, per-city spot/exclusivity records. **Adding an industry — including a non-trade vertical — must require zero code changes;** nothing trade-specific may be hardcoded in templates, schema, or copy patterns.
2. Every price, plan name, plan content line, industry name, and spot count on the site must render **from config**. No literals in components or copy files.
3. Move every violating page/component from the audit into `/_deprecated/`.
4. Strip Jetpack and any banned stack items (CLAUDE.md §4) from code, config, and copy. Rework any agency-positioned copy found in the audit to hosting-first framing (CLAUDE.md §6).
5. `Minimum` plan: exists in config, flagged `hidden: true`, reachable only via an internal/unlinked route for downgrade flows — never in nav, sitemap, pricing page, or structured data.

## Phase 2 — Marketing site rework (hosting-first IA)

Build/rework to CLAUDE.md §5 (brand) and §6 (voice). All pages mobile-first, IBM Plex Mono for every numeral. The information architecture reads as a hosting company: **Hosting plans · Industries · Service promise · Why our infrastructure · Get your scorecard.**

1. **Homepage** — hosting-first Hook–Story–Offer for a trades owner:
   - *Identity line up top:* industry-specialized managed hosting — "we only host [your industries], so your plan includes the site, the SEO, and the reviews."
   - *Hook:* their competitor is taking jobs that should be theirs — searchable proof framing.
   - *Story:* the invisible-online tradesperson drowning in lead-gen fees who became the name in town.
   - *Offer:* the plans, monthly price leading. Outcome language.
   - Include one **commodity-anchor kill block**: cheap hosting rents you a server; an Envosta plan runs your entire online presence for your industry (see CLAUDE.md §6 pattern).
   - Include one **provenance strip ("The Stack")**: the approved claims from CLAUDE.md §1 — WordPress 40%+ of the web, the software behind WhiteHouse.gov and NASA.gov · wp.cloud built by Automattic, the infrastructure behind WordPress.com · domains on Tucows/OpenSRS, the world's second-largest registrar and the platform behind Shopify's domains. No other superlatives.
   - Include one **future-proof block** using claim #5's demonstrated form: every Envosta site is built and maintained through an AI-native pipeline today; as AI advances, the dominant platform gets it first, managed for the client. No speculative AI hype.
   - Voice register throughout: white-glove and hands-free, demonstrated ("you never lift a finger", "one number, call or text", exact SLAs) — never self-declared "luxury/premium" (CLAUDE.md §6).
2. **Hosting plans page** — three public plans (Basic / Business / Growth) framed explicitly as hosting plans with layers stacked (base → marketing layer → full program). Growth shows a **live remaining-spots count per industry from config**, exclusivity explained plainly, annual prepay shown as "13th month free." No Minimum plan anywhere.
3. **Industry landing template** — one parameterized template rendering per-industry, per-city pages (e.g. `/hvac/calgary`) with: industry-specific hook, exclusivity status for that city ("taken" vs. "open"), what specialized hosting includes for that industry, service-area-page explanation, CTA. Must work for HVAC and roofing on day one; adding an industry = adding config, not code.
4. **Local Domination Scorecard funnel** — opt-in page (name, business, industry, city, URL, phone) → thank-you/booking step → the scorecard itself as a branded deliverable template the team can fill per lead. Turnstile on the form. This is the lead magnet; treat it as a first-class product surface.
5. **Service Promise page** — the SLAs from CLAUDE.md §3, verbatim commitments, the five-step intake loop visualized, covered-vs-paid boundary in plain language.
6. **"The Stack" page (Why Envosta hosting)** — now a primary positioning page: the pieced-together-vs-canonical story. Competitors duct-tape page builders, commodity hosting, random registrars, and plugin sprawl; Envosta runs the canonical stack end to end. Present all approved provenance claims (CLAUDE.md §1) with their proof anchors — including the enterprise anchor (WhiteHouse.gov, NASA.gov, Fortune-500 web properties) and the demonstrated AI-native future-proof section — plus: Canadian, Calgary, founder-led, direct Automattic partner, native wp.cloud security/backups/failover, and why specialization beats generic hosting. Credibility and provenance, not tech specs. No claims beyond the approved list; scope phrasing is always "your entire online presence," never "your business."
7. **Proof section(s)** — structure for real case studies/reviews with clearly marked pending placeholders (`<!-- PROOF: pending real client data -->`). No fabricated testimonials, numbers, or logos.
8. SEO hygiene for the site itself: titles/meta/OG per page, schema (WebHostingService / LocalBusiness / Service where honest), sitemap excluding hidden routes, clean semantic HTML, fast (no heavy libs for static content).

## Phase 3 — Signup & intake

1. **Rep-assisted signup** — a rep can sign a client live: pick plan → industry/city (validates exclusivity + spot availability from config) → client details → payment (setup + first month; annual-prepay option applying the bonus-month rule) → confirmation.
2. **Self-serve readiness** — same flow usable without a rep, behind a feature flag `SELF_SERVE_ENABLED=false` (flips on at Gate 3; build it now, ship it dark). Hosting-first positioning makes this the long-term core purchase path — build it like it matters.
3. **Intake → provisioning handoff** — successful signup writes a structured job record (client, plan, industry, city, domain preference, contact) to a queue/collection the spine consumes, and fires an internal notification.
4. **Downgrade path** — internal-only flow moving a cancelling client to `Minimum` instead of full churn. Never publicly linked.
5. Payment: use whatever the audit found; if none, scaffold Stripe (products/prices mapped 1:1 from the pricing config) and record it in `OPEN_QUESTIONS.md` for confirmation.

## Phase 4 — Automation spine scaffolding

Build the integration layer as clean, testable modules with **all credentials via env vars** (`.env.example` documents every key; nothing real committed). Where live credentials don't exist yet, implement against the provider's documented API with a mock/dry-run mode.

1. **OpenSRS module** — register domain (registrant = client's legal details, admin/tech + DNS control = Envosta), set nameservers/DNS to wp.cloud, provision branded email + SSL, renewal handling. Explicit `dry_run` mode. Document the domain-transfer-out procedure for cancellations (client keeps domain).
2. **Provisioning orchestrator** — consumes the signup queue: OpenSRS → wp.cloud DNS/site step (document the manual wp.cloud step precisely wherever no API is available) → Studio build task ticket → GBP setup checklist task → monitoring registration (uptime monitor) → mark client live. Every step idempotent, logged, resumable.
3. **Monthly engine** — scheduled job per client per plan: generate service-area-page tasks at plan cadence (Business = 2/mo, Growth = 4/mo), compile the **branded monthly report** template (site health, uptime, pages shipped, GBP/review stats fields), route both to a **VA QA queue**; nothing ships without QA sign-off.
4. **Runbooks** — `runbooks/provisioning.md` and `runbooks/monthly-engine.md`: exact human steps for anything not yet automatable, written so a VA can execute without Koltyn.

## Phase 5 — Gate dashboard + cleanup

1. **Internal dashboard** (auth-protected): MRR by plan · client count by plan/industry/city · Growth spots remaining per industry · churn %/mo · tickets/client/mo · CAC log (manual entry is fine) · current Gate status with pass-requirements from CLAUDE.md §7 · kill-trigger warnings when thresholds are breached (churn > 5% × 2 months, tickets > 2/client/mo).
2. Delete `/_deprecated/` after Koltyn confirms the audit list.
3. Final sweep: repo-wide search proving zero hits for every term on the Phase 0 violation list — including "agency" used as a self-description. Paste the search proof into `REBUILD_CHANGELOG.md`.

---

## Phase 6 — Data layer & integrations (Supabase · Stripe · OpenSRS · wp.cloud)

Prebuilt modules are provided in this package — adopt them, don't rewrite: `supabase/migrations/0001_init.sql`, `lib/stripe.ts`, `lib/opensrs.ts`, `lib/wpcloud.ts`, `lib/provisioning.ts`, `app/api/webhooks/stripe/route.ts`, `.env.example`.

1. **Claude Code Supabase direct access (do this first, with Koltyn present):**
   - Supabase MCP: `claude mcp add supabase -e SUPABASE_ACCESS_TOKEN=<token> -- npx -y @supabase/mcp-server-supabase@latest --project-ref <project-ref>` — token is a scoped personal access token Koltyn creates in Supabase account settings; use a dev project first.
   - CLI link + migrations: `supabase link --project-ref <ref>` then `supabase db push` to apply `0001_init.sql`. Verify tables, enums, RLS, and seeds (locked plan numbers) landed exactly.
2. **Stripe bootstrap script** (`scripts/bootstrap-stripe.ts`): read the `plans` table, create one Product per plan and three Prices (monthly recurring; one-time setup; annual recurring at 12× monthly billed yearly = the 13th-month-free bonus), then write the price IDs back onto `plans`. Idempotent — safe to re-run. Never create discounts or coupons.
3. Wire the webhook route; register the endpoint in Stripe (test mode) and verify the full loop: rep-assisted checkout (test card) → `checkout.session.completed` → mirrors populated → `provisioning_jobs` row created → `runJob` executes in dry-run and produces a complete, logged step trace ending `blocked` at `studio_build` (the human step).
4. OpenSRS: run against the **test (horizon) environment** with real credentials; verify `lookupDomain` live and `registerDomain`/`setNameservers` in dry-run. Confirm server IPs are whitelisted in the RCP.
5. wp.cloud: replace every `VERIFY` endpoint in `lib/wpcloud.ts` with the exact paths from Koltyn's partner docs, set `WPCLOUD_NAMESERVERS`, and keep `PROVISIONING_DRY_RUN=true` until a full dry trace passes review.
6. Monthly engine job (cron or Supabase scheduled function): for each active client, create the plan-cadence `deliverables` (Business = 2 pages, Growth = 4 pages + report) on the 1st, routed to QA.

## Phase 7 — Customer & admin dashboards (Supabase-backed, fully functional)

Auth: Supabase Auth (email magic link + password). Every signup creates a `user_profiles` row; clients are linked to their `clients` row at onboarding. All reads go through RLS — the dashboards contain **zero** service-role calls; service role lives only in webhooks/orchestrator/server actions.

**Customer dashboard (`/dashboard`):** site status card (domain, SSL, live state, uptime), this month's deliverables with published links, monthly report archive, service requests (submit + track through the five-step loop with SLA timestamps visible — the Service Promise made legible), invoices (hosted Stripe links), plan card (no self-serve plan changes; "talk to us" CTA), Growth clients additionally see the guarantee tracker (baseline calls vs. tracked calls, months elapsed of 6).

**Admin dashboard (`/admin`, role-gated to admin/staff):** everything from Phase 5's gate dashboard now reading live Supabase data (`live_mrr` view, churn calc, tickets/client from `service_requests`, CAC from `cac_entries`, kill-trigger banners), plus: provisioning queue with per-step traces and **resume** buttons for manual steps (`resumeJob`), QA queue (deliverables in `qa` → approve/publish), clients table with spot/exclusivity view per industry, leads pipeline (Scorecard funnel statuses), guarantee-liability panel (every Growth client's make-good status), Stripe event log with error surfacing.

## Phase 8 — New frontend build + staging swap of the current site

1. **Preserve first:** create branch `legacy-site`, then move the current marketing site into `/staging-legacy/` on `main` (or keep it deployed at `staging.envosta.com`). Nothing is deleted; the old site must remain viewable until cutover sign-off.
2. **Build the new frontend at the repo root** per Phases 2–3 specs, the brand system (CLAUDE.md §5), and `ENVOSTA_OFFER_SPEC.md`: homepage (identity line, Hook–Story–Offer, commodity-anchor kill block, provenance strip, future-proof block), hosting plans page (guarantees displayed per spec §3, five-bonus stack on the Growth/Local Domination Program page), industry/city templates with live spot status, Scorecard funnel (opt-in → Epiphany Bridge page → application → booking), The Stack page, Service Promise page, checkout entry (rep-assisted now, self-serve dark behind flag).
3. **Cutover checklist (all must pass before the swap is final):** every acceptance criterion below green · Lighthouse ≥ 90 mobile on home/plans/industry pages · all forms Turnstile-verified server-side · 301 map from every legacy URL · sitemap/robots correct · rollback documented (repoint to `legacy-site` branch).

## Phase 9 — Security hardening & go-live gate

Verify and record evidence in `REBUILD_CHANGELOG.md`:
1. Secrets: `.env.local` git-ignored; repo history scanned for leaked keys; service-role key absent from all client bundles (`grep` the build output); anon key is the only Supabase key shipped to browsers.
2. RLS: automated tests proving a client user cannot read another client's rows on every client-visible table, and anon can read nothing.
3. Webhooks: signature verification on (test with an invalid signature → 400); idempotency ledger prevents double-processing (replay a delivery).
4. Admin routes: server-side role checks (not just UI hiding); no admin API callable by a client session.
5. Headers & transport: HSTS, X-Content-Type-Options, frame-ancestors, referrer-policy; no mixed content.
6. Rate limiting on public POST endpoints (leads, applications); Turnstile validated server-side, never trusted from the client.
7. Dependency audit clean (`npm audit` — no criticals); lockfile committed.
8. OpenSRS/wp.cloud: credentials only in env; IP allowlist active; `PROVISIONING_DRY_RUN` flips to `false` only after Koltyn approves a reviewed dry trace in-session.

## Acceptance criteria (definition of done)

- [ ] `AUDIT.md`, `REBUILD_CHANGELOG.md`, `OPEN_QUESTIONS.md` exist and are current.
- [ ] Zero occurrences anywhere of: `$49`/`$132`/`$517` plans, `Studio Lite`, `Studio Premium`, `Booked`, `Booked+`, `Market Leader`, `Floor` (as a plan), `Jetpack`.
- [ ] The site reads hosting-first everywhere: Envosta is never self-described as an agency, web design company, marketing company, or studio; every plan surface frames the tiers as hosting plans that include the site + marketing.
- [ ] "The Stack" provenance section exists on the homepage and as its own page, using **only** the approved claims from CLAUDE.md §1 — repo-wide search shows no unanchored superlatives ("best in the world", "luxury", "premium", "high-end" as self-descriptions) and no speculative AI hype outside claim #5's demonstrated form.
- [ ] Scope phrasing is correct everywhere: "run and manage your entire online presence" — zero occurrences of "run your business" or equivalents implying operations/dispatch/invoicing.
- [ ] The white-glove register is demonstrated in copy (concierge line, hands-free language, exact SLAs) and in design (quiet-luxury rules from CLAUDE.md §5: no popups, no countdowns, no exclamation marks).
- [ ] All prices, plan contents, industries, and spot counts render from config; changing a value in config changes it everywhere; adding an industry requires zero code changes.
- [ ] Minimum plan invisible to the public web (nav, sitemap, pricing, schema, search) yet functional internally.
- [ ] Growth spot counts are real, per-industry, config-driven — no fake scarcity anywhere on the site.
- [ ] The commodity-anchor kill block exists on the homepage and plans page (why $297 hosting ≠ $10 hosting).
- [ ] Scorecard funnel captures leads end-to-end with Turnstile; submissions land somewhere a human sees them.
- [ ] Signup flow completes rep-assisted end-to-end in test mode; self-serve exists behind its flag, off.
- [ ] OpenSRS + orchestrator modules run in dry-run mode end-to-end and produce a correct, logged provisioning trace.
- [ ] Monthly engine generates the correct task cadence per plan and a filled report template routed to the QA queue.
- [ ] Dashboard shows all Gate metrics and flags kill triggers.
- [ ] No forbidden claims (guaranteed rankings/leads, ads/PPC, fake proof) anywhere in rendered copy.
- [ ] Secrets only in env; `.env.example` complete; nothing sensitive committed.
- [ ] Site passes basics: mobile layouts, visible keyboard focus, reduced-motion respected, brand system per CLAUDE.md §5.
- [ ] Migration `0001_init.sql` applied; seeds match the locked plan numbers exactly; RLS enabled on every table.
- [ ] Stripe test loop proven end-to-end: checkout → webhook → mirrors → provisioning job with a complete dry-run step trace.
- [ ] OpenSRS verified against the test environment (live lookup + dry-run register/NS); wp.cloud `VERIFY` endpoints replaced from partner docs; `PROVISIONING_DRY_RUN` still `true` at handoff.
- [ ] Customer and admin dashboards fully functional on RLS-scoped Supabase reads; zero service-role usage in dashboard code; guarantee tracker and kill-trigger banners live.
- [ ] Offer layer implemented verbatim in spirit from `ENVOSTA_OFFER_SPEC.md`: both guarantees displayed with their conditions, exactly five named bonuses, Growth pitched as the Local Domination Program, setup fees never discounted anywhere (no coupon/discount code paths exist).
- [ ] Legacy site preserved on `legacy-site` branch and `/staging-legacy/`; 301 map in place; rollback documented; new frontend serves at root only after the cutover checklist passes.
- [ ] Phase 9 security checklist complete with evidence pasted into `REBUILD_CHANGELOG.md`.

## What NOT to do

- Do not redesign the business model, pricing, plans, SLAs, positioning (category · specialization · register · provenance), or the industry roadmap — frozen 12 months as of Rev 1.3.
- Do not resolve Open Decisions (CLAUDE.md §9) — flag them.
- Do not touch live DNS, live billing, or deployed client sites without explicit go-ahead in-session.
- Do not fabricate testimonials, client counts, results, or urgency.
- Do not add scope. If you spot a genuinely valuable improvement outside this brief, add it to `OPEN_QUESTIONS.md` under "Proposed, not built."
