# REBUILD CHANGELOG

Per `ENVOSTA_REBUILD_BRIEF.md`: appended after every phase — what changed and why.
All rebuild work lives on the `rebuild` branch. `main` keeps serving production
(my.envosta.com — live paying customers) untouched until the Phase 8 cutover
checklist passes.

---

## Step 0 — Materialize handoff files (2026-07-03) · commit `cba6aed`

- Extracted all 10 embedded files from `ENVOSTA_MASTER_HANDOFF.md` (Rev 1.4)
  byte-for-byte via marker-parsing script (no hand-retyping):
  `CLAUDE.md`, `ENVOSTA_OFFER_SPEC.md`, `ENVOSTA_REBUILD_BRIEF.md`,
  `envosta-operating-charter.html`, `supabase/migrations/0001_init.sql`,
  `lib/{stripe,opensrs,wpcloud,provisioning}.ts`,
  `app/api/webhooks/stripe/route.ts`, `.env.example`.
- Copied `ENVOSTA_MASTER_HANDOFF.md` itself into the repo root for provenance.
- **Note:** the repo already had a `.env.example` (old model's vars); the
  handoff's version replaced it per Step 0 instructions. The old one is intact
  on `main`.
- **Placement caveats logged (resolve at Phase 1/6 integration, not now):**
  1. Repo uses `src/app` + `src/lib`; the prebuilt modules landed at root
     `app/` + `lib/` per their exact embedded paths. Next.js prefers a root
     `app/` over `src/app`, so builds on this branch are expected to be broken
     until the modules are adopted into `src/` during integration. `main` is
     unaffected.
  2. `supabase/migrations/0001_init.sql` now sits alongside the production
     project's dated migrations. It must NEVER be pushed to the production
     Supabase project (tables `domains`, `sites`, etc. already exist there
     with different shapes and live data) — it targets a fresh DEV project
     (Koltyn-only item #2 in the handoff).

## Phase 0 — Audit (2026-07-03)

- Produced `AUDIT.md` (read-only audit): stack inventory, full route map with
  conformance verdicts, violation list vs the Rev 1.4 charter, reusable
  assets, risk notes on live wiring.
- Created `OPEN_QUESTIONS.md` seeded with the charter's Open Decisions plus
  operational blockers discovered during the audit.
- No application files modified in this phase.

## Phase 1 — Purge & single source of truth (2026-07-03)

**Canonical config created (`src/config/`, imported as `@/config/*`):**
- `pricing.ts` — the frozen four-plan ladder verbatim from CLAUDE.md §2
  (Minimum hidden `hidden: true` / Basic / Business / Growth incl. setup
  fees, layers, contents, 12-spot Growth cap), annual prepay as the
  13th-month **bonus** (never a discount), Service Promise SLAs (§3),
  currency as a flag (`CURRENCY`, default USD — Open Question #2), plus
  helpers (`publicPlans`, `annualPrepayCents`, formatting).
- `industries.ts` — HVAC + roofing with per-industry vocabulary tokens
  (zero trade-specific hardcoding downstream), growth caps, and the
  exclusivity spot ledger + real-count helpers (`spotsRemaining`,
  `citySpotStatus`). Adding an industry = adding config only. Ledger moves
  to the `industry_spots` table at Phase 6 behind the same helpers.
- `offer.ts` — the two locked guarantees, exactly five Growth bonuses,
  program + lead-magnet names (bonus dollar values intentionally omitted
  until defensible vendor-equivalent numbers exist — no invented values).
- Old pages still read the DB `products` table; they are all REWORK-class
  and get rebuilt onto config in Phase 2/3 (rewiring doomed pages was
  skipped deliberately).

**Moved to `/_deprecated/` (git mv, structure preserved; excluded from
tsconfig):** Jetpack integration lib + admin endpoint + status panel;
reseller lib/route/toggle; coupons route + coupon-manager;
promotions pages (both); design-packages (Studio Lite/Premium);
/resellers marketing page + lead form; the entire site add-on system
(routes, addon-effects lib, site-addons UI ×2, services/addons, admin
settings page); stale `docs/architecture-audit.md`.

**Banned mechanics stripped from kept code:**
- Coupons/discounts/promo codes: removed from create-subscription (promo
  code + reseller coupon), create-site, reactivate-site, site-transfer,
  admin-precreate-subscription (+ its couponCode arg), both admin create
  flows (UI fields + route params + audit stamps), roles route map.
- Add-on machinery: removed from create-subscription (addonSlugs bundle),
  the Stripe webhook (site_addons writes, addon audit, parseAddonSlugs),
  update-site-plan workflow (reapplyAddonEffects step), checkout flow
  props, dashboard site tabs, admin settings tabs.
- Jetpack: partner-license attach + plan-slug + attribution stamping
  removed from provision-site; JetpackStatus panel removed from admin
  services page; Jetpack removed from homepage integration logos +
  products-page copy + diagnostics provider filter. KEPT deliberately:
  the wp.cloud-native `jetpack_backup`/`jetpack_waf` site-meta **API keys**
  (provider names for wp.cloud's own backup/WAF — charter §4 says use
  wp.cloud's native features) and the provision/bootstrap steps that
  **delete the Jetpack plugin** from every site (enforces the ban).

**Also:** handoff's root `app/`+`lib/` modules relocated byte-identical to
`handoff/` (root `app/` would hijack Next's router away from `src/app`);
tsconfig excludes `handoff` + `_deprecated`. `npx tsc` clean; `next build`
green (68 pages).

**Deferred to later phases (documented, deliberate):** trials + self-serve
checkout (Phase 3 replaces the signup flow), old plan surfaces reading the
DB (Phase 2), production-data cleanup (products rows for addons/old plans,
site_addons table, users.metadata.reseller — cutover task, OPEN_QUESTIONS
#8/#9), `.claude/settings.local.json` Jetpack permission entries (local
dev-harness file, not app code).

## Phase 2 — Marketing site rework, hosting-first IA (2026-07-03)

**Brand system (charter §5):** Archivo + IBM Plex Mono added via next/font;
`brand.css` design system (blueprint navy #0A1929 / panel / edge, amber
#FFB627 accent, paper text, clay for warnings only; blueprint grid texture,
technical-drawing panels, mono eyebrows, 48px touch targets, visible focus,
reduced-motion). Scoped under `.mk2` so unrebuilt legacy pages keep working
until retired.

**Pages built (all config-driven — zero pricing/industry literals):**
- `/` homepage — identity line, Hook–Story–Offer, commodity-anchor kill
  block, provenance strip (approved claims only), future-proof block (claim
  #5 demonstrated form), service-promise strip, proof section with
  `PROOF: pending real client data` marker (no fabricated content), CTA.
- `/plans` — Basic/Business/Growth as stacked hosting layers, monthly price
  leading + setup after, live Growth spot counts per industry, both locked
  guarantees with conditions, the five Growth bonuses, "13th month free"
  bonus framing, SLA strip. Hidden Minimum appears nowhere. `/pricing`
  re-exports `/plans`.
- `/industries` + `/[industry]/[city]` template — parameterized per
  config; honest per-city exclusivity status; unknown industries 404;
  `/hvac/calgary` + `/roofing/calgary` prerendered, other cities on demand.
- `/scorecard` — Local Domination Scorecard opt-in (name, business,
  industry, city, URL, phone) → thank-you state. Turnstile renders when
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set; `/api/scorecard` verifies
  server-side when the secret is set, rate-limits per IP, lands leads as
  `tickets` (type='scorecard') + sales email (Phase 6 moves to `leads`).
- `/service-promise` — SLAs verbatim from config, five-step intake loop
  visualized, covered-vs-quoted boundary.
- `/stack` — duct-tape vs canonical story, all five approved provenance
  claims with proof anchors, Calgary/founder-led/direct-partner facts.

**IA + SEO:** nav/footer rebuilt to Hosting Plans · Industries · Service
Promise · The Stack with "Get Your Scorecard" as the CTA (old checkout CTAs
removed from chrome). Layout metadata + Organization JSON-LD rewritten
hosting-first; JSON-LD offers now derive from `publicPlans()` (hidden
Minimum excluded from structured data). Sitemap rebuilt: new IA + per-
industry city pages from config; old-model pages removed.

**Deprecated additionally:** `/products`, `/method`, `/onboarding` (old-
model copy, now unlinked) → `/_deprecated/`.

**Verification:** tsc clean; `next build` green (71 routes incl.
/hvac/calgary + /roofing/calgary); preview-checked homepage, scorecard
form, industry template (honest "12 of 12 spots open" status), unknown-
industry 404; zero console errors.

**Still old-model (Phase 3 scope):** `/get-started` self-serve checkout +
`/intake`, `/contact`, `/domains`, `/buy-domain`, `/support`, blog seed
content — the signup/intake rework replaces or re-skins these.

## Phase 3 — Signup & intake (2026-07-03)

**One flow, two motions (`/signup`):**
- Rep-assisted (live now): requires a logged-in staff session — "rep closes
  live on envosta.com" (charter §4). Rep sessions are audit-logged.
- Self-serve: the identical flow opens to the public when
  `SELF_SERVE_ENABLED=true` (`src/config/flags.ts`) — built now, shipped
  dark per Gate 3. Public visitors meanwhile see the rep-assisted explainer
  routing to the Scorecard funnel.
- Steps: plan (config; hidden Minimum unselectable by construction) →
  monthly/annual toggle (annual = 12× monthly billed yearly, framed
  strictly as the 13th-month-free bonus) → industry + city with LIVE
  Growth exclusivity validation from the config ledger (open/reserved/
  taken + spots remaining, re-validated server-side; 409 when a city is
  taken) → client details + domain preference (register new / have one /
  not sure) → order summary → Stripe Checkout.

**Payment (`/api/signup-checkout`):** Stripe Checkout Session (subscription
mode) charging the exact config numbers via inline `price_data` — pricing
cannot drift from config; catalog Prices arrive with Phase 6's bootstrap
(seam documented in the route). Setup fee rides the first invoice as a
one-time line and has NO code path that omits, waives, or discounts it
(offer spec Call 2). Gate enforced server-side (staff session or flag);
non-staff callers additionally pass Turnstile once keys are configured
(`src/lib/turnstile.ts`, shared with the Scorecard route). Rate-limited.

**Intake → provisioning handoff (webhook):** on
`checkout.session.completed` with `envosta_flow='signup_v2'`, the webhook
writes the structured job record — client, plan, billing, industry, city,
domain preference, contact, rep, Stripe ids — and fires the internal
notification email. Pre–Phase 6 the queue is a `tickets` row
(type='signup') whose metadata carries the exact future
`provisioning_jobs` payload; Phase 6 swaps storage without changing the
contract.

**Downgrade path (brief Phase 3.4):** satisfied by the existing
internal-only admin PlanSwitcher (admin → customer → site → plan) which
can move a cancelling client to the hidden Minimum plan; nothing public
links Minimum, and the new /signup flow cannot select it. The new-model
`clients.plan_key` downgrade lands with Phases 6–7.

**Old self-serve retired:** `/get-started` now redirects to `/scorecard`
(self-serve returns at `/signup` behind the flag); old checkout components
(get-started-flow, site-checkout-flow, embedded-checkout, both
pricing-client files) + `/intake` page + `/api/intake` moved to
`/_deprecated/`; auth-signup redirect, login link, and domains-page CTA
repointed.

**Verification:** tsc clean; build green (/signup dynamic + /signup/complete
+ /api/signup-checkout present); preview-verified — public `/signup` shows
the gated explainer (flow markup absent), public POST to the checkout API
returns 403 with no Stripe session created.

## Phase 4 — Automation spine scaffolding (2026-07-03)

**Spine modules adopted (`src/spine/` — handoff's prebuilt modules, per
"adopt, don't rewrite"):**
- `opensrs.ts` — registrar client: register IN THE CLIENT'S NAME
  (registrant = client legal details; Envosta = admin/tech + DNS control),
  nameservers → wp.cloud, `PROVISIONING_DRY_RUN` blocks every live
  mutation unless explicitly 'false', all calls logged to `opensrs_events`
  (credentials never logged). Transfer-out procedure documented in the
  provisioning runbook.
- `wpcloud.ts` — site create / domain map / SSL confirm with the same
  dry-run + `wpcloud_events` logging. `VERIFY` endpoint markers intact
  (Koltyn-only item #3) with a pointer to the PROVEN production client at
  `src/lib/integrations/wpcloud.ts` to fold in at Phase 6.
- `provisioning.ts` — the idempotent, resumable orchestrator:
  register_domain → configure_dns → create_site → map_domain → issue_ssl →
  studio_build/gbp_setup/monitoring (manual: creates the task, blocks,
  `resumeJob` continues) → go_live (stamps Growth `guarantee_start_at`).
  Steps journal into `provisioning_jobs.steps`; re-runs skip completed
  steps.
- Adoption-level adaptations only (documented): lazy service-role client
  with env fallbacks (`SUPABASE_URL`→`NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`→`SUPABASE_SECRET_KEY`), imports repathed
  `@/lib/*`→`@/spine/*`. All spine writes target the NEW schema (Phase 6
  dev project); the legacy integrations keep running production until
  cutover.

**Monthly engine (new, brief 4.3):** `src/spine/monthly-engine.ts` +
`/api/cron/monthly-engine` (vercel.json + cron registry: 1st of month,
08:00 UTC). Per active client: service-area-page tasks at plan cadence
READ FROM CONFIG (Business 2 / Growth 4) + the branded monthly-report
template (site health, uptime, pages shipped, GBP/review stat fields) —
all created status='planned' into the VA QA queue; nothing ships without
sign-off. Idempotent per (client, period, deliverable). Pre–Phase 6 it
no-ops with `schemaReady:false`, so the cron ships now and comes alive
when the schema lands.

**Runbooks (brief 4.4):** `runbooks/provisioning.md` (signup ticket → live
in 9 steps, manual steps spelled out, Growth baseline-calls capture, the
domain transfer-out procedure, failure escalation) and
`runbooks/monthly-engine.md` (QA loop + status flow + per-type checklists
with the forbidden-claims guardrails) — written for a VA to execute
without Koltyn.

**Verification:** tsc clean; build green; `/api/cron/monthly-engine` in the
route manifest; cron registry + vercel.json in sync.

## Phase 5 — Gate dashboard + cleanup (2026-07-03)

**Gate dashboard (`/admin/gates`, admin-only, in the admin nav):**
- Thresholds/definitions live in `src/config/gates.ts` (charter §8
  verbatim: Gates 0–4 with pass requirements + unlocks, the three kill
  triggers, canonical metric definitions) — never hardcoded in components.
- Live metrics from current production data, each labeled with its source:
  MRR by plan (active sites × plan price), active clients, churn %/mo
  (approximated from cancellations), tickets/client/mo, Growth spots per
  industry from the config ledger.
- Current-gate indicator + distance to the next gate; kill-trigger banners
  fire red when churn > 5% or tickets > 2/client/mo, with the charter's
  consequences spelled out.
- CAC log: manual monthly entry (spend, hours × rate, closed clients) via
  `/api/admin/cac-entry` into `platform_settings` KV (`cac:YYYY-MM`);
  CAC + payback computed per the canonical definition (margin ≈ 90%,
  charter §2 arithmetic, formula shown). Phase 6 migrates the log to
  `cac_entries`.
- Phase 7 swaps the reads to new-schema live views without changing the
  page's shape.

**Final violation sweep (Phase 5.3) — proof:**
- `$49|$132|$517|Studio Lite|Studio Premium|Market Leader|Booked+|`
  `jetpack_plan_slug|resellerCoupon|promotion_code` across `src/`:
  **zero functional hits** — remaining matches are comments stating the
  ban ("No coupons or discounts exist (charter §7)") and one WooCommerce
  feature description inside old seed-blog fixture content (flagged below).
- `jetpack` across `src/`: 28 occurrences / 7 files, ALL in the allowed
  categories: (a) wp.cloud's own site-meta API key names
  (`jetpack_backup`/`jetpack_waf` — the platform's native backup/WAF,
  which the charter mandates using), (b) the provisioning code that
  DELETES the Jetpack plugin from every site (the ban's enforcement),
  (c) the security comment banning `jetpack_blog_token` from ever being
  mirrored, (d) docs pointers. Zero Jetpack product/licensing/UI code
  remains.
- "Reseller" as a word survives only in OpenSRS/Tucows contexts: the
  registrar's own "Reseller Control Panel" terminology and the
  Tucows-mandated registration agreement text in /legal/terms (Envosta is
  the "Reseller" party in Tucows's required contract language).

**Deferred, needs Koltyn:**
- Deleting `/_deprecated/` (Phase 5.2) — awaiting explicit confirmation of
  the audit list; deprecate-before-delete stands until then.
- Old seed-blog fixture content (`/api/admin/seed-blog`) still carries
  old-model copy (free-trial CTAs, feature lists) — replace or retire the
  fixture as part of the Phase 8 content pass.

**Verification:** tsc clean; build green (`/admin/gates` +
`/api/admin/cac-entry` in the manifest).
