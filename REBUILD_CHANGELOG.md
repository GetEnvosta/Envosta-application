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
