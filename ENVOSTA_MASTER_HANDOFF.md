# ENVOSTA — MASTER HANDOFF (single document, Rev 1.4)
Generated 2026-07-03 · Everything Claude Code needs is in this one file.

## INSTRUCTIONS FOR CLAUDE CODE — READ FIRST

**Step 0 — materialize the repo files.** This document embeds every governance doc and code file between `===== FILE: <path> =====` and `===== END FILE =====` markers. Before doing anything else, write each block to its exact path, byte-for-byte. Create directories as needed. Do not modify contents while writing them.

**Step 1 — read `CLAUDE.md`** (the first embedded file). It is the permanent source of truth; on any conflict, it wins.

**Step 2 — execute `ENVOSTA_REBUILD_BRIEF.md` from Phase 0 through Phase 9, in order, no skipping.** One commit per phase. Maintain REBUILD_CHANGELOG.md and OPEN_QUESTIONS.md as instructed.

## THREE THINGS ONLY KOLTYN CAN DO (Claude Code: prompt him at the right moments)
1. **Secrets:** paste real values into `.env.local` and the deploy platform's secret manager. Real keys never enter chat, git, or this document.
2. **Supabase direct access:** create a scoped personal access token in Supabase account settings, then run:
   `claude mcp add supabase -e SUPABASE_ACCESS_TOKEN=<token> -- npx -y @supabase/mcp-server-supabase@latest --project-ref <project-ref>`
   Then `supabase link --project-ref <ref>` and `supabase db push` to apply the migration.
3. **wp.cloud endpoints:** pull exact API paths from the partner docs into every `VERIFY` marker in `lib/wpcloud.ts`. `PROVISIONING_DRY_RUN` stays `true` until Koltyn approves a full reviewed dry trace.

## KICKOFF PROMPT (Koltyn pastes this into Claude Code)
> Read ENVOSTA_MASTER_HANDOFF.md in full. Execute Step 0 (materialize all embedded files), then read CLAUDE.md, then execute ENVOSTA_REBUILD_BRIEF.md from Phase 0 through Phase 9 in order. Do not skip phases. Ask me only for the three human-only items when you reach them.

---

===== FILE: CLAUDE.md =====
# CLAUDE.md — Envosta

This file is the permanent source of truth for this repository. Every change to this codebase must conform to it. If any code, copy, config, or content in the repo contradicts this file, **the repo is wrong and this file wins.** Do not modify this file unless Koltyn explicitly instructs it in the current session.

Companion documents:
- `ENVOSTA_REBUILD_BRIEF.md` — the one-time rework mission (phases, scope, acceptance criteria)
- `ENVOSTA_OFFER_SPEC.md` — the Hormozi/Brunson offer layer (guarantees, bonuses, funnels, scripts)
- `envosta-operating-charter.html` — the human-readable locked charter, Rev 1.4 (reference artifact, keep in repo)

---

## 1. What Envosta is

**Envosta is a managed WordPress hosting company that specializes by industry.** Canadian, headquartered in Calgary, founded by Koltyn. Direct Automattic partner running on **wp.cloud** — not a WordPress.com customer, not a reseller. The infrastructure story ("same infrastructure as WordPress.com — direct Automattic partner") is a **headline trust asset**, not hidden cost-of-goods.

**Positioning formula — four slots, all filled, frozen with Rev 1.2 (use everywhere):**
- **Category:** hosting company. Trustworthy, permanent, understood — businesses expect to pay monthly for hosting forever.
- **Differentiator:** industry specialization. Envosta only hosts the industries it chooses — and because it specializes, every hosting plan comes with the industry-specific site, SEO, and reputation work built in.
- **Register:** white-glove, hands-free. The luxury of never lifting a finger — demonstrated through SLAs, concierge language, and flawless design, never self-declared (see §6).
- **Provenance:** the canonical stack, not duct tape. Competitors piece together page builders, commodity hosting, random registrars, and plugin sprawl; Envosta runs the canonical stack end to end.

**Approved provenance claims (the only superlatives permitted — each anchors to a checkable fact):**
1. "WordPress powers over 40% of the web" — the world's dominant CMS.
2. "Hosted on wp.cloud — the infrastructure platform built by Automattic, the makers of WordPress; the same infrastructure behind WordPress.com. Envosta is a direct Automattic partner, not a reseller."
3. "Domains on Tucows/OpenSRS — the world's second-largest domain registrar, the same platform behind Shopify's domain registration." (Verifiable: Shopify's own domain registration agreement is the Tucows agreement; WHOIS on Shopify-bought domains shows Tucows Domains Inc.)
4. "The same software behind WhiteHouse.gov, NASA.gov, and countless Fortune 500 web properties — run on infrastructure built by WordPress's own maker, and managed for you." (Verifiable: both sites publicly run WordPress.)
5. **AI-ready, demonstrated not promised:** "Every Envosta site is built and maintained through an AI-native pipeline today — and because WordPress is the dominant open platform, every AI advance targets it first. As the technology moves, your site moves with it, and Envosta manages every step for you." Never phrase AI-readiness as speculation; anchor it to the pipeline Envosta actually runs.

Do not invent additional superlatives. "Best hosting in the world"-style unanchored claims are rewritten into one of the five forms above. **Scope guardrail:** Envosta runs and manages the client's **entire online presence** — never "runs your business" (business operations, dispatch, scheduling, invoicing are explicitly out of scope in copy).

**Reference model:** the plan structure is deliberately modeled on the proven subscription digital-marketing playbook (Townsquare Interactive: hosting + website as the base subscription, marketing layers stacked on top, ~$300/mo base, 20,000+ subscribers, $73M/yr) — run industry-specialized instead of generic, at Envosta's locked price points, with the automation spine replacing their ~300-person labor force.

**Industry roadmap:** beachhead is the construction trades — the stickiest, most reachable, highest-ticket vertical (HVAC or roofing first, see Open Decisions; one metro cluster; adjacent trades next). Later verticals: **legal, then professional services.** Any future industry must pass all four qualification tests: (1) local-intent search demand, (2) high-ticket jobs where one booked client pays for the plan, (3) review-driven trust decisions, (4) service-area structure that maps to service-area pages. **Per-industry, per-city exclusivity** on the Growth plan is a core, genuine structural promise — never dilute it. In code and config, the abstraction is `industry` (trades are the launch industries); adding an industry — including non-trade verticals like legal — must be a config change, not a code change, so nothing trade-specific may be hardcoded in templates, copy patterns, or schema.

## 2. The hosting plans — FROZEN until 2027-07-02

Four hosting plans in the reference-model shape: a hosting+site base, marketing layers above it. No renames. No new plans. No price changes. No discounts. Do not generate, suggest, or scaffold alternative pricing anywhere in this codebase.

| Plan | Visibility | Setup | Monthly | Contents |
|---|---|---|---|---|
| **Minimum** | Hidden — never advertised, never linked publicly | — | $36/mo | Hosting + domain kept alive. Retention/downgrade net only. |
| **Basic** | Public | $1,500 | $297/mo | **Industry-specialized managed hosting on wp.cloud** · custom Studio-built site migrated live · domain + branded email · GBP setup · click-to-call + quote-request forms on every page · unlimited small edits · security/backups/updates/uptime · monthly branded report. **No recurring marketing labor.** |
| **Business** | Public | $1,500 | $597/mo | Everything in Basic **+ the marketing layer:** automated SEO foundation · **2 ranking-targeted service-area pages/month** · review generation · citation management · ongoing GBP optimization · priority support. |
| **Growth** | Public — **hard-capped at 12 spots per industry** | $2,500 | $3,472/mo | Everything in Business **+ the full program:** **4 service-area pages/month** · active local SEO · reputation management · lead & call tracking · dedicated account manager · per-industry/per-city exclusivity. All real ongoing human work lives in this plan only. |

- **Annual prepay:** 13th month free. Always framed as a **bonus month**, never a discount or percentage off.
- **Legacy pricing/naming that must not exist anywhere:** $49/$132/$517 hosting plans, "Studio Lite $675", "Studio Premium $15,000", plan names "Booked", "Booked+", "Market Leader", "Floor". If found, remove.

## 3. Service promise (SLAs) — client-facing commitments

- Acknowledge every request in **under 4 hours**
- Basic plan edits live in **under 2 business days**
- Business plan edits live in **under 1 business day**
- Site-down: **immediate**
- Intake loop: client calls/texts one number → request logged → change executed via Studio + Claude workflow → QA pass → confirmation sent back. Five steps, always confirmed.
- Covered vs. paid-project boundary exists: small edits are covered; new builds/redesigns/major features are quoted projects. Copy must never promise unlimited *anything* beyond "unlimited small edits."

## 4. The automation spine (fulfillment architecture)

Signup → provision → live, with one recurring human touch (VA QA) per client per month:

1. **Sign** — rep closes live on envosta.com, or (post–Gate 3) client self-serves. Intake fires the provisioning queue.
2. **OpenSRS (Tucows)** — API registers the domain **in the client's name**; Envosta retains DNS + management control. Branded email + SSL provisioned. Renewal notices sent under Envosta branding. White-label, no monthly minimums. *Client owns, Envosta operates* — never hold domains hostage; transfer-out on cancellation is honored cleanly (client keeps domain; site/content license terms per contract).
3. **wp.cloud** — DNS pointed, site provisioned on Automattic-partner infrastructure. Native security, backups, failover. Never hand-roll infra management that wp.cloud already provides.
4. **Studio + Claude (MCP)** — site built locally in WP Studio via Claude, pushed live with the migration plugin.
5. **GBP** — Google Business Profile setup + optimization. **Cloudflare Turnstile** on every form. External uptime monitor (UptimeRobot or BetterStack) armed.
6. **Monthly engine** — service-area pages generated per plan cadence; **branded monthly report** compiled automatically (no client-visible third-party stats).
7. **VA QA** — human quality pass on pages + report before anything ships. This is the only recurring human labor below Growth.

**Banned from the stack:** Jetpack (anywhere, in any form), client-visible third-party analytics dashboards, PPC/ad-management tooling or promises.

## 5. Brand system

- **Colors:** blueprint navy family (deep `#0A1929`, panel `#0F2438`, edge `#16334E`, steel text `#7FA6C9`) with **amber accent** (`#FFB627`, deep `#E09112`), paper text `#E9F1F8`. Sparse clay red `#D64545` for warnings only.
- **Type:** `Archivo` (display/headings, 700–800), `Inter` (body, 400–600), `IBM Plex Mono` (numbers, data, labels, eyebrows).
- **Texture:** subtle blueprint grid lines, technical-drawing framing, mono eyebrow labels. Dark, precise, engineered — infrastructure a trades owner respects.
- **Register:** quiet luxury. Restraint, space, precision, zero clutter — the site should *feel* expensive without ever saying so. No bargain-web patterns: no popups, no countdown timers, no exclamation marks, no stock-photo handshakes.
- Mobile-first. All numbers/prices render in IBM Plex Mono.

## 6. Voice and copy rules

- **Lead as a hosting company, always.** Envosta is never described as an "agency," "web design company," "marketing company," or "studio" in client-facing copy. The category is hosting; the specialization and outcomes do the differentiating.
- **Luxury is demonstrated, never self-declared.** The words "luxury," "premium," and "high-end" never appear as self-descriptions. The register is proven instead: white-glove onboarding, a concierge line ("one number, call or text"), hands-free everything ("you never lift a finger"), exact SLAs stated as commitments, and flawless design. Rolls-Royce doesn't say luxury; neither does Envosta.
- **Superlatives must anchor.** Only the approved provenance claims from §1 may carry superlatives, phrased in their approved forms. Everything else is stated plainly.
- **Scope phrasing:** "we run and manage your entire online presence" — never "we run your business." Future-proofing copy uses claim #5's demonstrated form, never speculative AI hype.
- **The provenance story ("The Stack") is a standing copy asset:** competitors piece solutions together; Envosta runs the canonical stack — the world's dominant CMS, its maker's own infrastructure, and the registrar platform Shopify runs on. One stack, one number to call.
- **Kill the commodity anchor on sight.** "Hosting" invites $10/mo GoDaddy comparisons. Every plan surface must make the frame unmistakable: this is *industry-specialized managed hosting where the site, the SEO, and the reviews are part of the plan* — which is why plans start at $297, not $10. Comparison copy pattern: cheap hosting rents you a server; Envosta's plan runs your entire online presence for your industry.
- Sell the **outcome** of the plan ("booked jobs", "found on Google", "never think about your website"). Infrastructure appears as trust ("direct Automattic partner — same infrastructure as WordPress.com, not a reseller"), never as specs.
- **Monthly price leads** everywhere; setup fee follows.
- Plain trade-owner language. No agency jargon, no "synergy", no "digital transformation".
- Scarcity is honest only: the 12-spot Growth cap and exclusivity are real — show real remaining-spot counts per industry, never fake countdowns or fake scarcity.
- **Forbidden claims:** guaranteed rankings, guaranteed lead counts, "#1 on Google" promises, PPC/ads services, income claims. SEO results are framed as compounding over months (typical ROI-positive window: 7–9 months), owned assets vs. rented ads.
- Sales framework references: Hormozi offer architecture (value equation, bonus-month prepay, honest scarcity), Brunson funnel (Hook–Story–Offer; lead magnet = **Local Domination Scorecard**; Dream 100 traffic via trade-owner communities).

## 7. The offer layer (Hormozi/Brunson — decided, see ENVOSTA_OFFER_SPEC.md)

- **Guarantees (locked wording concepts):** Growth carries the **Booked-Calls Make-Good** — "more booked calls in your first 6 months than the 6 months before you joined, measured by your call-tracking dashboard, or we work free until you get there" (conditions per spec §3; baseline captured at onboarding into `clients.baseline_calls_6mo`). Basic/Business carry the **Deliverable Guarantee** — every promised page, post, update, and report on time, or that month is free. No other guarantees exist; ranking/lead-count/revenue guarantees remain forbidden.
- **Growth is pitched as "the Local Domination Program"** (sales wrapper only; plan key/name stays `growth`/`Growth` everywhere in billing, config, and DB).
- **Bonus stack:** exactly the five named bonuses in spec §4. No invented bonuses, no invented values.
- **Client-financed acquisition:** setup fees are never waived, discounted, or split; no coupon or discount-code code paths may exist in the codebase.
- **Funnels:** Growth = application funnel (Scorecard → Epiphany Bridge page → application → booked call); Basic/Business = self-serve two-step post–Gate 3. Declined Growth applicants are downsold to Business; cancelling clients are downsold to Minimum.
- **Envosta's own traffic:** Core Four in sequence (warm → cold → content → Dream 100); no paid acquisition before Gate 2. Client ad services remain permanently out of scope.

## 8. Metrics, gates, and kill triggers (build these into any dashboard/admin)

Canonical metric definitions:
- **MRR** by plan; **churn** = % of MRR lost per month; **tickets/client/month**; **CAC** = fully-loaded cost (hours × rate + spend) per closed client; **CAC payback** = CAC ÷ (monthly gross margin per client), setup fee counted.

Gates (sequence is law):
- **Gate 0:** first 10 clients, one industry, one metro. Measure CAC, tickets/client/mo, 90-day churn. No model changes before client 10.
- **Gate 1:** $15K MRR → first VA QA contractor; all recurring processes become SOPs.
- **Gate 2:** $50K MRR → requires churn ≤ 3%/mo, ≤ 1 ticket/client/mo, CAC payback ≤ 4 months. First hire: ops lead.
- **Gate 3:** $150K MRR → self-serve Basic signup launches; industry #2 opens (its own 12 Growth spots).
- **Gate 4:** $400K MRR → self-serve must exceed 50% of new MRR.

Kill triggers: churn > 5%/mo for 2 consecutive months → freeze acquisition; tickets > 2/client/mo → freeze promises/features; any pricing/plan change inside 12 months → rejected.

## 9. Hard constraints for Claude Code (all sessions)

1. Never invent, alter, or A/B test pricing, plan names, plan contents, or SLAs. They come from §2–§3 verbatim.
2. Never reposition Envosta — the four positioning slots (hosting category, industry specialization, white-glove register, canonical-stack provenance) are frozen with Rev 1.2 per §1 and §6. Never describe Envosta as an agency/design shop/marketing company; never self-declare "luxury"; never add unanchored superlatives.
3. Never add Jetpack, and remove it on sight.
4. Never scaffold ads/PPC features or copy.
5. Never implement fake scarcity, fake counters, or fake testimonials. Placeholder proof sections must be clearly marked `<!-- PROOF: pending real client data -->`.
6. All prices, plan contents, Growth spot counts, and the industry list must read from one config/data source (`/config/pricing` + `/config/industries` or equivalent) consumed by every page, script, and API.
7. Secrets (OpenSRS API keys, wp.cloud credentials, Stripe keys) live in environment variables only. Never commit them; scaffold `.env.example` instead.
8. Ask before any destructive operation (deleting pages/content/data). Prefer deprecating to deleting during the rework.
9. When business facts are needed that this file doesn't contain, **stop and ask Koltyn** — do not infer or invent.

## 10. Open decisions — owned by Koltyn, do not decide for him

- Beachhead industry: HVAC vs. roofing (templates must support either).
- Currency display: CAD vs. USD (prices above are the locked numerals; currency labeling TBD — build as a config flag).
- Payment processor confirmation (Stripe integration is prebuilt; confirm the account and mode before live keys).
- Legal: contract/ToS language for domain ownership, cancellation, and the guarantee conditions (draft allowed, ship only after Koltyn approves — the guarantee *concepts* in §7 are decided; the legal terms implementing them need his sign-off).

===== END FILE =====

===== FILE: ENVOSTA_OFFER_SPEC.md =====
# ENVOSTA OFFER SPEC — The Hormozi / Brunson Layer (Rev 1.4)

**Authority:** subordinate to `CLAUDE.md`. This document defines the *offer wrapper* — guarantee, bonuses, naming, funnel, scripts, traffic. It never changes plan names, prices, or contents (frozen). Claude Code turns this into site copy, funnel pages, and email sequences verbatim in spirit, adapted only for length/format.

---

## 1. The main calls (made; not open for redesign)

1. **Prices never move.** The ladder competes as a category of one (industry-specialized white-glove hosting on the canonical stack), never on price. All refinement goes into the value side of the equation.
2. **Setup fees are client-financed acquisition.** $1,500 / $1,500 / $2,500 upfront exists to repay CAC in under 30 days so growth self-funds. Never waived, never discounted, never split. Reps may not negotiate it.
3. **The guarantees are locked** (see §3). Growth carries the outcome make-good; Basic/Business carry the deliverable guarantee. No other guarantees may be invented.
4. **Growth is pitched as "the Local Domination Program."** Plan name in billing/config stays `Growth` (frozen). The Program name is the sales wrapper and matches the lead magnet (Local Domination Scorecard → Local Domination Program).
5. **Annual prepay = 13th month free.** A bonus month, never a percentage discount (continuity logic from Money Models: reward commitment with product, not margin).
6. **Traffic runs the Core Four in sequence:** warm outreach → cold outreach → founder content → Dream 100. Paid ads for Envosta's own acquisition are not permitted before Gate 2 (and client ad services are permanently out of scope).
7. **One funnel per tier motion:** application funnel for Growth; (post–Gate 3) direct checkout for Basic/Business. Declined Growth applicants are downsold to Business in the same call. Cancelling clients are downsold to Minimum before churn.

## 2. Value equation mapping (why this offer is heavy)

Value = (Dream Outcome × Perceived Likelihood) ÷ (Time Delay × Effort & Sacrifice)

- **Dream outcome:** be *the* name for your trade in your city — own the search, own the calls. Exclusivity makes it literal: one client per trade per city.
- **Perceived likelihood:** the canonical stack provenance claims (CLAUDE.md §1), countable deliverables (pages/month shown in reports), the instrumented guarantee, real remaining-spot counts.
- **Time delay — attack it explicitly in copy:** the review engine and GBP optimization produce visible wins in the first 30 days while service-area SEO compounds toward the 7–9 month payoff. Copy always pairs "fast proof" with "compounding asset."
- **Effort & sacrifice — the register kills it:** white-glove, hands-free, one number to call or text, you never lift a finger. This is the locked brand register doing offer work.

## 3. Guarantees (exact concepts; copywriter may polish phrasing, not terms)

**Growth — the Booked-Calls Make-Good (conditional, outcome-based, instrumented):**
> "More booked calls in your first 6 months than in the 6 months before you joined — measured by your own call-tracking dashboard — or we keep working for free until you get there."
- Conditions (stated plainly, not buried): client keeps GBP access granted, answers tracked calls during business hours, program runs uninterrupted 6 months. Baseline = client-attested prior 6-month call volume captured at onboarding.
- Never phrase as ranking guarantees, lead-count promises, or revenue promises (forbidden-claims list stands).

**Basic / Business — the Deliverable Guarantee (SLA-backed):**
> "Every promised page, post, update, and report delivered on time each month — or that month is free."

**Anti-guarantee posture for exclusivity:** spots are never discounted to fill; if a city's spot is taken, it's taken. Scarcity is real or it isn't shown.

## 4. Bonus stack (Growth pitch; each named, each real, values stated honestly as "included, worth $X if bought alone")

1. **White-Glove Migration** — full domain, email, and site migration handled end to end; the client's team touches nothing.
2. **Local Domination Scorecard — Deep Audit edition** — the full competitor + search-presence teardown for their city, delivered in week one.
3. **Review Engine Install & Launch** — the fast-proof system live in the first 30 days.
4. **Call Tracking & Attribution Setup** — the instrumentation that powers the guarantee.
5. **Quarterly Market Strategy Call** — founder-level review of their city's search landscape.
Rules: exactly these five; no invented bonuses; dollar values must be defensible (what a client would pay a vendor for the same item) and consistent site-wide.

## 5. Funnel map (Brunson)

**Value ladder:** Scorecard (free) → Basic ($297) → Business ($597) → Growth ($3,472, 12 spots) → [hidden floor: Minimum $36].

**Growth motion — Application Funnel:**
1. **Opt-in:** Local Domination Scorecard page (name, business, trade, city, URL, phone). Turnstile-protected.
2. **Bridge page:** Epiphany Bridge case-study/VSL page (script skeleton in §6) + "check if your city is open" (live spot status from config).
3. **Application → booked call.** Calendar embed; application asks baseline call volume (feeds the guarantee) and current marketing spend.
4. **Close call:** Hook-Story-Offer + stack + guarantee + honest scarcity (real spot count). Decline path → Business offer same call.
5. **Post-signup:** onboarding concierge sequence (white-glove register from message one).

**Basic/Business motion (post–Gate 3):** two-step self-serve — plan page → checkout (setup + first month), provisioning fires automatically.

**Email — Soap Opera Sequence (5 emails) for Scorecard leads:** (1) here's your scorecard + open loop, (2) the epiphany story, (3) hidden truths — why ads rent and search owns, (4) the stack + guarantee, (5) spots status + application link. Then weekly founder-voice Seinfeld emails.

## 6. Scripts (skeletons Claude Code expands in-voice)

**Hook (homepage/ads-free channels):** "Your competitor is getting the calls that should be yours. Type '[trade] near me' in your city — see who shows up. That spot is ownable. One company per trade per city gets it."

**Epiphany Bridge (founder story spine):** backstory (watching great tradespeople lose to worse ones with better Google presence) → wall (agencies duct-tape tools, hold domains hostage, sell rented ads) → epiphany (the canonical stack + AI-native pipeline makes owned search an operable service) → plan (one trade, one city, one owner) → conflict/proof (deliverables you can count every month) → invitation.

**Close frame:** stack the five bonuses → state price after value → guarantee → real spot count → "the only question is whether your city is still open."

## 7. Traffic — Core Four sequence (with gate locks)

1. **Warm outreach (now):** founder network, past prospects from the May playbook pipeline.
2. **Cold outreach (now):** the existing door/phone playbook, rebuilt scripts pointed at the Scorecard funnel instead of a generic pitch.
3. **Content (now, compounding):** founder-voice posts in trade-owner spaces; every post ends at the Scorecard.
4. **Dream 100 (Gate 1+):** trade Facebook groups, supply houses, contractor podcasts, Tommy Mello-adjacent communities — value first, Scorecard second.
5. **Paid (Gate 2+ only, Envosta's own acquisition only):** never before churn/CAC are proven; never as a client service.

## 8. Metrics the offer must move (ties to charter gates)

- Scorecard opt-in rate ≥ 25% on the opt-in page; application rate from bridge ≥ 10% of opt-ins; close rate on booked calls ≥ 25% (Growth) with Business downsell capturing another 20%.
- Guarantee exposure tracked: every Growth client's baseline call volume recorded at onboarding; make-good liability visible on the admin dashboard.
- If close rate < 15% across 20 consecutive calls, the fix is script/proof iteration — never price, never guarantee removal.

===== END FILE =====

===== FILE: ENVOSTA_REBUILD_BRIEF.md =====
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

===== END FILE =====

===== FILE: supabase/migrations/0001_init.sql =====
-- =============================================================================
-- ENVOSTA — Supabase initial schema (0001_init.sql)
-- Apply with: supabase db push   (or psql $SUPABASE_DB_URL -f this file)
-- Sources of truth: CLAUDE.md (business facts) · ENVOSTA_REBUILD_BRIEF.md
-- Conventions: money in integer cents; all tables RLS-enabled; mirrors keep
-- provider payloads in `raw jsonb` and are written ONLY by service-role code.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------
create type plan_key as enum ('minimum','basic','business','growth');
create type user_role as enum ('admin','staff','client');
create type client_status as enum ('lead','onboarding','active','paused','cancelling','churned');
create type spot_status as enum ('open','reserved','taken');
create type job_status as enum ('queued','running','blocked','failed','done');
create type provisioning_step as enum
  ('register_domain','configure_dns','create_site','map_domain','issue_ssl',
   'studio_build','gbp_setup','monitoring','go_live');
create type domain_status as enum ('pending','registered','dns_configured','transferred_out','expired','failed');
create type site_status as enum ('pending','provisioned','building','live','suspended','deleted');
create type request_channel as enum ('call','text','email','portal');
create type request_status as enum ('new','acknowledged','in_progress','qa','completed','confirmed');
create type deliverable_type as enum ('service_page','gbp_post','review_campaign','monthly_report','site_edit');
create type deliverable_status as enum ('planned','draft','qa','approved','published','skipped');
create type lead_status as enum ('new','scorecard_sent','applied','call_booked','closed_won','downsold','closed_lost');

-- ---------------------------------------------------------------------------
-- HELPERS
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Role helpers used by RLS. Profiles table defined below.
create or replace function current_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from user_profiles where user_id = auth.uid()
$$;

create or replace function current_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from user_profiles where user_id = auth.uid()
$$;

create or replace function is_staff() returns boolean
language sql stable as $$ select current_role() in ('admin','staff') $$;

-- ---------------------------------------------------------------------------
-- CONFIG MIRRORS (single source of truth lives in /config; these tables let
-- the DB enforce integrity and let dashboards join. Seeded below; app syncs.)
-- ---------------------------------------------------------------------------
create table plans (
  key             plan_key primary key,
  name            text not null,
  visible         boolean not null,
  setup_cents     integer not null default 0,
  monthly_cents   integer not null,
  currency        text not null default 'USD',          -- Open Decision: CAD/USD flag
  contents        jsonb not null default '{}'::jsonb,   -- structured plan contents
  stripe_product_id        text,
  stripe_price_monthly_id  text,
  stripe_price_setup_id    text,
  stripe_price_annual_id   text,                        -- 13 months for price of 12
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger t_plans_u before update on plans for each row execute function set_updated_at();

create table industries (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,                     -- 'hvac','roofing','legal',...
  name        text not null,
  family      text not null default 'construction',     -- 'construction','legal','professional'
  vocabulary  jsonb not null default '{}'::jsonb,       -- copy tokens per industry
  growth_cap  integer not null default 12,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger t_industries_u before update on industries for each row execute function set_updated_at();

-- Exclusivity ledger: one Growth client per industry per city. Real scarcity.
create table industry_spots (
  id           uuid primary key default gen_random_uuid(),
  industry_id  uuid not null references industries(id),
  city         text not null,
  region       text not null default 'AB',
  country      text not null default 'CA',
  status       spot_status not null default 'open',
  client_id    uuid,                                    -- fk added after clients
  reserved_until timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (industry_id, city, region, country)
);
create trigger t_spots_u before update on industry_spots for each row execute function set_updated_at();

-- Enforce the hard cap of taken Growth spots per industry.
create or replace function enforce_growth_cap() returns trigger
language plpgsql as $$
declare cap int; taken int;
begin
  if new.status = 'taken' then
    select growth_cap into cap from industries where id = new.industry_id;
    select count(*) into taken from industry_spots
      where industry_id = new.industry_id and status = 'taken'
        and id <> new.id;
    if taken >= cap then
      raise exception 'Growth cap (% spots) reached for this industry', cap;
    end if;
  end if;
  return new;
end $$;
create trigger t_spots_cap before insert or update on industry_spots
  for each row execute function enforce_growth_cap();

-- ---------------------------------------------------------------------------
-- CORE
-- ---------------------------------------------------------------------------
create table clients (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name  text not null,
  email         text not null,
  phone         text,
  industry_id   uuid not null references industries(id),
  city          text not null,
  region        text not null default 'AB',
  plan_key      plan_key not null references plans(key),
  status        client_status not null default 'onboarding',
  stripe_customer_id text unique,
  baseline_calls_6mo integer,          -- powers the Growth Booked-Calls Make-Good
  guarantee_start_at timestamptz,      -- 6-month clock for the make-good
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_clients_industry on clients(industry_id);
create index idx_clients_plan on clients(plan_key);
create trigger t_clients_u before update on clients for each row execute function set_updated_at();

alter table industry_spots
  add constraint fk_spot_client foreign key (client_id) references clients(id);

-- Auth profile: maps Supabase auth.users to a role and (for clients) a client.
create table user_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'client',
  client_id  uuid references clients(id),
  full_name  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_role_needs_client check (role <> 'client' or client_id is not null)
);
create trigger t_profiles_u before update on user_profiles for each row execute function set_updated_at();

-- Scorecard funnel leads.
create table leads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  business     text not null,
  email        text not null,
  phone        text,
  industry_id  uuid references industries(id),
  city         text,
  website_url  text,
  source       text,                                   -- warm/cold/content/dream100
  status       lead_status not null default 'new',
  baseline_calls_6mo integer,                          -- captured on application
  scorecard    jsonb,                                  -- filled audit payload
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger t_leads_u before update on leads for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- STRIPE MIRRORS (written only by the webhook/service code; raw kept verbatim)
-- ---------------------------------------------------------------------------
create table stripe_events (          -- idempotency ledger: process each once
  id          text primary key,       -- evt_...
  type        text not null,
  payload     jsonb not null,
  processed   boolean not null default false,
  error       text,
  received_at timestamptz not null default now()
);

create table stripe_customers (
  id          text primary key,       -- cus_...
  client_id   uuid references clients(id),
  email       text,
  raw         jsonb not null,
  synced_at   timestamptz not null default now()
);

create table stripe_subscriptions (
  id                  text primary key,   -- sub_...
  client_id           uuid references clients(id),
  stripe_customer_id  text references stripe_customers(id),
  plan_key            plan_key,
  status              text not null,      -- stripe-native status string
  current_period_end  timestamptz,
  cancel_at           timestamptz,
  canceled_at         timestamptz,
  raw                 jsonb not null,
  synced_at           timestamptz not null default now()
);
create index idx_subs_client on stripe_subscriptions(client_id);

create table stripe_invoices (
  id                 text primary key,    -- in_...
  client_id          uuid references clients(id),
  subscription_id    text references stripe_subscriptions(id),
  status             text,
  amount_due_cents   integer,
  amount_paid_cents  integer,
  hosted_invoice_url text,
  raw                jsonb not null,
  created_at         timestamptz,
  synced_at          timestamptz not null default now()
);
create index idx_invoices_client on stripe_invoices(client_id);

-- ---------------------------------------------------------------------------
-- OPENSRS MIRRORS
-- ---------------------------------------------------------------------------
create table domains (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients(id),
  domain           text not null unique,
  registrar        text not null default 'opensrs',
  status           domain_status not null default 'pending',
  registrant       jsonb,                 -- client legal details (client owns)
  nameservers      text[] not null default '{}',
  opensrs_order_id text,
  expires_at       timestamptz,
  auto_renew       boolean not null default true,
  raw              jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_domains_client on domains(client_id);
create trigger t_domains_u before update on domains for each row execute function set_updated_at();

create table opensrs_events (
  id         uuid primary key default gen_random_uuid(),
  domain_id  uuid references domains(id),
  action     text not null,               -- lookup/sw_register/set_ns/...
  request    jsonb,                       -- REDACTED: never store credentials
  response   jsonb,
  success    boolean not null,
  dry_run    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- WP.CLOUD MIRRORS
-- ---------------------------------------------------------------------------
create table sites (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id),
  domain_id       uuid references domains(id),
  wpcloud_site_id text unique,
  status          site_status not null default 'pending',
  primary_domain  text,
  ssl_active      boolean not null default false,
  php_version     text,
  raw             jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_sites_client on sites(client_id);
create trigger t_sites_u before update on sites for each row execute function set_updated_at();

create table wpcloud_events (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid references sites(id),
  action     text not null,
  request    jsonb,
  response   jsonb,
  success    boolean not null,
  dry_run    boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- PROVISIONING ORCHESTRATOR (idempotent, resumable state machine)
-- ---------------------------------------------------------------------------
create table provisioning_jobs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id),
  status        job_status not null default 'queued',
  current_step  provisioning_step not null default 'register_domain',
  steps         jsonb not null default '[]'::jsonb,  -- [{step,status,at,detail}]
  attempts      integer not null default 0,
  error         text,
  dry_run       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_jobs_status on provisioning_jobs(status);
create trigger t_jobs_u before update on provisioning_jobs for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- SERVICE PROMISE: intake loop + SLA clock (this table IS the ticket system)
-- ---------------------------------------------------------------------------
create table service_requests (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients(id),
  channel         request_channel not null,
  description     text not null,
  status          request_status not null default 'new',
  sla_ack_due_at  timestamptz not null default now() + interval '4 hours',
  sla_done_due_at timestamptz,                -- set from plan on insert (below)
  acknowledged_at timestamptz,
  completed_at    timestamptz,
  confirmed_at    timestamptz,                -- confirmation sent back = loop closed
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_requests_client on service_requests(client_id);
create index idx_requests_status on service_requests(status);
create trigger t_requests_u before update on service_requests for each row execute function set_updated_at();

-- SLA per plan: basic <2 business days, business <1 business day (approximated
-- in interval form here; business-day math is refined app-side).
create or replace function set_request_sla() returns trigger
language plpgsql as $$
declare p plan_key;
begin
  select plan_key into p from clients where id = new.client_id;
  new.sla_done_due_at :=
    case p
      when 'business' then now() + interval '1 day'
      when 'growth'   then now() + interval '1 day'
      else now() + interval '2 days'
    end;
  return new;
end $$;
create trigger t_requests_sla before insert on service_requests
  for each row execute function set_request_sla();

-- ---------------------------------------------------------------------------
-- MONTHLY ENGINE: deliverables + VA QA queue
-- ---------------------------------------------------------------------------
create table deliverables (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id),
  type          deliverable_type not null,
  title         text not null,
  period        date not null,               -- first of month
  status        deliverable_status not null default 'planned',
  qa_user_id    uuid references auth.users(id),
  published_url text,
  due_at        timestamptz,
  published_at  timestamptz,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_deliv_client_period on deliverables(client_id, period);
create index idx_deliv_status on deliverables(status);
create trigger t_deliv_u before update on deliverables for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- GATE METRICS (charter §5) — monthly snapshots + CAC ledger + live MRR view
-- ---------------------------------------------------------------------------
create table cac_entries (
  id             uuid primary key default gen_random_uuid(),
  month          date not null,
  spend_cents    integer not null default 0,
  hours          numeric not null default 0,
  hourly_cents   integer not null default 0,
  closed_clients integer not null default 0,
  notes          text,
  created_at     timestamptz not null default now()
);

create table gate_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  month              date not null unique,
  mrr_cents_by_plan  jsonb not null,
  churn_pct          numeric,
  tickets_per_client numeric,
  cac_cents          integer,
  cac_payback_months numeric,
  gate               integer,               -- current gate number
  kill_flags         jsonb not null default '[]'::jsonb,
  created_at         timestamptz not null default now()
);

create or replace view live_mrr as
select c.plan_key,
       count(*)                             as active_clients,
       sum(p.monthly_cents)                 as mrr_cents
from clients c
join plans p on p.key = c.plan_key
where c.status = 'active'
group by c.plan_key;

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,                 -- user id / 'system' / 'webhook'
  action     text not null,
  entity     text not null,
  entity_id  text,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Model: service_role (server code, webhooks, orchestrator) bypasses RLS.
-- Staff/admin read-write via role. Clients read ONLY their own rows on the
-- tables that power the customer dashboard. Anon gets nothing (public site
-- reads plans/industries through server routes using service role).
-- ---------------------------------------------------------------------------
alter table plans              enable row level security;
alter table industries         enable row level security;
alter table industry_spots     enable row level security;
alter table clients            enable row level security;
alter table user_profiles      enable row level security;
alter table leads              enable row level security;
alter table stripe_events      enable row level security;
alter table stripe_customers   enable row level security;
alter table stripe_subscriptions enable row level security;
alter table stripe_invoices    enable row level security;
alter table domains            enable row level security;
alter table opensrs_events     enable row level security;
alter table sites              enable row level security;
alter table wpcloud_events     enable row level security;
alter table provisioning_jobs  enable row level security;
alter table service_requests   enable row level security;
alter table deliverables       enable row level security;
alter table cac_entries        enable row level security;
alter table gate_snapshots     enable row level security;
alter table audit_log          enable row level security;

-- Staff/admin: full read; write on operational tables.
create policy staff_read_all  on plans            for select using (is_staff());
create policy staff_read_ind  on industries       for select using (is_staff());
create policy staff_rw_spots  on industry_spots   for all    using (is_staff()) with check (is_staff());
create policy staff_rw_clients on clients         for all    using (is_staff()) with check (is_staff());
create policy staff_rw_profiles on user_profiles  for all    using (is_staff()) with check (is_staff());
create policy staff_rw_leads  on leads            for all    using (is_staff()) with check (is_staff());
create policy staff_read_sc   on stripe_customers for select using (is_staff());
create policy staff_read_ss   on stripe_subscriptions for select using (is_staff());
create policy staff_read_si   on stripe_invoices  for select using (is_staff());
create policy staff_read_dom  on domains          for select using (is_staff());
create policy staff_read_oe   on opensrs_events   for select using (is_staff());
create policy staff_read_sites on sites           for select using (is_staff());
create policy staff_read_we   on wpcloud_events   for select using (is_staff());
create policy staff_rw_jobs   on provisioning_jobs for all   using (is_staff()) with check (is_staff());
create policy staff_rw_req    on service_requests for all    using (is_staff()) with check (is_staff());
create policy staff_rw_deliv  on deliverables     for all    using (is_staff()) with check (is_staff());
create policy staff_rw_cac    on cac_entries      for all    using (is_staff()) with check (is_staff());
create policy staff_rw_gate   on gate_snapshots   for all    using (is_staff()) with check (is_staff());
create policy staff_read_audit on audit_log       for select using (is_staff());
create policy staff_read_sev  on stripe_events    for select using (is_staff());

-- Clients: own-row reads for the customer dashboard.
create policy client_own_profile on user_profiles for select using (user_id = auth.uid());
create policy client_own_client  on clients          for select using (id = current_client_id());
create policy client_own_subs    on stripe_subscriptions for select using (client_id = current_client_id());
create policy client_own_inv     on stripe_invoices  for select using (client_id = current_client_id());
create policy client_own_domains on domains          for select using (client_id = current_client_id());
create policy client_own_sites   on sites            for select using (client_id = current_client_id());
create policy client_own_req     on service_requests for select using (client_id = current_client_id());
create policy client_insert_req  on service_requests for insert with check (client_id = current_client_id());
create policy client_own_deliv   on deliverables     for select using (client_id = current_client_id());

-- ---------------------------------------------------------------------------
-- SEED — locked numbers from CLAUDE.md §2 (charter Rev 1.3+). DO NOT EDIT.
-- ---------------------------------------------------------------------------
insert into plans (key,name,visible,setup_cents,monthly_cents,contents) values
 ('minimum','Minimum', false,      0,   3600, '{"note":"hidden retention floor"}'),
 ('basic',  'Basic',   true,  150000,  29700, '{"layer":"hosting+site base"}'),
 ('business','Business',true, 150000,  59700, '{"layer":"marketing layer","pages_per_month":2}'),
 ('growth', 'Growth',  true,  250000, 347200, '{"layer":"full program","pages_per_month":4,"cap":12}');

insert into industries (slug,name,family) values
 ('hvac','HVAC','construction'),
 ('roofing','Roofing','construction');

===== END FILE =====

===== FILE: lib/stripe.ts =====
// lib/stripe.ts — Stripe client + checkout + mirror sync
// Pricing truth: `plans` table (seeded from CLAUDE.md §2). This module never
// hardcodes amounts; it reads Stripe price IDs stored on the plans row.
// Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_URL

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
);

type PlanRow = {
  key: "minimum" | "basic" | "business" | "growth";
  name: string;
  stripe_price_monthly_id: string | null;
  stripe_price_setup_id: string | null;
  stripe_price_annual_id: string | null;
};

async function getPlan(key: PlanRow["key"]): Promise<PlanRow> {
  const { data, error } = await supabase.from("plans").select("*").eq("key", key).single();
  if (error || !data) throw new Error(`Plan not found: ${key}`);
  return data as PlanRow;
}

/** Create (or reuse) the Stripe customer for a client row. */
export async function ensureStripeCustomer(clientId: string) {
  const { data: client, error } = await supabase
    .from("clients").select("id,business_name,contact_name,email,stripe_customer_id")
    .eq("id", clientId).single();
  if (error || !client) throw new Error(`Client not found: ${clientId}`);
  if (client.stripe_customer_id) return client.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: client.email,
    name: client.business_name,
    metadata: { client_id: client.id },
  });
  await supabase.from("clients").update({ stripe_customer_id: customer.id }).eq("id", clientId);
  await supabase.from("stripe_customers").upsert({
    id: customer.id, client_id: clientId, email: client.email,
    raw: customer as unknown as Record<string, unknown>, synced_at: new Date().toISOString(),
  });
  return customer.id;
}

/**
 * Checkout for a plan: monthly subscription + one-time setup fee in one session.
 * `annual: true` uses the 13-months-for-12 price (bonus month, never a discount).
 * Used by the rep-assisted flow now; the same function powers self-serve at Gate 3.
 */
export async function createPlanCheckout(opts: {
  clientId: string;
  planKey: PlanRow["key"];
  annual?: boolean;
}) {
  const plan = await getPlan(opts.planKey);
  const customerId = await ensureStripeCustomer(opts.clientId);

  const recurringPrice = opts.annual ? plan.stripe_price_annual_id : plan.stripe_price_monthly_id;
  if (!recurringPrice) throw new Error(`Missing Stripe price on plan ${opts.planKey} — run the price bootstrap (brief Phase 6).`);

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    { price: recurringPrice, quantity: 1 },
  ];

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: lineItems,
    // Setup fee rides the first invoice as a one-time item (never discounted —
    // client-financed acquisition per ENVOSTA_OFFER_SPEC.md Call 2).
    subscription_data: plan.stripe_price_setup_id
      ? { add_invoice_items: [{ price: plan.stripe_price_setup_id }], metadata: { client_id: opts.clientId, plan_key: opts.planKey } }
      : { metadata: { client_id: opts.clientId, plan_key: opts.planKey } },
    success_url: `${process.env.APP_URL}/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/plans`,
    metadata: { client_id: opts.clientId, plan_key: opts.planKey },
  });

  return { url: session.url, sessionId: session.id };
}

// --- Mirror sync helpers (called from the webhook route) ---------------------

export async function syncSubscription(sub: Stripe.Subscription) {
  const clientId = (sub.metadata?.client_id as string) ?? null;
  await supabase.from("stripe_subscriptions").upsert({
    id: sub.id,
    client_id: clientId,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    plan_key: (sub.metadata?.plan_key as PlanRow["key"]) ?? null,
    status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
    raw: sub as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  });

  // Client lifecycle: active sub -> active client; canceled -> churn pipeline
  if (clientId) {
    if (sub.status === "active") {
      await supabase.from("clients").update({ status: "active" }).eq("id", clientId).eq("status", "onboarding");
    }
    if (sub.status === "canceled") {
      await supabase.from("clients").update({ status: "churned" }).eq("id", clientId);
    }
  }
}

export async function syncInvoice(inv: Stripe.Invoice) {
  const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id ?? null;
  let clientId: string | null = (inv.metadata?.client_id as string) ?? null;
  if (!clientId && subId) {
    const { data } = await supabase.from("stripe_subscriptions").select("client_id").eq("id", subId).single();
    clientId = data?.client_id ?? null;
  }
  await supabase.from("stripe_invoices").upsert({
    id: inv.id,
    client_id: clientId,
    subscription_id: subId,
    status: inv.status,
    amount_due_cents: inv.amount_due,
    amount_paid_cents: inv.amount_paid,
    hosted_invoice_url: inv.hosted_invoice_url,
    raw: inv as unknown as Record<string, unknown>,
    created_at: new Date(inv.created * 1000).toISOString(),
    synced_at: new Date().toISOString(),
  });
}

export async function syncCustomer(cus: Stripe.Customer) {
  await supabase.from("stripe_customers").upsert({
    id: cus.id,
    client_id: (cus.metadata?.client_id as string) ?? null,
    email: cus.email,
    raw: cus as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  });
}

===== END FILE =====

===== FILE: lib/opensrs.ts =====
// lib/opensrs.ts — OpenSRS (Tucows) XML API client
// Docs: https://domains.opensrs.guide/docs (Domains & SSL API guide)
// Auth: X-Username + X-Signature where signature = md5(md5(xml + key) + key)
// Env: OPENSRS_USERNAME, OPENSRS_API_KEY, OPENSRS_ENV ('test' | 'live'),
//      PROVISIONING_DRY_RUN ('true' blocks all live mutations)
// IP allowlisting: your server IPs must be whitelisted in the OpenSRS RCP.

import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";

const HOSTS = {
  test: "https://horizon.opensrs.net:55443",
  live: "https://rr-n1-tor.opensrs.net:55443",
} as const;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only module; never ship client-side
);

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

export type Registrant = {
  first_name: string; last_name: string; org_name: string;
  address1: string; city: string; state: string; country: string;
  postal_code: string; phone: string; email: string;
};

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function dryRun(): boolean {
  return process.env.PROVISIONING_DRY_RUN !== "false";
}

// --- XML envelope builders ---------------------------------------------------
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function item(key: string, val: string) {
  return `<item key="${key}">${esc(val)}</item>`;
}
function assoc(items: string) {
  return `<dt_assoc>${items}</dt_assoc>`;
}
function envelope(action: string, object: string, attributes: string) {
  return `<?xml version='1.0' encoding='UTF-8' standalone='no'?>
<!DOCTYPE OPS_envelope SYSTEM 'ops.dtd'>
<OPS_envelope><header><version>0.9</version></header><body><data_block>
${assoc(
  item("protocol", "XCP") +
  item("action", action) +
  item("object", object) +
  `<item key="attributes">${attributes}</item>`
)}
</data_block></body></OPS_envelope>`;
}

async function send(action: string, object: string, attributes: string) {
  const username = envOrThrow("OPENSRS_USERNAME");
  const key = envOrThrow("OPENSRS_API_KEY");
  const env = (process.env.OPENSRS_ENV === "live" ? "live" : "test") as keyof typeof HOSTS;
  const xml = envelope(action, object, attributes);
  const signature = md5(md5(xml + key) + key);

  const res = await fetch(HOSTS[env], {
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
      "X-Username": username,
      "X-Signature": signature,
    },
    body: xml,
  });
  const text = await res.text();
  const success = /<item key="is_success">1<\/item>/.test(text);
  return { success, status: res.status, body: text };
}

async function logEvent(params: {
  domainId?: string; action: string; request: unknown; response: unknown;
  success: boolean; dry: boolean;
}) {
  await supabase.from("opensrs_events").insert({
    domain_id: params.domainId ?? null,
    action: params.action,
    request: params.request,   // NEVER include credentials/signature here
    response: params.response,
    success: params.success,
    dry_run: params.dry,
  });
}

// --- Public API ----------------------------------------------------------------

/** Check availability. Safe in all modes (read-only). */
export async function lookupDomain(domain: string) {
  const attrs = assoc(item("domain", domain));
  const r = await send("LOOKUP", "DOMAIN", attrs);
  const available = /<item key="status">available<\/item>/.test(r.body);
  await logEvent({ action: "lookup", request: { domain }, response: { status: r.status, available }, success: r.success, dry: false });
  return { available, raw: r.body };
}

/**
 * Register a domain IN THE CLIENT'S NAME (client owns, Envosta operates).
 * Nameservers point to wp.cloud. Honors PROVISIONING_DRY_RUN.
 */
export async function registerDomain(opts: {
  domainId: string;            // domains.id row already created as 'pending'
  domain: string;
  period?: number;             // years, default 1
  registrant: Registrant;      // client legal details — client is the owner
  nameservers: string[];       // wp.cloud NS from partner docs
}) {
  const dry = dryRun();
  const contact = assoc(
    item("first_name", opts.registrant.first_name) +
    item("last_name", opts.registrant.last_name) +
    item("org_name", opts.registrant.org_name) +
    item("address1", opts.registrant.address1) +
    item("city", opts.registrant.city) +
    item("state", opts.registrant.state) +
    item("country", opts.registrant.country) +
    item("postal_code", opts.registrant.postal_code) +
    item("phone", opts.registrant.phone) +
    item("email", opts.registrant.email)
  );
  const nsList =
    `<dt_array>` +
    opts.nameservers.map((ns, i) => `<item key="${i}">${assoc(item("name", ns) + item("sortorder", String(i + 1)))}</item>`).join("") +
    `</dt_array>`;
  const attrs = assoc(
    item("domain", opts.domain) +
    item("period", String(opts.period ?? 1)) +
    item("reg_type", "new") +
    item("handle", "process") +
    item("custom_nameservers", "1") +
    `<item key="nameserver_list">${nsList}</item>` +
    `<item key="contact_set">${assoc(
      `<item key="owner">${contact}</item>` +
      `<item key="admin">${contact}</item>` +
      `<item key="billing">${contact}</item>` +
      `<item key="tech">${contact}</item>`
    )}</item>`
  );

  if (dry) {
    await logEvent({ domainId: opts.domainId, action: "sw_register", request: { domain: opts.domain, dry: true }, response: { simulated: true }, success: true, dry: true });
    return { ok: true, dryRun: true as const };
  }

  const r = await send("SW_REGISTER", "DOMAIN", attrs);
  await logEvent({ domainId: opts.domainId, action: "sw_register", request: { domain: opts.domain }, response: { status: r.status, success: r.success }, success: r.success, dry: false });

  await supabase.from("domains").update({
    status: r.success ? "registered" : "failed",
    nameservers: opts.nameservers,
    raw: { last_response_snippet: r.body.slice(0, 2000) },
  }).eq("id", opts.domainId);

  if (!r.success) throw new Error(`OpenSRS SW_REGISTER failed for ${opts.domain}`);
  return { ok: true, dryRun: false as const };
}

/** Update nameservers on an existing domain (e.g., cutover to wp.cloud). */
export async function setNameservers(domainId: string, domain: string, nameservers: string[]) {
  const dry = dryRun();
  const attrs = assoc(
    item("domain", domain) +
    item("op_type", "assign") +
    `<item key="assign_ns"><dt_array>${nameservers.map((ns, i) => `<item key="${i}">${esc(ns)}</item>`).join("")}</dt_array></item>`
  );
  if (dry) {
    await logEvent({ domainId, action: "advanced_update_nameservers", request: { domain, nameservers, dry: true }, response: { simulated: true }, success: true, dry: true });
    return { ok: true, dryRun: true as const };
  }
  const r = await send("advanced_update_nameservers", "NAMESERVER", attrs);
  await logEvent({ domainId, action: "advanced_update_nameservers", request: { domain, nameservers }, response: { status: r.status }, success: r.success, dry: false });
  if (r.success) {
    await supabase.from("domains").update({ status: "dns_configured", nameservers }).eq("id", domainId);
  }
  return { ok: r.success, dryRun: false as const };
}

===== END FILE =====

===== FILE: lib/wpcloud.ts =====
// lib/wpcloud.ts — wp.cloud partner API client
//
// HONESTY NOTE FOR CLAUDE CODE: wp.cloud's site-management API is documented in
// the PARTNER docs Koltyn has access to (wp.cloud dashboard -> API docs). The
// structure, auth pattern, logging, and dry-run behavior below are final; the
// ENDPOINT PATHS marked VERIFY must be confirmed against those partner docs
// before flipping PROVISIONING_DRY_RUN=false. Do not guess paths in production.
//
// Env: WPCLOUD_API_BASE, WPCLOUD_API_TOKEN, WPCLOUD_NAMESERVERS (csv),
//      PROVISIONING_DRY_RUN

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
);

const BASE = process.env.WPCLOUD_API_BASE ?? ""; // e.g. from partner docs
const dry = () => process.env.PROVISIONING_DRY_RUN !== "false";

async function call(path: string, method: "GET" | "POST" | "PUT" | "DELETE", body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.WPCLOUD_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function logEvent(siteId: string | null, action: string, request: unknown, response: unknown, success: boolean, isDry: boolean) {
  await supabase.from("wpcloud_events").insert({
    site_id: siteId, action, request, response, success, dry_run: isDry,
  });
}

export function wpcloudNameservers(): string[] {
  const csv = process.env.WPCLOUD_NAMESERVERS ?? "";
  return csv.split(",").map(s => s.trim()).filter(Boolean);
}

/** Provision a new site container for a client. */
export async function createSite(opts: { siteRowId: string; clientId: string; primaryDomain: string }) {
  if (dry()) {
    await logEvent(opts.siteRowId, "create_site", { domain: opts.primaryDomain, dry: true }, { simulated: true }, true, true);
    await supabase.from("sites").update({ status: "provisioned", primary_domain: opts.primaryDomain }).eq("id", opts.siteRowId);
    return { ok: true, dryRun: true as const };
  }
  // VERIFY endpoint + payload shape against wp.cloud partner docs:
  const r = await call(`/sites`, "POST", { domain: opts.primaryDomain });
  await logEvent(opts.siteRowId, "create_site", { domain: opts.primaryDomain }, r.json, r.ok, false);
  if (!r.ok) throw new Error(`wp.cloud create_site failed (${r.status})`);
  await supabase.from("sites").update({
    status: "provisioned",
    wpcloud_site_id: String((r.json as any)?.id ?? (r.json as any)?.site_id ?? ""),
    primary_domain: opts.primaryDomain,
    raw: r.json,
  }).eq("id", opts.siteRowId);
  return { ok: true, dryRun: false as const };
}

/** Map/confirm the primary domain on the site. */
export async function mapDomain(siteRowId: string, wpcloudSiteId: string, domain: string) {
  if (dry()) {
    await logEvent(siteRowId, "map_domain", { domain, dry: true }, { simulated: true }, true, true);
    return { ok: true, dryRun: true as const };
  }
  // VERIFY endpoint:
  const r = await call(`/sites/${wpcloudSiteId}/domains`, "POST", { domain, primary: true });
  await logEvent(siteRowId, "map_domain", { domain }, r.json, r.ok, false);
  if (!r.ok) throw new Error(`wp.cloud map_domain failed (${r.status})`);
  return { ok: true, dryRun: false as const };
}

/** Confirm SSL issuance (wp.cloud handles issuance natively; this polls status). */
export async function confirmSsl(siteRowId: string, wpcloudSiteId: string) {
  if (dry()) {
    await logEvent(siteRowId, "confirm_ssl", { dry: true }, { simulated: true }, true, true);
    await supabase.from("sites").update({ ssl_active: true }).eq("id", siteRowId);
    return { ok: true, dryRun: true as const };
  }
  // VERIFY endpoint:
  const r = await call(`/sites/${wpcloudSiteId}`, "GET");
  const ssl = Boolean((r.json as any)?.ssl_active ?? (r.json as any)?.ssl?.active);
  await logEvent(siteRowId, "confirm_ssl", {}, { ssl }, r.ok, false);
  await supabase.from("sites").update({ ssl_active: ssl, raw: r.json }).eq("id", siteRowId);
  return { ok: ssl, dryRun: false as const };
}

===== END FILE =====

===== FILE: lib/provisioning.ts =====
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

===== END FILE =====

===== FILE: app/api/webhooks/stripe/route.ts =====
// app/api/webhooks/stripe/route.ts — Next.js App Router webhook endpoint
// Security: raw-body signature verification + idempotency via stripe_events.
// Configure the endpoint in Stripe Dashboard -> Webhooks with STRIPE_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { stripe, syncSubscription, syncInvoice, syncCustomer } from "@/lib/stripe";
import { enqueueProvisioning } from "@/lib/provisioning";

export const runtime = "nodejs"; // raw body access

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  // Idempotency: insert-once ledger. Duplicate deliveries exit early.
  const { error: dup } = await supabase.from("stripe_events").insert({
    id: event.id, type: event.type, payload: event as unknown as Record<string, unknown>,
  });
  if (dup) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientId = session.metadata?.client_id;
        if (clientId) {
          // Payment confirmed -> fire the automation spine (dry-run honors env).
          await enqueueProvisioning(clientId);
        }
        break;
      }
      case "customer.created":
      case "customer.updated":
        await syncCustomer(event.data.object as Stripe.Customer);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "invoice.finalized":
      case "invoice.paid":
      case "invoice.payment_failed":
        await syncInvoice(event.data.object as Stripe.Invoice);
        break;
      default:
        break; // stored in ledger; unhandled types are fine
    }
    await supabase.from("stripe_events").update({ processed: true }).eq("id", event.id);
  } catch (err) {
    await supabase.from("stripe_events")
      .update({ processed: false, error: String(err) })
      .eq("id", event.id);
    // 500 -> Stripe retries; idempotency ledger makes retries safe.
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

===== END FILE =====

===== FILE: .env.example =====
# =============================================================================
# ENVOSTA — environment variables (.env.example)
# Copy to .env.local (app) and set the same values in your deploy platform.
# REAL VALUES NEVER ENTER GIT, CHAT LOGS, OR CLAUDE SESSIONS — paste them only
# into .env.local and your host's secret manager yourself.
# =============================================================================

# --- App ---------------------------------------------------------------------
APP_URL=https://envosta.com
SELF_SERVE_ENABLED=false            # flips true at Gate 3 (charter §5)
PROVISIONING_DRY_RUN=true           # keep true until wp.cloud endpoints verified

# --- Supabase ------------------------------------------------------------------
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=           # same as above; client-safe
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # anon key only — NEVER the service role
SUPABASE_SERVICE_ROLE_KEY=          # server-only; used by webhooks/orchestrator
SUPABASE_DB_URL=                    # postgres://... — for migrations + Claude Code MCP
SUPABASE_ACCESS_TOKEN=              # personal access token — for Supabase MCP/CLI

# --- Stripe --------------------------------------------------------------------
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=              # from Dashboard -> Webhooks endpoint

# --- OpenSRS (Tucows) ------------------------------------------------------------
OPENSRS_USERNAME=
OPENSRS_API_KEY=
OPENSRS_ENV=test                    # 'test' (horizon) until go-live, then 'live'
# NOTE: whitelist your server IPs in the OpenSRS Reseller Control Panel.

# --- wp.cloud --------------------------------------------------------------------
WPCLOUD_API_BASE=                   # from partner docs
WPCLOUD_API_TOKEN=
WPCLOUD_NAMESERVERS=                # csv, from partner docs (e.g. ns1...,ns2...)

# --- Cloudflare Turnstile ----------------------------------------------------
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# --- Uptime monitoring ---------------------------------------------------------
UPTIME_PROVIDER=betterstack         # or uptimerobot
UPTIME_API_KEY=

===== END FILE =====

===== FILE: envosta-operating-charter.html =====
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Envosta Operating Charter — V1.0 LOCKED</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --navy-deep:#0A1929;
    --navy-panel:#0F2438;
    --navy-edge:#16334E;
    --blueprint-line:rgba(96,143,190,.13);
    --steel:#7FA6C9;
    --steel-dim:#4E708F;
    --paper:#E9F1F8;
    --amber:#FFB627;
    --amber-deep:#E09112;
    --clay:#D64545;
    --font-display:'Archivo',sans-serif;
    --font-body:'Inter',sans-serif;
    --font-mono:'IBM Plex Mono',monospace;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{
    background:var(--navy-deep);
    color:var(--paper);
    font-family:var(--font-body);
    font-size:15px;
    line-height:1.55;
    background-image:
      linear-gradient(var(--blueprint-line) 1px, transparent 1px),
      linear-gradient(90deg, var(--blueprint-line) 1px, transparent 1px);
    background-size:44px 44px;
    padding:28px 16px 60px;
  }
  .sheet{
    max-width:1060px;
    margin:0 auto;
    border:2px solid var(--navy-edge);
    outline:1px solid rgba(127,166,201,.22);
    outline-offset:6px;
    background:linear-gradient(180deg, rgba(15,36,56,.72), rgba(10,25,41,.86));
    position:relative;
    padding:0 0 0;
  }
  /* corner ticks like a drawing sheet */
  .tick{position:absolute;width:14px;height:14px;border-color:var(--amber);border-style:solid}
  .tick.tl{top:-8px;left:-8px;border-width:2px 0 0 2px}
  .tick.tr{top:-8px;right:-8px;border-width:2px 2px 0 0}
  .tick.bl{bottom:-8px;left:-8px;border-width:0 0 2px 2px}
  .tick.br{bottom:-8px;right:-8px;border-width:0 2px 2px 0}

  header{
    display:flex;justify-content:space-between;align-items:flex-start;gap:24px;
    padding:34px 40px 26px;border-bottom:1px solid var(--navy-edge);
    flex-wrap:wrap;
  }
  .brand{font-family:var(--font-display);font-weight:800;font-size:15px;letter-spacing:.34em;color:var(--paper)}
  .brand span{color:var(--amber)}
  .doc-meta{font-family:var(--font-mono);font-size:11px;color:var(--steel);text-align:right;line-height:1.9}
  .doc-meta b{color:var(--paper);font-weight:600}
  .doc-meta .locked{color:var(--amber)}

  .stamp{
    position:absolute;top:96px;right:34px;
    font-family:var(--font-display);font-weight:800;font-size:13px;letter-spacing:.22em;
    color:var(--amber);border:2px solid var(--amber);border-radius:4px;
    padding:8px 14px;transform:rotate(-7deg);opacity:.92;
    box-shadow:0 0 0 3px rgba(255,182,39,.12);
    background:rgba(10,25,41,.6);
    z-index:2;
  }

  h1{
    font-family:var(--font-display);font-weight:800;
    font-size:clamp(26px,4.4vw,44px);line-height:1.12;letter-spacing:-.01em;
    padding:40px 40px 8px;max-width:820px;
  }
  h1 em{font-style:normal;color:var(--amber)}
  .subline{padding:0 40px 36px;color:var(--steel);max-width:720px;font-size:15px}

  section{padding:30px 40px 36px;border-top:1px solid var(--navy-edge)}
  .sec-label{
    font-family:var(--font-mono);font-size:11px;letter-spacing:.28em;color:var(--amber);
    text-transform:uppercase;margin-bottom:6px;
  }
  .sec-title{font-family:var(--font-display);font-weight:700;font-size:21px;margin-bottom:18px}
  .sec-note{color:var(--steel);font-size:13.5px;max-width:760px;margin-top:14px}
  .sec-note b{color:var(--paper);font-weight:600}

  /* ladder table */
  table{width:100%;border-collapse:collapse;font-size:14px}
  th{
    font-family:var(--font-mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;
    color:var(--steel);text-align:left;padding:0 14px 10px;border-bottom:1px solid var(--navy-edge);
  }
  td{padding:13px 14px;border-bottom:1px solid rgba(22,51,78,.6);vertical-align:top}
  .tier-name{font-family:var(--font-display);font-weight:700;font-size:15px}
  .mono{font-family:var(--font-mono);font-weight:500}
  .num{font-family:var(--font-mono);font-weight:600;color:var(--paper)}
  tr.hidden-tier td{color:var(--steel-dim)}
  tr.hidden-tier .tier-name{color:var(--steel)}
  tr.flagship{background:rgba(255,182,39,.06)}
  tr.flagship td{border-bottom:1px solid rgba(255,182,39,.25);border-top:1px solid rgba(255,182,39,.25)}
  tr.flagship .tier-name{color:var(--amber)}
  .badge{
    display:inline-block;font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;
    border:1px solid var(--steel-dim);color:var(--steel);border-radius:3px;
    padding:2px 7px;margin-left:8px;vertical-align:2px;
  }
  .badge.amber{border-color:var(--amber-deep);color:var(--amber)}

  /* spine flow */
  .spine{display:flex;flex-wrap:wrap;gap:10px;align-items:stretch}
  .node{
    flex:1 1 140px;min-width:132px;
    border:1px solid var(--navy-edge);background:rgba(15,36,56,.55);
    padding:12px 12px 11px;position:relative;
  }
  .node::after{
    content:'→';position:absolute;right:-11px;top:50%;transform:translateY(-50%);
    color:var(--amber);font-family:var(--font-mono);font-size:13px;z-index:1;
  }
  .node:last-child::after{content:''}
  .node .n-step{font-family:var(--font-mono);font-size:10px;letter-spacing:.18em;color:var(--amber);margin-bottom:5px}
  .node .n-name{font-family:var(--font-display);font-weight:700;font-size:13.5px;margin-bottom:4px}
  .node .n-desc{font-size:11.5px;color:var(--steel);line-height:1.45}
  .spine-caption{margin-top:16px;font-size:13px;color:var(--steel)}
  .spine-caption b{color:var(--amber);font-weight:600}

  /* math cards */
  .paths{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .path{border:1px solid var(--navy-edge);background:rgba(15,36,56,.55);padding:20px 20px 18px}
  .path.rec{border-color:rgba(255,182,39,.45)}
  .path h3{font-family:var(--font-display);font-weight:700;font-size:15px;margin-bottom:2px}
  .path .p-tag{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.14em;color:var(--steel);margin-bottom:12px}
  .path.rec .p-tag{color:var(--amber)}
  .p-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px dashed rgba(78,112,143,.35)}
  .p-row span:last-child{font-family:var(--font-mono);font-weight:500}
  .p-total{display:flex;justify-content:space-between;padding-top:12px;font-family:var(--font-display);font-weight:700;font-size:16px}
  .p-total span:last-child{font-family:var(--font-mono);color:var(--amber)}
  .p-sub{font-size:11.5px;color:var(--steel);margin-top:6px}

  /* gates */
  .gates{display:grid;gap:0;border-left:2px solid var(--navy-edge);margin-left:7px}
  .gate{position:relative;padding:0 0 22px 26px}
  .gate:last-child{padding-bottom:4px}
  .gate::before{
    content:'';position:absolute;left:-8px;top:4px;width:12px;height:12px;
    background:var(--navy-deep);border:2px solid var(--amber);border-radius:50%;
  }
  .g-head{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px;margin-bottom:3px}
  .g-num{font-family:var(--font-mono);font-size:11px;letter-spacing:.16em;color:var(--amber)}
  .g-title{font-family:var(--font-display);font-weight:700;font-size:15px}
  .g-body{font-size:13.5px;color:var(--steel);max-width:780px}
  .g-body b{color:var(--paper);font-weight:600}

  .kill{
    margin-top:26px;border:1px solid rgba(214,69,69,.5);background:rgba(214,69,69,.06);
    padding:18px 20px;
  }
  .kill .k-label{font-family:var(--font-mono);font-size:11px;letter-spacing:.24em;color:var(--clay);margin-bottom:8px}
  .kill p{font-size:13.5px;margin-bottom:6px}
  .kill p:last-child{margin-bottom:0}
  .kill b{color:var(--clay);font-weight:600}

  /* rules */
  .rules{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .rule{border:1px solid var(--navy-edge);background:rgba(15,36,56,.55);padding:18px 18px 16px}
  .rule .r-num{font-family:var(--font-mono);font-size:11px;color:var(--amber);letter-spacing:.18em;margin-bottom:8px}
  .rule .r-text{font-size:13.5px}
  .rule .r-text b{font-family:var(--font-display);font-weight:700;display:block;font-size:14.5px;margin-bottom:4px}

  /* proof strip */
  .proof{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .p-item{border-top:2px solid var(--amber-deep);padding-top:12px}
  .p-item .p-co{font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;color:var(--steel);margin-bottom:5px}
  .p-item .p-fact{font-family:var(--font-display);font-weight:700;font-size:16px;margin-bottom:4px}
  .p-item .p-mean{font-size:12.5px;color:var(--steel)}

  /* title block */
  .titleblock{
    border-top:2px solid var(--navy-edge);
    display:grid;grid-template-columns:2fr 1fr 1fr 1fr;
    font-family:var(--font-mono);font-size:11px;
  }
  .tb-cell{padding:14px 18px;border-right:1px solid var(--navy-edge)}
  .tb-cell:last-child{border-right:none}
  .tb-cell .tb-k{color:var(--steel-dim);letter-spacing:.14em;font-size:9.5px;text-transform:uppercase;margin-bottom:4px}
  .tb-cell .tb-v{color:var(--paper);font-weight:500}
  .tb-cell .tb-v.amber{color:var(--amber)}

  @media(max-width:820px){
    body{padding:18px 10px 40px}
    header,h1,.subline,section{padding-left:22px;padding-right:22px}
    .paths,.rules,.proof{grid-template-columns:1fr}
    .titleblock{grid-template-columns:1fr 1fr}
    .tb-cell{border-bottom:1px solid var(--navy-edge)}
    .stamp{position:static;display:inline-block;margin:18px 22px 0;transform:rotate(-3deg)}
    .node::after{content:''}
  }
  @media (prefers-reduced-motion:no-preference){
    .sheet{animation:settle .5s ease-out}
    @keyframes settle{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  }
</style>
</head>
<body>
<div class="sheet">
  <span class="tick tl"></span><span class="tick tr"></span><span class="tick bl"></span><span class="tick br"></span>

  <header>
    <div class="brand">ENVO<span>STA</span></div>
    <div class="doc-meta">
      DOC <b>ENV-CHT-001</b> · REV <b class="locked">1.4 LOCKED</b><br>
      ISSUED <b>2026-07-02</b> · REVISION WINDOW OPENS <b>2027-07-02</b><br>
      OWNER <b>KOLTYN — FOUNDER</b>
    </div>
  </header>

  <div class="stamp">SET IN STONE · V1.4</div>

  <h1>Hands-free hosting for chosen industries. <em>Twelve months, zero edits.</em></h1>
  <p class="subline">Envosta is a white-glove managed hosting company that specializes by industry, built on the canonical stack — not pieced together. This charter is the single source of truth: every page, every rep script, every line of provisioning code conforms to this sheet. Rev 1.4 locks the offer layer; nothing changes before the revision window opens.</p>

  <!-- PROMISE -->
  <section>
    <div class="sec-label">§1 — Who We Are · The Promise</div>
    <div class="sec-title">A white-glove hosting company for the industries it chooses. The plan includes everything — the site, the SEO, the reviews — and the client never lifts a finger.</div>
    <p class="sec-note"><b>The promise:</b> a trades business gets found on Google and never thinks about its website again. One number to call or text; changes handled, confirmation sent back. <b>SLAs:</b> acknowledge under 4 hours · Basic edits live under 2 business days · Business edits under 1 business day · site-down handled immediately. <b>The register:</b> luxury is demonstrated, never self-declared — white-glove onboarding, concierge line, flawless execution; we run and manage the client's entire online presence. <b>The provenance:</b> the canonical stack, not duct tape — WordPress (powers 40%+ of the web; the same software behind WhiteHouse.gov, NASA.gov, and Fortune-500 web properties) on wp.cloud (built by Automattic, WordPress's own maker — the infrastructure behind WordPress.com) with domains on Tucows/OpenSRS (the world's second-largest registrar, the same platform behind Shopify's domains). <b>Future-proof, demonstrated:</b> every Envosta site is built and maintained through an AI-native pipeline today — as AI advances, the dominant platform gets it first, and Envosta manages every step. <b>The roadmap:</b> construction trades now — stickiest, most reachable, highest ticket — then legal, then professional services. An industry qualifies only if it is local-intent, high-ticket, review-driven, and service-area shaped.</p>
  </section>

  <!-- LADDER -->
  <section>
    <div class="sec-label">§2 — The Hosting Plans · Frozen</div>
    <div class="sec-title">Four hosting plans. No renames. No new plans. No price changes.</div>
    <table>
      <thead>
        <tr><th>Plan</th><th>Visibility</th><th>Setup</th><th>Monthly</th><th>What it is</th><th>Recurring labor</th></tr>
      </thead>
      <tbody>
        <tr class="hidden-tier">
          <td class="tier-name">Minimum</td>
          <td class="mono">Hidden — retention net</td>
          <td class="num">—</td>
          <td class="num">$36</td>
          <td>Hosting + domain kept alive. Never advertised, never pitched. Downgrade catch only.</td>
          <td class="mono">Zero</td>
        </tr>
        <tr>
          <td class="tier-name">Basic</td>
          <td class="mono">Public</td>
          <td class="num">$1,500</td>
          <td class="num">$297</td>
          <td>Industry-specialized managed hosting on wp.cloud · custom Studio-built site migrated live · domain + branded email · GBP setup · click-to-call + quote forms · unlimited small edits · security, backups, uptime · monthly branded report.</td>
          <td class="mono">Zero marketing labor</td>
        </tr>
        <tr>
          <td class="tier-name">Business</td>
          <td class="mono">Public</td>
          <td class="num">$1,500</td>
          <td class="num">$597</td>
          <td>Everything in Basic + the marketing layer: automated SEO foundation · 2 ranking-targeted service-area pages/mo · review generation · citation management · ongoing GBP optimization · priority support.</td>
          <td class="mono">Automated + QA pass</td>
        </tr>
        <tr class="flagship">
          <td class="tier-name">Growth <span class="badge amber">12 SPOTS / TRADE</span></td>
          <td class="mono">Public — capped</td>
          <td class="num">$2,500</td>
          <td class="num">$3,472</td>
          <td>Everything in Business + 4 service-area pages/mo · active local SEO · reputation management · lead &amp; call tracking · dedicated account manager · <b>per-trade, per-city exclusivity</b>. All real ongoing work lives here.</td>
          <td class="mono">All human labor</td>
        </tr>
      </tbody>
    </table>
    <p class="sec-note"><b>Annual prepay:</b> 13th month free — framed as a bonus month, never a discount. <b>COGS:</b> ≈ $10–15 per site per month all-in (wp.cloud + domain amortized + Claude API + QA minutes) → Basic runs ≈ 90%+ gross margin. That part is arithmetic, not projection.</p>
  </section>

  <!-- SPINE -->
  <section>
    <div class="sec-label">§3 — The Spine · Build Once</div>
    <div class="sec-title">Signature to live site with one human touch per client per month.</div>
    <div class="spine">
      <div class="node"><div class="n-step">01</div><div class="n-name">Sign</div><div class="n-desc">Rep closes live on envosta.com or client self-serves. Intake form fires the queue.</div></div>
      <div class="node"><div class="n-step">02</div><div class="n-name">OpenSRS</div><div class="n-desc">API registers domain in the client's name — Envosta keeps DNS &amp; management control. Branded email + SSL provisioned. Renewal notices go out under Envosta's brand.</div></div>
      <div class="node"><div class="n-step">03</div><div class="n-name">wp.cloud</div><div class="n-desc">DNS pointed, site container provisioned on Automattic-partner infrastructure. Native security, backups, failover.</div></div>
      <div class="node"><div class="n-step">04</div><div class="n-name">Studio + Claude</div><div class="n-desc">Site built locally in WP Studio via Claude MCP. Migration plugin pushes live.</div></div>
      <div class="node"><div class="n-step">05</div><div class="n-name">GBP</div><div class="n-desc">Google Business Profile set up and optimized. Turnstile on every form. Uptime monitor armed.</div></div>
      <div class="node"><div class="n-step">06</div><div class="n-name">Monthly Engine</div><div class="n-desc">Service-area pages generated per tier cadence. Branded report compiled automatically. No Jetpack, ever.</div></div>
      <div class="node"><div class="n-step">07</div><div class="n-name">VA QA</div><div class="n-desc">The only recurring human touch: quality pass on pages + report before they ship.</div></div>
    </div>
    <p class="spine-caption"><b>Client owns, Envosta operates.</b> Domain in their name kills the hostage-holding red flag; the embedded spine keeps them anyway. <b>Not pieced together:</b> the world's dominant CMS, its maker's own infrastructure, and the registrar platform Shopify runs on — one stack, one number to call.</p>
  </section>

  <!-- MATH -->
  <section>
    <div class="sec-label">§4 — The Math to $50K / Month</div>
    <div class="sec-title">Two valid shapes. Fill the twelve spots first; let the tail fall out naturally.</div>
    <div class="paths">
      <div class="path">
        <h3>Path A — Volume Blend</h3>
        <div class="p-tag">~100 CLIENTS · HEAVIER SUPPORT SURFACE</div>
        <div class="p-row"><span>6 × Growth</span><span>$20,832</span></div>
        <div class="p-row"><span>10 × Business</span><span>$5,970</span></div>
        <div class="p-row"><span>84 × Basic</span><span>$24,948</span></div>
        <div class="p-total"><span>MRR</span><span>$51,750</span></div>
        <div class="p-sub">+ ≈ $150K in setup fees along the way</div>
      </div>
      <div class="path rec">
        <h3>Path B — Anchor-Heavy</h3>
        <div class="p-tag">26 CLIENTS · RECOMMENDED SKELETON</div>
        <div class="p-row"><span>12 × Growth (full cap)</span><span>$41,664</span></div>
        <div class="p-row"><span>14 × Business</span><span>$8,358</span></div>
        <div class="p-row"><span>&nbsp;</span><span>&nbsp;</span></div>
        <div class="p-total"><span>MRR</span><span>$50,022</span></div>
        <div class="p-sub">4× fewer accounts, 4× fewer support surfaces · each sale heavier</div>
      </div>
    </div>
    <p class="sec-note"><b>Churn tax:</b> at 3%/mo churn on $50K, $1,500 of MRR must be replaced every month, forever — budgeted from day one. Honest timeline to $50K MRR with founder-led sales plus 1–2 reps: <b>9–18 months.</b></p>
  </section>

  <!-- GATES -->
  <section>
    <div class="sec-label">§5 — The Gates · Sequence Is Law</div>
    <div class="sec-title">Nothing scales until the gate before it is passed.</div>
    <div class="gates">
      <div class="gate">
        <div class="g-head"><span class="g-num">GATE 0</span><span class="g-title">First 10 clients</span></div>
        <p class="g-body">One trade (HVAC or roofing), one metro cluster, spine running end-to-end. Measure exactly three numbers: <b>true CAC · tickets per client per month · 90-day churn.</b> Nothing about the model changes before client 10.</p>
      </div>
      <div class="gate">
        <div class="g-head"><span class="g-num">GATE 1</span><span class="g-title">$15K MRR</span></div>
        <p class="g-body">First VA QA contractor. Every recurring process becomes a written SOP.</p>
      </div>
      <div class="gate">
        <div class="g-head"><span class="g-num">GATE 2</span><span class="g-title">$50K MRR — the target</span></div>
        <p class="g-body">Pass requirements: <b>churn ≤ 3%/mo · ≤ 1 ticket/client/mo · CAC paid back ≤ 4 months.</b> First real hire: ops lead.</p>
      </div>
      <div class="gate">
        <div class="g-head"><span class="g-num">GATE 3</span><span class="g-title">$150K MRR</span></div>
        <p class="g-body">Self-serve Basic signup goes live on envosta.com. Trade #2 opens with its own 12 Growth spots.</p>
      </div>
      <div class="gate">
        <div class="g-head"><span class="g-num">GATE 4</span><span class="g-title">$400K MRR</span></div>
        <p class="g-body">Self-serve must be <b>&gt; 50% of new MRR</b>, or headcount grows. Physics, not preference. The $1M/mo · 5-FTE shape is ≈ 3,000 self-serve Basic + 200 Business + capped Growth across trades: ops/QA lead · content-QA editor · Growth account manager · support lead · founder.</p>
      </div>
    </div>
    <div class="kill">
      <div class="k-label">KILL TRIGGERS — IMMEDIATE, NON-NEGOTIABLE</div>
      <p><b>Churn &gt; 5%/mo for 2 consecutive months</b> → freeze all acquisition. Fix retention before selling one more account.</p>
      <p><b>Tickets &gt; 2/client/mo</b> → freeze all promises and features. Fix the product until the number drops.</p>
      <p><b>Any pricing or tier change inside 12 months</b> → does not exist. The ladder is frozen.</p>
    </div>
  </section>

  <!-- RULES -->
  <section>
    <div class="sec-label">§6 — Standing Rules</div>
    <div class="sec-title">Three rules that outrank every good idea.</div>
    <div class="rules">
      <div class="rule"><div class="r-num">RULE 01</div><div class="r-text"><b>Ladder, positioning, and roadmap are frozen until 2027-07-02.</b> Category (hosting) · differentiator (chosen industries) · register (white-glove, hands-free) · provenance (the canonical stack) · roadmap (construction → legal → professional services). Rev 1.4 is final — every hour saved from tinkering goes into selling.</div></div>
      <div class="rule"><div class="r-num">RULE 02</div><div class="r-text"><b>Next 90 days: zero model edits.</b> All energy on the first 10 clients in the beachhead trade. The plan is finished; only the pipeline is empty.</div></div>
      <div class="rule"><div class="r-num">RULE 03</div><div class="r-text"><b>One trade, one metro, until Gate 3.</b> Exclusivity is the moat only if it's honoured — 12 spots per trade means 12, and trade #2 waits its turn.</div></div>
    </div>
  </section>

  <!-- PROOF -->
  <section>
    <div class="sec-label">§7 — External Proof</div>
    <div class="sec-title">Every component is proven by someone bigger. Only CAC and churn are Envosta's to prove — Gate 0 proves both for under $10K.</div>
    <div class="proof">
      <div class="p-item">
        <div class="p-co">TOWNSQUARE INTERACTIVE — THE REFERENCE MODEL</div>
        <div class="p-fact">$73M/yr · 34% margin · ~300 staff</div>
        <div class="p-mean">Subscription plans bundling hosting + site + SEO + reputation at ≈ $300/mo, 20,000+ subscribers. Envosta runs this exact plan structure — industry-specialized, at locked price points — with the spine replacing their 300 humans.</div>
      </div>
      <div class="p-item">
        <div class="p-co">SERVICETITAN</div>
        <div class="p-fact">$961M/yr · &gt;95% gross retention</div>
        <div class="p-mean">Trades businesses pay recurring and stick once a service is embedded in operations.</div>
      </div>
      <div class="p-item">
        <div class="p-co">SCORPION &amp; MARKET</div>
        <div class="p-fact">Contractor SEO: $1.5K–$8K/mo</div>
        <div class="p-mean">Growth at $3,472 with a genuine 12-spot cap is priced under the incumbents for the industry's recognized deliverable: service-area pages.</div>
      </div>
    </div>
  </section>

  <!-- OFFER LAYER -->
  <section>
    <div class="sec-label">§8 — The Offer Layer · Hormozi / Brunson</div>
    <div class="sec-title">Prices never move. The offer gets heavier.</div>
    <p class="sec-note"><b>Client-financed acquisition:</b> setup fees ($1,500 / $1,500 / $2,500) repay CAC in under 30 days — never waived, never discounted, never split. <b>The guarantees:</b> Growth carries the Booked-Calls Make-Good — more booked calls in the first 6 months than the 6 months before, measured by the client's own call tracking, or we work free until they get there. Basic and Business carry the Deliverable Guarantee — every promised page, post, and report on time, or that month is free. No ranking, lead-count, or revenue promises, ever. <b>The wrapper:</b> Growth is pitched as the Local Domination Program with exactly five named bonuses; the Scorecard feeds an application funnel; declined applicants downsell to Business; cancellations downsell to Minimum. <b>Traffic:</b> Core Four in sequence — warm, cold, content, Dream 100 — paid ads only after Gate 2, and never as a client service. Full detail: ENVOSTA_OFFER_SPEC.md.</p>
  </section>

  <div class="titleblock">
    <div class="tb-cell"><div class="tb-k">Document</div><div class="tb-v">Envosta Operating Charter</div></div>
    <div class="tb-cell"><div class="tb-k">Revision</div><div class="tb-v amber">1.4 — LOCKED</div></div>
    <div class="tb-cell"><div class="tb-k">Issued</div><div class="tb-v">2026-07-02</div></div>
    <div class="tb-cell"><div class="tb-k">Signed</div><div class="tb-v">Koltyn — Founder</div></div>
  </div>
</div>
</body>
</html>

===== END FILE =====
