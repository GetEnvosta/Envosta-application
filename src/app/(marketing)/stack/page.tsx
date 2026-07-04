/**
 * /stack — "The Stack" primary positioning page (rebuild brief Phase 2.6).
 * The pieced-together-vs-canonical story, all five approved provenance
 * claims with their proof anchors (charter §1 — nothing beyond the list),
 * Canadian/Calgary/founder-led, native wp.cloud capabilities, and why
 * specialization beats generic hosting. Credibility, not tech specs.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Stack — Why Envosta Hosting | Envosta',
  description:
    'Competitors piece together page builders, commodity hosting, and plugin sprawl. Envosta runs the canonical stack end to end: WordPress, wp.cloud by Automattic, and Tucows/OpenSRS domains.',
  alternates: { canonical: 'https://envosta.com/stack' },
};

export default function StackPage() {
  return (
    <div className="mk2">
      <style>{`
        .st-hero{padding:88px 0 48px}
        .st-hero h1{max-width:780px}
        .st-hero p{max-width:640px;margin-top:20px;font-size:1.05rem;line-height:1.75}
        .st-vs{padding-top:0}
        .st-vs .grid{display:grid;grid-template-columns:1fr;gap:16px}
        @media(min-width:800px){.st-vs .grid{grid-template-columns:1fr 1fr}}
        .st-vs .col{padding:28px 26px}
        .st-vs .col h3{margin-bottom:14px}
        .st-vs ul{margin:0;padding-left:18px;color:var(--steel);font-size:.92rem;line-height:2}
        .st-vs .col--us{border-color:rgba(255,182,39,.4)}
        .st-vs .col--us ul{color:var(--paper)}
        .st-claims{padding-top:0}
        .st-claim{padding:28px 26px;margin-bottom:14px}
        .st-claim .co{font-family:var(--font-mono);font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:var(--amber);display:block;margin-bottom:8px}
        .st-claim h3{font-size:1.15rem;margin-bottom:8px}
        .st-claim p{max-width:760px;font-size:.94rem;line-height:1.75}
        .st-claim .anchor{font-family:var(--font-mono);font-size:.74rem;color:var(--steel-dim);margin-top:10px;display:block}
        .st-who{padding-top:0;padding-bottom:100px}
        .st-who .panel{padding:34px 30px}
        .st-who p{max-width:760px;line-height:1.75;font-size:.96rem}
        .st-who .facts{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
        .st-who .fact{font-family:var(--font-mono);font-size:.72rem;letter-spacing:.1em;color:var(--steel);border:1px solid var(--navy-edge);border-radius:3px;padding:6px 11px}
      `}</style>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="st-hero">
        <div className="wrap">
          <span className="eyebrow">Why our infrastructure</span>
          <h1>
            Most competitors duct-tape tools together. <em>We run the canonical stack.</em>
          </h1>
          <p>
            Page builders on commodity hosting, a random registrar, twenty plugins patching gaps —
            that is how most local-business websites are held together. Envosta runs the platforms
            the web actually standardized on, end to end, under one roof: one stack, one number to
            call.
          </p>
        </div>
      </section>

      {/* ── Pieced-together vs canonical ─────────────────────── */}
      <section className="st-vs">
        <div className="wrap">
          <div className="grid">
            <div className="panel col">
              <h3>The duct-tape stack</h3>
              <ul>
                <li>A page builder rented month to month</li>
                <li>Commodity hosting that oversells the box</li>
                <li>A domain registered in the agency&apos;s name</li>
                <li>Plugin sprawl patching what the platform lacks</li>
                <li>Four vendors pointing at each other when it breaks</li>
              </ul>
            </div>
            <div className="panel col col--us">
              <h3>The canonical stack</h3>
              <ul>
                <li>WordPress — the web&apos;s dominant CMS</li>
                <li>wp.cloud — infrastructure by WordPress&apos;s own maker</li>
                <li>Tucows/OpenSRS domains — in your name, always</li>
                <li>Native security, backups, and failover — not bolted on</li>
                <li>One company running all of it, answering one number</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── The five approved provenance claims ──────────────── */}
      <section className="st-claims">
        <div className="wrap">
          <span className="eyebrow" style={{ display: 'block', marginBottom: 20 }}>
            The receipts
          </span>
          <div className="panel st-claim">
            <span className="co">01 · WordPress</span>
            <h3>The world&apos;s dominant CMS</h3>
            <p>
              WordPress powers over 40% of the web. It is not a bet on a trendy tool — it is the
              platform the web standardized on.
            </p>
          </div>
          <div className="panel st-claim">
            <span className="co">02 · Enterprise company</span>
            <h3>The same software behind WhiteHouse.gov and NASA.gov</h3>
            <p>
              The software running your site is the same software behind WhiteHouse.gov, NASA.gov,
              and countless Fortune 500 web properties — run on infrastructure built by
              WordPress&apos;s own maker, and managed for you.
            </p>
            <span className="anchor">Verifiable: both sites publicly run WordPress.</span>
          </div>
          <div className="panel st-claim">
            <span className="co">03 · wp.cloud by Automattic</span>
            <h3>Hosted on the maker&apos;s own infrastructure</h3>
            <p>
              wp.cloud is the infrastructure platform built by Automattic, the makers of WordPress —
              the same infrastructure behind WordPress.com. Envosta is a direct Automattic partner,
              not a reseller. Security, daily backups, and failover are native to the platform, not
              bolted on by us.
            </p>
          </div>
          <div className="panel st-claim">
            <span className="co">04 · Tucows / OpenSRS</span>
            <h3>Domains on the registrar platform Shopify runs on</h3>
            <p>
              Your domain is registered on Tucows/OpenSRS — the world&apos;s second-largest domain
              registrar, the same platform behind Shopify&apos;s domain registration. Registered in
              your name: you own it, we operate it, and if you ever leave, it goes with you.
            </p>
            <span className="anchor">
              Verifiable: Shopify&apos;s domain registration agreement is the Tucows agreement.
            </span>
          </div>
          <div className="panel st-claim">
            <span className="co">05 · AI-native, demonstrated</span>
            <h3>Every site is built and maintained through an AI-native pipeline today</h3>
            <p>
              Not a roadmap slide — the pipeline we run now. And because WordPress is the dominant
              open platform, every AI advance targets it first. As the technology moves, your site
              moves with it, and Envosta manages every step for you.
            </p>
          </div>
        </div>
      </section>

      {/* ── Who's behind it + specialization ─────────────────── */}
      <section className="st-who">
        <div className="wrap">
          <div className="panel panel--framed">
            <span className="eyebrow">Who you&apos;re dealing with</span>
            <h2 style={{ margin: '12px 0' }}>Canadian, founder-led, specialized on purpose.</h2>
            <p>
              Envosta is headquartered in Calgary and run by its founder. We host a small list of
              industries deliberately, because specialization is what makes the plan work: the site
              patterns, the service-area pages, and the review playbook are already proven for your
              industry before you sign. Generic hosts sell everyone the same empty box — we run and
              manage your entire online presence, and only for businesses like yours.
            </p>
            <div className="facts">
              <span className="fact">Calgary, Canada</span>
              <span className="fact">Founder-led</span>
              <span className="fact">Direct Automattic partner</span>
              <span className="fact">Domains in the client&apos;s name</span>
            </div>
            <p style={{ marginTop: 24 }}>
              <Link href="/plans" className="btn btn--primary">See the hosting plans</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
