/**
 * Homepage — hosting-first Hook–Story–Offer for a trades owner
 * (rebuild brief Phase 2.1, charter §5 brand + §6 voice).
 *
 * Required blocks, in order: identity line · hook · story · offer (plans,
 * monthly price leading) · commodity-anchor kill · provenance strip ("The
 * Stack", approved claims only) · future-proof (claim #5 demonstrated form)
 * · proof placeholder (no fabricated testimonials) · CTA.
 *
 * Everything numeric renders from config/pricing; industries and spot
 * counts from config/industries. No literals, no unanchored superlatives,
 * no exclamation marks, no fake scarcity.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { publicPlans, formatDollars, SERVICE_PROMISE } from '@/config/pricing';
import { activeIndustries, spotsRemaining } from '@/config/industries';

export const metadata: Metadata = {
  title: 'Envosta — Industry-Specialized Managed WordPress Hosting',
  description:
    'A hosting company that only hosts the industries it chooses — so every plan includes the site, the SEO, and the reviews. Built on wp.cloud by Automattic. White-glove, hands-free.',
  alternates: { canonical: 'https://envosta.com' },
};

export default function HomePage() {
  const plans = publicPlans();
  const industries = activeIndustries();
  const industryNames = industries.map((i) => i.name);
  const industryLine =
    industryNames.length > 1
      ? `${industryNames.slice(0, -1).join(', ')} and ${industryNames[industryNames.length - 1]}`
      : industryNames[0] ?? '';
  const firstIndustry = industries[0];

  return (
    <div className="mk2">
      <style>{`
        .hm-hero{padding:96px 0 72px}
        .hm-hero .identity{display:inline-flex;align-items:center;gap:10px;font-family:var(--font-mono);font-size:.7rem;letter-spacing:.22em;text-transform:uppercase;color:var(--amber);border:1px solid rgba(255,182,39,.35);border-radius:3px;padding:7px 13px;margin-bottom:26px}
        .hm-hero h1{max-width:820px}
        .hm-hero .sub{max-width:640px;margin-top:22px;font-size:1.08rem;line-height:1.75}
        .hm-hero .cta-row{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px;align-items:center}
        .hm-hero .cta-note{font-family:var(--font-mono);font-size:.72rem;color:var(--steel-dim);letter-spacing:.06em}
        .hm-hook{padding-top:0}
        .hm-hook .panel{padding:36px 32px}
        .hm-hook h2{max-width:700px;margin-bottom:14px}
        .hm-hook p{max-width:720px;line-height:1.75;font-size:.98rem}
        .hm-hook .try{font-family:var(--font-mono);font-size:.85rem;color:var(--paper);background:var(--navy-deep);border:1px solid var(--navy-edge);border-radius:3px;padding:10px 14px;display:inline-block;margin:16px 0}
        .hm-story{padding-top:0}
        .hm-story .grid{display:grid;grid-template-columns:1fr;gap:16px}
        @media(min-width:860px){.hm-story .grid{grid-template-columns:repeat(3,1fr)}}
        .hm-story .step{padding:24px 22px}
        .hm-story .step .n{font-family:var(--font-mono);font-size:.7rem;letter-spacing:.2em;color:var(--amber);display:block;margin-bottom:10px}
        .hm-story .step h3{margin-bottom:8px;font-size:1.02rem}
        .hm-story .step p{font-size:.88rem;line-height:1.65}
        .hm-offer{padding-top:0}
        .hm-plans{display:grid;grid-template-columns:1fr;gap:16px;margin-top:26px}
        @media(min-width:900px){.hm-plans{grid-template-columns:repeat(3,1fr)}}
        .hm-plan{padding:26px 24px;display:flex;flex-direction:column}
        .hm-plan .price{font-family:var(--font-mono);font-weight:600;font-size:2rem;color:var(--paper)}
        .hm-plan .price small{font-size:.75rem;color:var(--steel);font-weight:400}
        .hm-plan .setup{font-family:var(--font-mono);font-size:.72rem;color:var(--steel-dim);margin-top:2px;min-height:1em}
        .hm-plan h3{margin:14px 0 6px}
        .hm-plan p{font-size:.88rem;line-height:1.6;flex:1}
        .hm-plan .go{font-family:var(--font-mono);font-size:.78rem;color:var(--amber);margin-top:18px;text-decoration:none;letter-spacing:.08em}
        .hm-plan--flagship{border-color:rgba(255,182,39,.45)}
        .hm-plan .spots{font-family:var(--font-mono);font-size:.66rem;letter-spacing:.14em;text-transform:uppercase;color:var(--amber);margin-top:10px}
        .hm-kill{padding-top:0}
        .hm-kill .panel{padding:36px 32px}
        .hm-kill p{max-width:760px;line-height:1.75;font-size:.98rem}
        .hm-stack{padding-top:0}
        .hm-stack .grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:24px}
        @media(min-width:860px){.hm-stack .grid{grid-template-columns:repeat(3,1fr)}}
        .hm-stack .claim{border-top:2px solid var(--amber-deep);padding:16px 4px 0}
        .hm-stack .claim .co{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.16em;text-transform:uppercase;color:var(--steel);margin-bottom:8px}
        .hm-stack .claim h3{font-size:1rem;margin-bottom:6px}
        .hm-stack .claim p{font-size:.85rem;line-height:1.65}
        .hm-future{padding-top:0}
        .hm-future .panel{padding:32px 30px}
        .hm-future p{max-width:740px;line-height:1.75;font-size:.95rem}
        .hm-promise{padding-top:0}
        .hm-promise .row{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}
        @media(min-width:860px){.hm-promise .row{grid-template-columns:repeat(4,1fr)}}
        .hm-promise .item{padding:18px 16px}
        .hm-promise .item .num{display:block;font-size:1.35rem;font-weight:600;color:var(--amber);margin-bottom:4px}
        .hm-promise .item p{font-size:.8rem;line-height:1.5}
        .hm-proof{padding-top:0}
        .hm-proof .panel{padding:30px 28px;text-align:center}
        .hm-proof p{max-width:560px;margin:8px auto 0;font-size:.9rem;line-height:1.7}
        .hm-cta{padding-top:0;padding-bottom:104px}
        .hm-cta .panel{padding:56px 32px;text-align:center}
        .hm-cta p{max-width:560px;margin:14px auto 28px;line-height:1.7}
      `}</style>

      {/* ── Identity line + hero (the Hook) ─────────────────── */}
      <section className="hm-hero">
        <div className="wrap">
          <span className="identity">Industry-specialized managed hosting</span>
          <h1>
            Your competitor is getting the calls <em>that should be yours.</em>
          </h1>
          <p className="sub">
            Envosta is a hosting company that only hosts {industryLine} — so every hosting plan
            includes the industry-specialized site, the search work, and the review engine. You get
            found on Google, the phone rings, and you never think about your website again.
          </p>
          <div className="cta-row">
            <Link href="/scorecard" className="btn btn--primary">Get your free scorecard</Link>
            <Link href="/plans" className="btn btn--ghost">See the hosting plans</Link>
          </div>
          <p className="cta-note" style={{ marginTop: 18 }}>
            One number, call or text · acknowledged in under {SERVICE_PROMISE.acknowledgeHours} hours
          </p>
        </div>
      </section>

      {/* ── Searchable-proof hook detail ─────────────────────── */}
      <section className="hm-hook">
        <div className="wrap">
          <div className="panel panel--framed">
            <span className="eyebrow">Try it right now</span>
            <h2>Type your trade and your city into Google.</h2>
            {firstIndustry && (
              <span className="try num">
                “{firstIndustry.vocabulary.searchExamples[0]}”
              </span>
            )}
            <p>
              See who shows up. Whoever owns that page owns the {firstIndustry?.vocabulary.jobNoun ?? 'jobs'} in
              your city — and that spot is ownable. One company per industry per city gets it with
              us. The only question is whether yours is still open.
            </p>
          </div>
        </div>
      </section>

      {/* ── The Story ────────────────────────────────────────── */}
      <section className="hm-story">
        <div className="wrap">
          <span className="eyebrow">The story we see every week</span>
          <div className="grid" style={{ marginTop: 22 }}>
            <div className="panel step">
              <span className="n">Before</span>
              <h3>Great at the work, invisible online</h3>
              <p>
                The best {firstIndustry?.vocabulary.ownerTitle ?? 'trades owner'} in town loses jobs
                to a worse one with a better Google presence — while paying for leads that get sold
                to four competitors at once.
              </p>
            </div>
            <div className="panel step">
              <span className="n">The wall</span>
              <h3>Agencies rent, duct-tape, and hold hostage</h3>
              <p>
                Page builders on commodity hosting, a domain registered in the agency&apos;s name,
                rented ads that stop the day you stop paying. Nothing you own, nothing that
                compounds.
              </p>
            </div>
            <div className="panel step">
              <span className="n">The shift</span>
              <h3>Owned search, run as a hosting plan</h3>
              <p>
                The canonical stack plus an AI-native pipeline makes owned search an operable
                service: your domain in your name, your site on real infrastructure, the search
                work done for you every month.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The Offer (plans, monthly price leads) ───────────── */}
      <section className="hm-offer">
        <div className="wrap">
          <span className="eyebrow">The hosting plans</span>
          <h2 style={{ marginTop: 10 }}>Pick how much of it you want handled.</h2>
          <div className="hm-plans">
            {plans.map((plan) => {
              const flagship = plan.key === 'growth';
              return (
                <div key={plan.key} className={`panel hm-plan${flagship ? ' hm-plan--flagship' : ''}`}>
                  <div>
                    <span className="price num">
                      {formatDollars(plan.monthlyCents)}<small>/mo</small>
                    </span>
                    <div className="setup num">
                      {plan.setupCents > 0 ? `+ ${formatDollars(plan.setupCents)} setup` : ''}
                    </div>
                  </div>
                  <h3>{plan.name}</h3>
                  <p>{plan.summary}</p>
                  {flagship && (
                    <span className="spots">
                      {industries
                        .map((i) => `${i.name}: ${spotsRemaining(i.slug)} spots open`)
                        .join(' · ')}
                    </span>
                  )}
                  <Link href="/plans" className="go">
                    See what&apos;s included →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Commodity-anchor kill block ──────────────────────── */}
      <section className="hm-kill">
        <div className="wrap">
          <div className="panel">
            <span className="eyebrow">Why this is not $10 hosting</span>
            <h2 style={{ margin: '12px 0' }}>
              Cheap hosting rents you a server. An Envosta plan runs your entire online presence.
            </h2>
            <p>
              The server is the smallest part of what you are buying. The plan is the site built for
              your industry, the service-area pages that rank, the reviews that convert, the monthly
              report you can read in one minute, and a team that answers one number. Hosting is the
              category; everything your business needs to be found is the plan.
            </p>
          </div>
        </div>
      </section>

      {/* ── Provenance strip: The Stack (approved claims only) ─ */}
      <section className="hm-stack">
        <div className="wrap">
          <span className="eyebrow">The Stack — not pieced together</span>
          <h2 style={{ marginTop: 10 }}>
            Competitors duct-tape tools together. We run the canonical stack.
          </h2>
          <div className="grid">
            <div className="claim">
              <div className="co">WordPress</div>
              <h3>The world&apos;s dominant CMS</h3>
              <p>
                WordPress powers over 40% of the web — the same software behind WhiteHouse.gov,
                NASA.gov, and countless Fortune 500 web properties.
              </p>
            </div>
            <div className="claim">
              <div className="co">wp.cloud · Automattic</div>
              <h3>The maker&apos;s own infrastructure</h3>
              <p>
                Built by Automattic, the makers of WordPress — the same infrastructure behind
                WordPress.com. Envosta is a direct Automattic partner, not a reseller.
              </p>
            </div>
            <div className="claim">
              <div className="co">Tucows · OpenSRS</div>
              <h3>The registrar Shopify runs on</h3>
              <p>
                Domains on Tucows/OpenSRS — the world&apos;s second-largest domain registrar, the
                same platform behind Shopify&apos;s domain registration. Registered in your name,
                always.
              </p>
            </div>
          </div>
          <p style={{ marginTop: 20, fontSize: '.9rem' }}>
            <Link href="/stack" style={{ color: 'var(--amber)' }}>
              Why our infrastructure matters →
            </Link>
          </p>
        </div>
      </section>

      {/* ── Future-proof block (claim #5, demonstrated form) ─── */}
      <section className="hm-future">
        <div className="wrap">
          <div className="panel">
            <span className="eyebrow">Future-proof, demonstrated</span>
            <h2 style={{ margin: '12px 0' }}>AI-ready is not a promise here. It is the pipeline.</h2>
            <p>
              Every Envosta site is built and maintained through an AI-native pipeline today — and
              because WordPress is the dominant open platform, every AI advance targets it first.
              As the technology moves, your site moves with it, and Envosta manages every step for
              you.
            </p>
          </div>
        </div>
      </section>

      {/* ── Service promise strip ────────────────────────────── */}
      <section className="hm-promise">
        <div className="wrap">
          <span className="eyebrow">White-glove means measured</span>
          <div className="row">
            <div className="panel item">
              <span className="num">&lt;{SERVICE_PROMISE.acknowledgeHours}h</span>
              <p>Every request acknowledged</p>
            </div>
            <div className="panel item">
              <span className="num">1 line</span>
              <p>One number to call or text — that&apos;s the whole process</p>
            </div>
            <div className="panel item">
              <span className="num">5 steps</span>
              <p>Logged, executed, QA&apos;d, confirmed back to you — every time</p>
            </div>
            <div className="panel item">
              <span className="num">0</span>
              <p>Things you have to do yourself. You never lift a finger.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Proof — structure only, no fabricated content ────── */}
      {/* PROOF: pending real client data — client results, reviews, and case
          studies render here once the first cohort has measurable outcomes.
          Nothing fabricated ships in the meantime. */}
      <section className="hm-proof">
        <div className="wrap">
          <div className="panel">
            <span className="eyebrow">Proof</span>
            <p>
              We publish real client results only — measured booked calls, tracked rankings, and
              named reviews. Our first cohort&apos;s numbers will appear here as they come in, not
              before.
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="hm-cta">
        <div className="wrap">
          <div className="panel panel--framed">
            <span className="eyebrow">Start here</span>
            <h2>See what your city&apos;s spot is worth.</h2>
            <p>
              The Local Domination Scorecard is a free teardown of your search presence against
              every competitor in your city — what you own, what they own, and what it would take
              to flip it.
            </p>
            <Link href="/scorecard" className="btn btn--primary">Get your free scorecard</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
