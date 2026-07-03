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
