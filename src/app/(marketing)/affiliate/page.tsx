'use client';

import { useEffect } from 'react';

export default function AffiliatePage() {
  useEffect(() => {
    // Scroll reveal
    document.querySelectorAll('.rv').forEach((el) => {
      new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) entries[0].target.classList.add('v');
        },
        { threshold: 0.05 }
      ).observe(el);
    });
  }, []);

  function toggleFaq(e: React.MouseEvent<HTMLDivElement>) {
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (parent) parent.classList.toggle('open');
  }

  return (
    <>
      <style>{`
/* ── Scroll reveal ── */
.rv{opacity:0;transform:translateY(30px);transition:opacity .7s,transform .7s}.rv.v{opacity:1;transform:none}

/* ── Shared check SVG ── */
.ck{width:16px;height:16px;flex-shrink:0;color:var(--grn)}

/* ═══ HERO ═══ */
.aff-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
.aff-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
.aff-hero .c{position:relative;z-index:1}
.aff-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:600;letter-spacing:-1.5px;line-height:1.12;margin-bottom:20px}
.aff-hero h1 em{font-style:normal;color:#fff;font-weight:500}
.aff-hero p{font-size:1.05rem;color:var(--t2);max-width:560px;margin:0 auto 44px;line-height:1.8;font-weight:300}
.hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}

/* ═══ STATS BAR ═══ */
.stats-bar{padding:0 0 80px}
.stats-bar .c{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.stat-item{text-align:center;padding:32px 20px;background:var(--card);border:1px solid var(--bdr);border-radius:16px}
.stat-item strong{display:block;font-size:clamp(1.8rem,3vw,2.6rem);font-weight:600;letter-spacing:-1px;line-height:1;margin-bottom:6px}
.stat-item strong em{font-style:normal;color:var(--gold-bright);font-weight:600}
.stat-item span{font-size:.82rem;color:var(--t2);font-weight:300}

/* ═══ PARTNER TRACKS ═══ */
.tracks{padding:0 0 100px}
.tracks-header{text-align:center;margin-bottom:56px}
.tracks-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.tracks-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:560px;margin:0 auto;line-height:1.75}

.tracks-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.track-card{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:48px 40px;position:relative;transition:transform .3s,border-color .3s;display:flex;flex-direction:column}
.track-card:hover{transform:translateY(-4px);border-color:var(--bdr2)}
.track-card.featured{border-color:var(--gold);background:linear-gradient(180deg,rgba(37,99,235,.06),var(--card) 50%)}
.track-card.featured::before{content:'Hiring Now';position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;padding:4px 16px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase}
.track-icon{width:56px;height:56px;border-radius:14px;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;margin-bottom:24px;color:var(--gold)}
.track-icon svg{width:28px;height:28px}
.track-card h3{font-size:1.3rem;font-weight:500;letter-spacing:-.3px;margin-bottom:8px}
.track-card .track-sub{font-size:.82rem;color:var(--t3);font-weight:300;margin-bottom:24px;line-height:1.7}
.track-card .commission-highlight{background:var(--card2);border:1px solid var(--bdr);border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center}
.commission-highlight .rate{font-size:2.2rem;font-weight:600;color:var(--t1);letter-spacing:-1px;line-height:1}
.commission-highlight .rate em{font-style:normal;color:var(--gold-bright)}
.commission-highlight .rate-desc{font-size:.78rem;color:var(--t3);margin-top:6px;font-weight:300}
.track-card ul{list-style:none;margin-bottom:32px;flex:1}
.track-card li{font-size:.84rem;color:var(--t2);padding:8px 0;border-bottom:1px solid var(--bdr);display:flex;align-items:center;gap:10px;font-weight:300}
.track-card li:last-child{border:none}
.track-card .bp{width:100%;justify-content:center;padding:14px 24px;font-size:.88rem;margin-top:auto}

/* ═══ HOW IT WORKS ═══ */
.how-it-works{padding:0 0 100px}
.how-header{text-align:center;margin-bottom:56px}
.how-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.how-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:520px;margin:0 auto;line-height:1.75}

.steps-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.step-card{background:var(--card);border:1px solid var(--bdr);border-radius:14px;padding:32px 24px;position:relative;transition:border-color .3s}
.step-card:hover{border-color:var(--bdr2)}
.step-num{width:36px;height:36px;border-radius:10px;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:.82rem;font-weight:600;color:var(--gold)}
.step-card h4{font-size:.88rem;font-weight:500;margin-bottom:6px}
.step-card p{font-size:.82rem;color:var(--t2);line-height:1.7;font-weight:300}

/* ═══ COMMISSION TABLE ═══ */
.tiers{padding:0 0 100px}
.tiers-header{text-align:center;margin-bottom:56px}
.tiers-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.tiers-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:560px;margin:0 auto;line-height:1.75}

.tier-table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--bdr);border-radius:16px;overflow:hidden}
.tier-table thead{background:var(--card2)}
.tier-table th{padding:16px 24px;text-align:left;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:2px;color:var(--t3);border-bottom:1px solid var(--bdr)}
.tier-table td{padding:16px 24px;font-size:.88rem;color:var(--t2);border-bottom:1px solid var(--bdr);font-weight:300}
.tier-table tr:last-child td{border-bottom:none}
.tier-badge{display:inline-block;padding:3px 10px;border-radius:100px;font-size:.68rem;font-weight:600;letter-spacing:.5px}
.tier-badge.bronze{background:rgba(205,127,50,.12);color:#cd7f32}
.tier-badge.silver{background:rgba(192,192,192,.12);color:#c0c0c0}
.tier-badge.gold{background:rgba(37,99,235,.12);color:var(--gold-bright)}
.tier-badge.platinum{background:rgba(34,197,94,.12);color:#22c55e}

/* ═══ SALES PARTNERS D2D ═══ */
.d2d{padding:0 0 100px}
.d2d-inner{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:48px;overflow:hidden}
.d2d-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.d2d-text h2{font-size:clamp(1.6rem,3vw,2.2rem);font-weight:500;letter-spacing:-.5px;line-height:1.15;margin-bottom:16px}
.d2d-text p{font-size:.88rem;color:var(--t2);line-height:1.7;font-weight:300;margin-bottom:24px}
.d2d-features{display:flex;flex-direction:column;gap:12px}
.d2d-feat{display:flex;align-items:flex-start;gap:12px}
.d2d-feat .feat-dot{width:28px;height:28px;border-radius:8px;background:rgba(34,197,94,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.d2d-feat .feat-dot svg{width:14px;height:14px;color:var(--grn)}
.d2d-feat h5{font-size:.84rem;font-weight:500;margin-bottom:2px}
.d2d-feat p{font-size:.78rem;color:var(--t3);font-weight:300;margin:0}

/* D2D dashboard illustration */
.d2d-dash{background:var(--card2);border:1px solid var(--bdr);border-radius:var(--r);padding:24px;display:flex;flex-direction:column;gap:16px}
.d2d-dash-header{display:flex;align-items:center;justify-content:space-between}
.d2d-dash-header h5{font-size:.78rem;font-weight:500;color:var(--t1)}
.d2d-dash-header .live-dot{display:flex;align-items:center;gap:6px;font-size:.68rem;color:var(--grn);font-weight:400}
.d2d-dash-header .live-dot::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--grn);animation:dotPulse 2s ease-in-out infinite}
.dash-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.dash-stat{background:var(--card);border:1px solid var(--bdr);border-radius:10px;padding:14px 12px;text-align:center}
.dash-stat strong{display:block;font-size:1.1rem;font-weight:600;color:var(--t1);margin-bottom:2px}
.dash-stat span{font-size:.66rem;color:var(--t3);font-weight:300;text-transform:uppercase;letter-spacing:1px}
.dash-activity{display:flex;flex-direction:column;gap:8px}
.dash-row{display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--card);border:1px solid var(--bdr);border-radius:8px}
.dash-row .status-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dash-row .status-dot.active{background:var(--grn)}
.dash-row .status-dot.pending{background:#f59e0b}
.dash-row span{font-size:.72rem;color:var(--t2);font-weight:300}
.dash-row .amount{margin-left:auto;font-size:.72rem;font-weight:500;color:var(--grn)}
.dash-row .amount.pen{color:#f59e0b}
@keyframes dotPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}

/* ═══ PERKS GRID ═══ */
.perks{padding:0 0 100px}
.perks-header{text-align:center;margin-bottom:56px}
.perks-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.perks-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:520px;margin:0 auto;line-height:1.75}

.perks-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.perk-card{background:var(--card);border:1px solid var(--bdr);border-radius:14px;padding:28px 24px;transition:border-color .3s}
.perk-card:hover{border-color:var(--bdr2)}
.perk-icon{width:40px;height:40px;border-radius:10px;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:var(--gold)}
.perk-icon svg{width:20px;height:20px}
.perk-card h4{font-size:.88rem;font-weight:500;margin-bottom:6px}
.perk-card p{font-size:.82rem;color:var(--t2);line-height:1.7;font-weight:300}

/* ═══ FAQ ═══ */
.faq-section{padding:0 0 100px}
.faq-header{text-align:center;margin-bottom:56px}
.faq-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.faq-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:520px;margin:0 auto;line-height:1.75}
.faq-grid{max-width:800px;margin:0 auto;display:flex;flex-direction:column;gap:8px}
.faq-item{background:var(--card);border:1px solid var(--bdr);border-radius:12px;overflow:hidden;transition:border-color .3s}
.faq-item:hover{border-color:var(--bdr2)}
.faq-q{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;cursor:pointer;gap:16px}
.faq-q h4{font-size:.88rem;font-weight:500;line-height:1.4}
.faq-icon{width:20px;height:20px;flex-shrink:0;color:var(--t3);transition:transform .3s}
.faq-a{max-height:0;overflow:hidden;transition:max-height .4s ease,padding .3s}
.faq-a p{padding:0 24px 20px;font-size:.84rem;color:var(--t2);line-height:1.7;font-weight:300}
.faq-item.open .faq-a{max-height:300px}
.faq-item.open .faq-icon{transform:rotate(45deg)}

/* ═══ CTA ═══ */
.cta{padding:0 0 100px}
.cta-box{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:64px 48px;text-align:center;position:relative;overflow:hidden}
.cta-box::before{content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(37,99,235,.1),transparent 65%);pointer-events:none}
.cta-box h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:16px;position:relative}
.cta-box p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:480px;margin:0 auto 32px;line-height:1.75;position:relative}
.cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;position:relative}

/* ═══ RESPONSIVE ═══ */
@media(max-width:1024px){.tracks-grid{grid-template-columns:1fr 1fr}.steps-grid{grid-template-columns:repeat(2,1fr)}.perks-grid{grid-template-columns:repeat(2,1fr)}.stats-bar .c{grid-template-columns:repeat(2,1fr)}.d2d-grid{grid-template-columns:1fr}.tier-table{font-size:.82rem}}
@media(max-width:768px){.tracks-grid{grid-template-columns:1fr}.steps-grid{grid-template-columns:1fr}.perks-grid{grid-template-columns:1fr}.stats-bar .c{grid-template-columns:1fr}.d2d-grid{grid-template-columns:1fr}.d2d-inner{padding:32px 24px}.track-card{padding:36px 28px}.cta-box{padding:40px 24px}.cta-btns{flex-direction:column;align-items:center}.tier-table th,.tier-table td{padding:12px 14px;font-size:.78rem}}
      `}</style>

      {/* ═══ HERO ═══ */}
      <section className="aff-hero">
        <div className="c">
          <h1 className="rv">Get paid for every customer you <em>bring in</em></h1>
          <p className="rv">Earn a flat commission on every sale you close — whether you&apos;re sending clients from your agency or signing customers up door to door.</p>
          <div className="hero-btns rv">
            <a href="#tracks" className="bp blue lg">Apply as Agency Partner</a>
            <a href="#tracks" className="bp ghost lg">Apply as Sales Partner</a>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="stats-bar rv">
        <div className="c">
          <div className="stat-item">
            <strong>Flat <em>$</em></strong>
            <span>Per-Sale Commission</span>
          </div>
          <div className="stat-item">
            <strong>90<em>-day</em></strong>
            <span>Cookie Duration</span>
          </div>
          <div className="stat-item">
            <strong>$0</strong>
            <span>Cost to Join</span>
          </div>
          <div className="stat-item">
            <strong>Weekly</strong>
            <span>Sales Rep Payouts</span>
          </div>
        </div>
      </section>

      {/* ═══ TWO PARTNER TRACKS ═══ */}
      <section className="tracks rv" id="tracks">
        <div className="c">
          <div className="tracks-header">
            <h2>Two ways to partner with Envosta</h2>
            <p>Whether you refer clients from your agency or close deals face to face, there&apos;s a track built for how you work.</p>
          </div>

          <div className="tracks-grid">

            {/* Track 1: Agency Partner */}
            <div className="track-card">
              <div className="track-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3>Agency Partner</h3>
              <p className="track-sub">For web agencies, freelancers, consultants, and anyone who sends clients our way. Share your unique referral link and earn a flat commission on every signup that converts.</p>
              <div className="commission-highlight">
                <div className="rate">Flat <em>$</em> per sale</div>
                <div className="rate-desc">One-time commission paid on every converted referral</div>
              </div>
              <ul>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Unique referral link and partner dashboard</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>90-day cookie attribution window</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Real-time click and conversion tracking</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Marketing assets and banners provided</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Monthly payouts via PayPal or bank transfer</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Volume bonuses at higher tiers</li>
              </ul>
              <a href="#" className="bp ghost">Apply as Agency Partner</a>
            </div>

            {/* Track 2: Sales Partner */}
            <div className="track-card featured">
              <div className="track-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>
              <h3>Sales Partner</h3>
              <p className="track-sub">For our door-to-door reps and field sales team. Get your own rep code, close deals in person, and earn flat commissions plus performance bonuses on every sale.</p>
              <div className="commission-highlight">
                <div className="rate">Flat <em>$</em> + bonus</div>
                <div className="rate-desc">Per-sale commission + tiered performance bonuses</div>
              </div>
              <ul>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Personal rep code for in-person attribution</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Sales dashboard with pipeline view</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Tiered bonuses at 10, 25, and 50+ sales</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Printed leave-behinds and sales collateral</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Weekly payouts for confirmed sales</li>
                <li><svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Team lead opportunities for top closers</li>
              </ul>
              <a href="#" className="bp blue">Join the Sales Team</a>
            </div>

          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="how-it-works rv">
        <div className="c">
          <div className="how-header">
            <h2>How it works</h2>
            <p>From application to your first payout — here&apos;s the process.</p>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-num">01</div>
              <h4>Apply in 2 minutes</h4>
              <p>Fill out a quick application and tell us which track fits. We review every submission and respond within 48 hours.</p>
            </div>
            <div className="step-card">
              <div className="step-num">02</div>
              <h4>Get your tools</h4>
              <p>Receive your referral link or rep code, access to the partner dashboard, and any sales materials you need.</p>
            </div>
            <div className="step-card">
              <div className="step-num">03</div>
              <h4>Send customers our way</h4>
              <p>Refer clients through your link, hand out your rep code, or close deals face to face — whatever fits your workflow.</p>
            </div>
            <div className="step-card">
              <div className="step-num">04</div>
              <h4>Get paid</h4>
              <p>Earn a flat commission on every converted sale. Track everything in real time and collect payouts on schedule.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ COMMISSION TIERS ═══ */}
      <section className="tiers rv">
        <div className="c">
          <div className="tiers-header">
            <h2>Volume tiers</h2>
            <p>Close more deals, earn more per sale. Hit volume milestones to unlock higher flat-rate commissions and cash bonuses.</p>
          </div>

          <table className="tier-table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Total Sales</th>
                <th>Commission Per Sale</th>
                <th>Bonus</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="tier-badge bronze">Bronze</span></td>
                <td>1 – 10</td>
                <td>Base flat rate</td>
                <td>—</td>
              </tr>
              <tr>
                <td><span className="tier-badge silver">Silver</span></td>
                <td>11 – 25</td>
                <td>Increased flat rate</td>
                <td>$100 milestone bonus</td>
              </tr>
              <tr>
                <td><span className="tier-badge gold">Gold</span></td>
                <td>26 – 50</td>
                <td>Higher flat rate</td>
                <td>$300 milestone bonus</td>
              </tr>
              <tr>
                <td><span className="tier-badge platinum">Platinum</span></td>
                <td>51+</td>
                <td>Top flat rate</td>
                <td>$500 bonus + custom deal</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══ SALES PARTNER D2D SECTION ═══ */}
      <section className="d2d rv" id="sales-section">
        <div className="c">
          <div className="d2d-inner">
            <div className="d2d-grid">
              <div className="d2d-text">
                <h2>Built for field sales teams, not just agencies</h2>
                <p>Our partner platform supports door-to-door reps and local sales teams with the tools they need to close deals and get paid fast. No laptop required — just your rep code and a conversation.</p>
                <div className="d2d-features">
                  <div className="d2d-feat">
                    <div className="feat-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg></div>
                    <div><h5>Personal rep codes</h5><p>Each team member gets a unique code. The customer enters it at checkout and the sale is attributed to you instantly.</p></div>
                  </div>
                  <div className="d2d-feat">
                    <div className="feat-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg></div>
                    <div><h5>Real-time sales tracking</h5><p>See every conversion the moment it happens. Managers get a team-wide view with leaderboards and territory stats.</p></div>
                  </div>
                  <div className="d2d-feat">
                    <div className="feat-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg></div>
                    <div><h5>Weekly payouts</h5><p>Sales partners get paid weekly for confirmed deals. No 30-day hold — you close it, you earn it.</p></div>
                  </div>
                  <div className="d2d-feat">
                    <div className="feat-dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg></div>
                    <div><h5>Team management</h5><p>Assign reps to territories, track performance by region, and promote top closers to team lead positions.</p></div>
                  </div>
                </div>
              </div>

              {/* Dashboard illustration */}
              <div className="d2d-dash">
                <div className="d2d-dash-header">
                  <h5>Sales Dashboard</h5>
                  <div className="live-dot">Live</div>
                </div>
                <div className="dash-stats">
                  <div className="dash-stat"><strong>14</strong><span>Closed</span></div>
                  <div className="dash-stat"><strong>$840</strong><span>Earned</span></div>
                  <div className="dash-stat"><strong>3</strong><span>Pending</span></div>
                </div>
                <div className="dash-activity">
                  <div className="dash-row"><div className="status-dot active"></div><span>Growth plan — J. Rivera</span><span className="amount">+$60</span></div>
                  <div className="dash-row"><div className="status-dot active"></div><span>Growth plan — M. Chen</span><span className="amount">+$60</span></div>
                  <div className="dash-row"><div className="status-dot pending"></div><span>Minimum plan — K. Brooks</span><span className="amount pen">Pending</span></div>
                  <div className="dash-row"><div className="status-dot active"></div><span>Growth plan — T. Okafor</span><span className="amount">+$60</span></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ═══ PERKS GRID ═══ */}
      <section className="perks rv">
        <div className="c">
          <div className="perks-header">
            <h2>Everything you get as a partner</h2>
            <p>Agency or sales — every partner gets the same tools and support from day one.</p>
          </div>

          <div className="perks-grid">

            <div className="perk-card">
              <div className="perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg></div>
              <h4>Partner Dashboard</h4>
              <p>Track clicks, conversions, commissions, and payout history — all in real time from a single dashboard.</p>
            </div>

            <div className="perk-card">
              <div className="perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg></div>
              <h4>Sales Collateral</h4>
              <p>Pre-built banners, one-pagers, email templates, and printed leave-behinds you can hand out in the field.</p>
            </div>

            <div className="perk-card">
              <div className="perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg></div>
              <h4>90-Day Cookie</h4>
              <p>If someone clicks your link today and signs up three months from now, you still get full credit for the sale.</p>
            </div>

            <div className="perk-card">
              <div className="perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg></div>
              <h4>Fast Payouts</h4>
              <p>Agency partners are paid monthly. Sales partners are paid weekly. No long holds or complicated thresholds.</p>
            </div>

            <div className="perk-card">
              <div className="perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg></div>
              <h4>Dedicated Support</h4>
              <p>High-volume partners and team leads get a dedicated partner manager for strategy, materials, and scaling.</p>
            </div>

            <div className="perk-card">
              <div className="perk-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg></div>
              <h4>Performance Bonuses</h4>
              <p>Hit sales milestones to unlock cash bonuses, higher per-sale rates, and exclusive partner rewards.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══ */}
      <section className="faq-section rv">
        <div className="c">
          <div className="faq-header">
            <h2>Partner program FAQ</h2>
            <p>Common questions from agency partners and sales reps.</p>
          </div>

          <div className="faq-grid">

            <div className="faq-item open">
              <div className="faq-q" onClick={toggleFaq}>
                <h4>How much do I earn per sale?</h4>
                <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
              <div className="faq-a"><p>You earn a flat dollar amount for every sale that converts. The exact payout depends on which hosting plan the customer signs up for and your current volume tier. Higher-value plans and higher tiers mean a bigger payout per sale.</p></div>
            </div>

            <div className="faq-item">
              <div className="faq-q" onClick={toggleFaq}>
                <h4>When and how do I get paid?</h4>
                <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
              <div className="faq-a"><p>Agency partners are paid monthly via PayPal or direct bank transfer. Sales partners are paid weekly for confirmed deals. There is a $50 minimum payout threshold.</p></div>
            </div>

            <div className="faq-item">
              <div className="faq-q" onClick={toggleFaq}>
                <h4>What&apos;s the difference between agency and sales partners?</h4>
                <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
              <div className="faq-a"><p>Agency partners refer customers online using a unique link. Sales partners close deals in person using a rep code — typically as part of our door-to-door team. Sales partners get weekly payouts, printed collateral, and territory management tools.</p></div>
            </div>

            <div className="faq-item">
              <div className="faq-q" onClick={toggleFaq}>
                <h4>How does the rep code work for door-to-door sales?</h4>
                <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
              <div className="faq-a"><p>Each sales partner gets a unique code. When a prospect signs up on our website and enters the code at checkout, the sale is automatically attributed to you. No special link needed — just the code.</p></div>
            </div>

            <div className="faq-item">
              <div className="faq-q" onClick={toggleFaq}>
                <h4>Is there a cost to join?</h4>
                <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
              <div className="faq-a"><p>No. The partner program is completely free to join. There are no fees, no minimums, and no commitments for either track.</p></div>
            </div>

            <div className="faq-item">
              <div className="faq-q" onClick={toggleFaq}>
                <h4>Do I need to be an Envosta customer?</h4>
                <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
              <div className="faq-a"><p>No, you don&apos;t need an active hosting plan to refer others. That said, many of our best partners use Envosta themselves — it helps when you can speak from experience.</p></div>
            </div>

            <div className="faq-item">
              <div className="faq-q" onClick={toggleFaq}>
                <h4>What marketing materials do you provide?</h4>
                <svg className="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
              <div className="faq-a"><p>We provide web banners, email templates, social media copy, comparison guides, and printed one-pagers and business cards for field reps. Everything is available in your partner dashboard.</p></div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="cta rv">
        <div className="c">
          <div className="cta-box">
            <h2>Ready to start earning?</h2>
            <p>Apply today and get your partner dashboard, referral link or rep code, and sales tools within 48 hours.</p>
            <div className="cta-btns">
              <a href="#tracks" className="bp blue lg">Apply as Agency Partner</a>
              <a href="#tracks" className="bp ghost lg">Apply as Sales Partner</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
