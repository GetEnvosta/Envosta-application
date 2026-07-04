/**
 * /plans — the hosting plans page (charter §2, rebuild brief Phase 2.2).
 *
 * Three public plans (Basic / Business / Growth) framed explicitly as
 * HOSTING PLANS with layers stacked: base → marketing layer → full program.
 * Every numeral renders from config/pricing (zero literals) in IBM Plex Mono.
 * Growth shows a live remaining-spots count per industry from config.
 * Annual prepay is always "13th month free" — a bonus month, never a
 * percentage discount. The hidden Minimum plan appears nowhere here.
 *
 * Funnel: all CTAs route to the Scorecard (application funnel). Self-serve
 * checkout stays dark until Gate 3 (SELF_SERVE_ENABLED).
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { publicPlans, formatDollars, ANNUAL_PREPAY, SERVICE_PROMISE } from '@/config/pricing';
import { activeIndustries, spotsRemaining } from '@/config/industries';
import { GUARANTEES, GROWTH_PROGRAM_NAME, GROWTH_BONUSES } from '@/config/offer';

export const metadata: Metadata = {
  title: 'Hosting Plans — Industry-Specialized Managed WordPress Hosting',
  description:
    'Hosting plans that include the site, the SEO, and the reviews for your industry. Managed WordPress hosting on wp.cloud — white-glove, hands-free.',
  alternates: { canonical: 'https://envosta.com/plans' },
};

export default function PlansPage() {
  const plans = publicPlans();
  const industries = activeIndustries();
  const growth = plans.find((p) => p.key === 'growth');
  const deliverableGuarantee = GUARANTEES.find((g) => g.key === 'deliverable_guarantee');
  const makeGood = GUARANTEES.find((g) => g.key === 'booked_calls_make_good');

  return (
    <div className="mk2">
      <style>{`
        .pl-hero{padding:88px 0 56px;text-align:center}
        .pl-hero .eyebrow{display:block;margin-bottom:18px}
        .pl-hero p.sub{max-width:640px;margin:18px auto 0;font-size:1.05rem;line-height:1.7}
        .pl-grid{display:grid;grid-template-columns:1fr;gap:18px;margin-top:8px}
        @media(min-width:900px){.pl-grid{grid-template-columns:repeat(3,1fr)}}
        .pl-card{padding:30px 26px;display:flex;flex-direction:column;position:relative}
        .pl-card .layer-tag{font-family:var(--font-mono);font-size:.66rem;letter-spacing:.2em;text-transform:uppercase;color:var(--steel-dim);margin-bottom:12px}
        .pl-card h3{font-size:1.5rem;margin-bottom:4px}
        .pl-card .pl-sum{font-size:.92rem;line-height:1.6;margin-bottom:20px;min-height:3.2em}
        .pl-price{display:flex;align-items:baseline;gap:6px}
        .pl-price .amount{font-family:var(--font-mono);font-weight:600;font-size:2.6rem;color:var(--paper);letter-spacing:-.02em}
        .pl-price .per{font-family:var(--font-mono);font-size:.8rem;color:var(--steel)}
        .pl-setup{font-family:var(--font-mono);font-size:.78rem;color:var(--steel);margin-top:6px}
        .pl-feats{list-style:none;margin:22px 0 26px;padding:0;flex:1}
        .pl-feats li{display:flex;gap:10px;align-items:flex-start;font-size:.9rem;color:var(--paper);padding:6px 0;line-height:1.5}
        .pl-feats li.inherit{color:var(--amber);font-family:var(--font-mono);font-size:.74rem;letter-spacing:.12em;text-transform:uppercase;padding-bottom:10px}
        .pl-feats .tick{flex-shrink:0;width:16px;height:16px;margin-top:3px;color:var(--amber)}
        .pl-card--flagship{border-color:rgba(255,182,39,.45)}
        .pl-card--flagship::before{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,182,39,.05),transparent 45%);pointer-events:none}
        .pl-spots{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);border:1px solid rgba(255,182,39,.4);border-radius:3px;padding:4px 9px;margin-bottom:14px;width:fit-content}
        .pl-bonus-note{font-family:var(--font-mono);font-size:.74rem;color:var(--steel);text-align:center;margin-top:22px}
        .pl-kill{margin-top:64px;padding:34px 30px}
        .pl-kill h2{margin-bottom:12px}
        .pl-kill p{max-width:760px;line-height:1.75;font-size:.98rem}
        .pl-guarantees{display:grid;grid-template-columns:1fr;gap:18px;margin-top:26px}
        @media(min-width:800px){.pl-guarantees{grid-template-columns:1fr 1fr}}
        .pl-g{padding:26px 24px}
        .pl-g .eyebrow{display:block;margin-bottom:10px}
        .pl-g blockquote{margin:0 0 14px;color:var(--paper);font-size:1rem;line-height:1.65}
        .pl-g ul{margin:0;padding-left:18px;color:var(--steel);font-size:.85rem;line-height:1.7}
        .pl-spots-table{margin-top:26px}
        .pl-bonuses{margin-top:26px}
        .pl-bonuses ol{margin:14px 0 0;padding-left:0;list-style:none;counter-reset:bonus;display:grid;gap:10px}
        .pl-bonuses li{counter-increment:bonus;display:flex;gap:14px;align-items:flex-start;font-size:.92rem;color:var(--paper);line-height:1.55}
        .pl-bonuses li::before{content:'0' counter(bonus);font-family:var(--font-mono);font-size:.72rem;color:var(--amber);border:1px solid var(--navy-edge);border-radius:3px;padding:3px 7px;flex-shrink:0;margin-top:1px}
        .pl-bonuses li span{color:var(--steel);display:block;font-size:.85rem}
        .pl-sla{margin-top:64px}
        .pl-sla-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}
        @media(min-width:800px){.pl-sla-grid{grid-template-columns:repeat(4,1fr)}}
        .pl-sla-item{padding:20px 18px}
        .pl-sla-item .num{display:block;font-size:1.5rem;font-weight:600;color:var(--amber);margin-bottom:4px}
        .pl-sla-item p{font-size:.82rem;line-height:1.55}
        .pl-cta-band{margin-top:72px;text-align:center;padding:56px 30px}
        .pl-cta-band p{max-width:520px;margin:12px auto 26px}
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pl-hero">
        <div className="wrap">
          <span className="eyebrow">Hosting plans</span>
          <h1>Hosting that includes <em>everything</em>.</h1>
          <p className="sub">
            Envosta only hosts the industries it chooses — so every hosting plan comes with the
            industry-specialized site, the SEO, and the review engine built in. One number to call
            or text. You never lift a finger.
          </p>
        </div>
      </section>

      {/* ── The three public plans ───────────────────────────── */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="pl-grid">
            {plans.map((plan) => {
              const flagship = plan.key === 'growth';
              return (
                <div key={plan.key} className={`panel pl-card${flagship ? ' pl-card--flagship' : ''}`}>
                  <span className="layer-tag">
                    {plan.layer === 'hosting_site_base' && 'The base — hosting + site'}
                    {plan.layer === 'marketing_layer' && '+ The marketing layer'}
                    {plan.layer === 'full_program' && '+ The full program'}
                  </span>
                  {flagship && growth?.spotCapPerIndustry ? (
                    <span className="pl-spots">
                      {industries
                        .map((i) => `${i.name}: ${spotsRemaining(i.slug)} of ${i.growthCap} spots open`)
                        .join(' · ')}
                    </span>
                  ) : null}
                  <h3>{plan.name}</h3>
                  <p className="pl-sum">{plan.summary}</p>
                  <div className="pl-price">
                    <span className="amount">{formatDollars(plan.monthlyCents)}</span>
                    <span className="per">/month</span>
                  </div>
                  <div className="pl-setup">
                    {plan.setupCents > 0 ? `${formatDollars(plan.setupCents)} one-time setup` : ' '}
                  </div>
                  <ul className="pl-feats">
                    {plan.inheritsLabel && <li className="inherit">{plan.inheritsLabel}</li>}
                    {plan.contents.map((line) => (
                      <li key={line}>
                        <svg className="tick" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3 8.5l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {line}
                      </li>
                    ))}
                  </ul>
                  <Link href="/scorecard" className={`btn ${flagship ? 'btn--primary' : 'btn--ghost'}`}>
                    {flagship ? 'Check if your city is open' : 'Get your free scorecard'}
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="pl-bonus-note">
            Annual prepay: {ANNUAL_PREPAY.framing} — {ANNUAL_PREPAY.monthsGranted} months for the
            price of {ANNUAL_PREPAY.monthsPaid}.
          </p>
        </div>
      </section>

      {/* ── Commodity-anchor kill block ──────────────────────── */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="panel panel--framed pl-kill">
            <span className="eyebrow">Why this is not $10 hosting</span>
            <h2>Cheap hosting rents you a server. This runs your entire online presence.</h2>
            <p>
              A {formatDollars(1000)}-a-month host gives you an empty server and a control panel —
              the site, the SEO, the reviews, and the upkeep are your problem. An Envosta plan is
              industry-specialized managed hosting where all of that is part of the plan: we build
              the site, run the search work, manage the reviews, and answer one number when you
              need anything. That is why plans start at {growth ? formatDollars(plans[0].monthlyCents) : ''} a month, not {formatDollars(1000)}.
            </p>
          </div>
        </div>
      </section>

      {/* ── Guarantees (locked wording concepts, offer spec §3) ─ */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <span className="eyebrow">The guarantees</span>
          <div className="pl-guarantees">
            {deliverableGuarantee && (
              <div className="panel pl-g">
                <span className="eyebrow" style={{ color: 'var(--steel)' }}>
                  Basic & Business — {deliverableGuarantee.name}
                </span>
                <blockquote>“{deliverableGuarantee.promise}”</blockquote>
              </div>
            )}
            {makeGood && (
              <div className="panel pl-g" style={{ borderColor: 'rgba(255,182,39,.35)' }}>
                <span className="eyebrow">Growth — {makeGood.name}</span>
                <blockquote>“{makeGood.promise}”</blockquote>
                <ul>
                  {makeGood.conditions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Growth program: bonuses + real exclusivity ───────── */}
      {growth && (
        <section style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="panel pl-kill">
              <span className="eyebrow">Growth, pitched plainly</span>
              <h2>{GROWTH_PROGRAM_NAME} — one company per industry, per city.</h2>
              <p>
                Growth is capped at {growth.spotCapPerIndustry} spots per industry, and every spot
                is city-exclusive: when your city is taken, it is taken. The scarcity is real or it
                is not shown — current availability below comes straight from our ledger.
              </p>
              <div className="table-scroll pl-spots-table">
                <table>
                  <thead>
                    <tr>
                      <th>Industry</th>
                      <th>Spots open</th>
                      <th>Cap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {industries.map((i) => (
                      <tr key={i.slug}>
                        <td>{i.name}</td>
                        <td className="num">{spotsRemaining(i.slug)}</td>
                        <td className="num">{i.growthCap}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pl-bonuses">
                <span className="eyebrow" style={{ color: 'var(--steel)' }}>Included with Growth</span>
                <ol>
                  {GROWTH_BONUSES.map((b) => (
                    <li key={b.name}>
                      <div>
                        {b.name}
                        <span>{b.description}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Service promise strip ────────────────────────────── */}
      <section className="pl-sla" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <span className="eyebrow">The service promise</span>
          <div className="pl-sla-grid">
            <div className="panel pl-sla-item">
              <span className="num">&lt;{SERVICE_PROMISE.acknowledgeHours}h</span>
              <p>Every request acknowledged in under {SERVICE_PROMISE.acknowledgeHours} hours</p>
            </div>
            {plans
              .filter((p) => p.editSlaBusinessDays != null)
              .map((p) => (
                <div key={p.key} className="panel pl-sla-item">
                  <span className="num">&lt;{p.editSlaBusinessDays}d</span>
                  <p>
                    {p.name} plan edits live in under {p.editSlaBusinessDays} business{' '}
                    {p.editSlaBusinessDays === 1 ? 'day' : 'days'}
                  </p>
                </div>
              ))}
            <div className="panel pl-sla-item">
              <span className="num">Now</span>
              <p>Site-down handled {SERVICE_PROMISE.siteDown}ly, before anything else</p>
            </div>
          </div>
          <p style={{ marginTop: 16, fontSize: '.85rem' }}>
            {SERVICE_PROMISE.coveredBoundary}{' '}
            <Link href="/service-promise" style={{ color: 'var(--amber)' }}>
              Read the full service promise →
            </Link>
          </p>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section style={{ paddingTop: 0, paddingBottom: 96 }}>
        <div className="wrap">
          <div className="panel panel--framed pl-cta-band">
            <h2>Start with the free scorecard.</h2>
            <p>
              We audit your search presence against every competitor in your city and show you
              exactly what the spot is worth — before you spend a dollar.
            </p>
            <Link href="/scorecard" className="btn btn--primary">
              Get your Local Domination Scorecard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
