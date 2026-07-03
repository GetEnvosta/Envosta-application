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
