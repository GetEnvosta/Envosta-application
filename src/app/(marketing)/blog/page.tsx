'use client';

import { useEffect } from 'react';
import type { Metadata } from 'next';

// NOTE: metadata export requires a separate file or removing 'use client'.
// For now, we keep 'use client' for the interactive JS and export metadata
// from a companion layout or by splitting into a server wrapper later.

export default function BlogPage() {
  useEffect(() => {
    // Scroll reveal
    document.querySelectorAll('.rv').forEach((el) => {
      new IntersectionObserver(
        (e) => {
          if (e[0].isIntersecting) e[0].target.classList.add('v');
        },
        { threshold: 0.05 }
      ).observe(el);
    });

    // Mobile nav close
    document.querySelectorAll('.mn a').forEach((l) =>
      l.addEventListener('click', () =>
        document.querySelector('.mn')?.classList.remove('open')
      )
    );

    // Category filter interaction
    document.querySelectorAll('.cat-btn').forEach((btn) => {
      btn.addEventListener('click', function (this: HTMLElement, e: Event) {
        e.preventDefault();
        document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
        this.classList.add('active');
      });
    });
  }, []);

  return (
    <>
      <style>{`
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#040710;color:#d0d8e8;line-height:1.7;overflow-x:hidden;-webkit-font-smoothing:antialiased}
:root{--bg:#03060e;--bg2:#070c18;--card:#0b1220;--card2:#0f182a;--gold:#2563EB;--gold-dim:#2563EB10;--gold-bright:#3B82F6;--t1:#f5f7fb;--t2:#a3b1c9;--t3:#7889a3;--bdr:#101c2e;--bdr2:#182842;--grn:#22c55e;--r:12px}
body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");pointer-events:none;z-index:9999}
.c{max-width:1320px;margin:0 auto;padding:0 32px}
section{position:relative;z-index:1}

/* Nav */
nav{position:fixed;top:0;left:0;right:0;z-index:1000;background:rgba(8,12,24,.92);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid var(--bdr)}
nav .c{display:flex;align-items:center;height:72px}
.logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;white-space:nowrap;flex-shrink:0}
.logo-mark{width:32px;height:32px;flex-shrink:0;color:#fff}
.logo-mark svg{width:100%;height:100%;display:block}
.logo-text{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.5rem;font-weight:500;color:#fff;letter-spacing:-.2px}
.logo-text span{color:#fff}
.nl{display:flex;align-items:center;gap:32px;list-style:none;margin-left:48px}.nl a{color:rgba(255,255,255,.7);text-decoration:none;font-size:.95rem;font-weight:400;transition:color .2s}.nl a:hover,.nl a.active{color:#fff}
.nc{display:flex;align-items:center;gap:16px;margin-left:auto}.gh{color:rgba(255,255,255,.7);text-decoration:none;font-size:.95rem;font-weight:400}.gh:hover{color:#fff}
.bp{display:inline-flex;align-items:center;padding:10px 22px;background:#fff;color:var(--bg);text-decoration:none;font-size:.84rem;font-weight:500;border-radius:100px;border:none;cursor:pointer;transition:all .2s}.bp:hover{background:rgba(255,255,255,.85)}.bp.lg{padding:16px 32px;font-size:.92rem}
.bp.ghost{background:0 0;color:var(--t2);border:1px solid var(--bdr2)}.bp.ghost:hover{border-color:var(--t3);color:var(--t1)}
.bp.blue{background:var(--gold);color:#fff}.bp.blue:hover{background:var(--gold-bright)}
.ham{display:none;flex-direction:column;gap:5px;cursor:pointer;background:0 0;border:none;padding:4px}.ham span{width:20px;height:1.5px;background:var(--t1);border-radius:2px}
.mn{display:none;position:fixed;top:72px;left:0;right:0;background:var(--bg);border-bottom:1px solid var(--bdr);padding:16px 24px;z-index:999}.mn.open{display:block}.mn a{display:block;padding:12px 0;color:var(--t2);text-decoration:none;font-size:.95rem;border-bottom:1px solid var(--bdr)}.mn a:last-child{border:none}

/* Scroll reveal */
.rv{opacity:0;transform:translateY(20px);transition:opacity .6s,transform .6s}.rv.v{opacity:1;transform:none}

/* Blog Hero */
.blog-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
.blog-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
.blog-hero .c{position:relative;z-index:1}
.blog-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:500;letter-spacing:-1.5px;line-height:1.12;margin-bottom:20px}
.blog-hero h1 em{font-style:normal;color:#fff;font-weight:500}
.blog-hero p{font-size:1.05rem;color:var(--t2);max-width:520px;margin:0 auto 44px;line-height:1.75;font-weight:300}

/* Category Filter */
.cat-filter{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.cat-btn{padding:6px 18px;background:var(--card);border:1px solid var(--bdr);border-radius:100px;font-size:.78rem;color:var(--t2);font-weight:400;cursor:pointer;transition:all .2s;text-decoration:none}
.cat-btn:hover{border-color:var(--bdr2);color:var(--t1)}
.cat-btn.active{background:var(--gold);color:#fff;border-color:var(--gold)}

/* Featured Post */
.feat-post{background:var(--card);border:1px solid var(--bdr);border-radius:16px;overflow:hidden;margin-bottom:56px;display:grid;grid-template-columns:1fr 1fr;gap:0;transition:transform .3s,border-color .3s}
.feat-post:hover{transform:translateY(-4px);border-color:var(--bdr2)}
.feat-img{background:linear-gradient(135deg,var(--card2),#111d38);min-height:340px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.feat-img-label{position:absolute;top:20px;left:20px;background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;padding:4px 16px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase}
.feat-img-icon{font-size:4rem;opacity:.1}
.feat-body{padding:48px 40px;display:flex;flex-direction:column;justify-content:center}
.feat-body .post-cat{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:10px}
.feat-body h3{font-size:clamp(1.6rem,2.5vw,2.2rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.feat-body p{color:var(--t2);font-size:.95rem;line-height:1.75;margin-bottom:20px;font-weight:300}
.post-meta{display:flex;align-items:center;gap:12px;font-size:.75rem;color:var(--t3);font-weight:300}
.post-meta-dot{width:3px;height:3px;border-radius:50%;background:var(--t3)}
.read-link{display:inline-flex;align-items:center;gap:6px;color:var(--gold);text-decoration:none;font-weight:500;font-size:.88rem;transition:gap .2s}.read-link:hover{gap:10px}

/* Post Grid */
.post-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:56px}
.post-card{background:var(--card);border:1px solid var(--bdr);border-radius:16px;overflow:hidden;transition:transform .3s,border-color .3s;display:flex;flex-direction:column}
.post-card:hover{transform:translateY(-4px);border-color:var(--bdr2)}
.post-card-img{height:200px;background:linear-gradient(135deg,var(--card2),#111d38);display:flex;align-items:center;justify-content:center;position:relative}
.post-card-img .post-cat-badge{position:absolute;top:14px;left:14px;background:var(--gold);color:#fff;font-size:.68rem;font-weight:600;padding:4px 16px;border-radius:100px;letter-spacing:.5px;text-transform:uppercase}
.post-card-img-icon{font-size:2.5rem;opacity:.08}
.post-card-body{padding:28px 24px;flex:1;display:flex;flex-direction:column}
.post-card-body .post-cat{font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:3px;color:var(--gold);margin-bottom:8px}
.post-card-body h4{font-size:1rem;font-weight:500;margin-bottom:8px;line-height:1.3}
.post-card-body p{font-size:.84rem;color:var(--t2);line-height:1.7;margin-bottom:auto;padding-bottom:16px;font-weight:300}
.post-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid var(--bdr)}
.post-card-footer .post-meta{font-size:.72rem}
.post-card-footer .read-link{font-size:.84rem}

/* Section header */
.sec-header{text-align:center;margin-bottom:56px}
.sec-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.sec-header p{font-size:.95rem;color:var(--t2);font-weight:300;max-width:520px;margin:0 auto;line-height:1.75}

/* Newsletter CTA */
.cta-section{padding:0 0 100px}
.cta-box{background:var(--card);border:1px solid var(--gold);border-radius:20px;padding:64px 48px;text-align:center;position:relative;overflow:hidden}
.cta-box::before{content:'';position:absolute;top:-50%;left:50%;transform:translateX(-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(37,99,235,.1),transparent 65%);pointer-events:none}
.cta-box h2{font-size:clamp(1.8rem,3.5vw,2.4rem);font-weight:500;letter-spacing:-1px;margin-bottom:14px;position:relative;z-index:1}
.cta-box p{font-size:.95rem;color:var(--t2);max-width:460px;margin:0 auto 32px;font-weight:300;line-height:1.75;position:relative;z-index:1}
.nl-form{display:flex;gap:10px;max-width:440px;margin:0 auto;position:relative;z-index:1}
.nl-form input{flex:1;padding:12px 18px;background:var(--bg2);border:1px solid var(--bdr);border-radius:100px;color:var(--t1);font-size:.88rem;font-family:inherit;outline:none;transition:border-color .2s}
.nl-form input:focus{border-color:var(--gold)}
.nl-form input::placeholder{color:var(--t3)}
.nl-form .bp{white-space:nowrap}

/* Pagination */
.pagination{display:flex;align-items:center;justify-content:center;gap:8px;padding-bottom:0}
.pg-btn{width:40px;height:40px;display:flex;align-items:center;justify-content:center;background:var(--card);border:1px solid var(--bdr);border-radius:100px;color:var(--t3);font-size:.82rem;font-weight:500;text-decoration:none;transition:all .2s;cursor:pointer}
.pg-btn:hover,.pg-btn.active{background:var(--gold);color:#fff;border-color:var(--gold)}
.pg-ellipsis{color:var(--t3);font-size:.82rem;padding:0 4px}

/* Footer */
footer{border-top:1px solid var(--bdr);padding:64px 0 32px}
.fg-f{display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr 1fr;gap:40px;margin-bottom:0}
.fbr .logo{margin-bottom:16px;display:inline-flex;white-space:nowrap;flex-shrink:0}.fbr p{font-size:.82rem;color:var(--t2);line-height:1.7;max-width:280px;font-weight:300}
.fcol h5{font-size:.7rem;font-weight:500;text-transform:uppercase;letter-spacing:1.5px;color:var(--t1);margin-bottom:14px}.fcol ul{list-style:none}.fcol li{margin-bottom:9px}.fcol a{color:var(--t2);text-decoration:none;font-size:.82rem;transition:color .2s}.fcol a:hover{color:#fff}
.social-icon{width:32px;height:32px;border-radius:8px;background:var(--card);border:1px solid var(--bdr);display:flex;align-items:center;justify-content:center;color:var(--t3);text-decoration:none;font-size:.75rem;transition:all .2s}
.social-icon:hover{border-color:var(--bdr2);color:var(--t1)}

/* Responsive */
@media(max-width:1024px){.post-grid{grid-template-columns:repeat(3,1fr);gap:14px}.feat-post{grid-template-columns:1fr}.fg-f{grid-template-columns:1fr 1fr}}
@media(max-width:768px){.nl,.gh{display:none}.ham{display:flex}.post-grid{grid-template-columns:1fr}.feat-post{grid-template-columns:1fr}.feat-img{min-height:200px}.feat-body{padding:28px 24px}.fg-f{grid-template-columns:1fr}.cta-box{padding:40px 24px}.nl-form{flex-direction:column}.blog-hero{padding:120px 0 48px}}
      `}</style>

      {/* NAV */}
      <nav>
        <div className="c">
          <a href="/" className="logo">
            <div className="logo-mark">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3h22v5H11v5h13v5H11v5h16v5H5z" fill="currentColor" />
              </svg>
            </div>
            <div className="logo-text">Env<span>o</span>sta</div>
          </a>
          <ul className="nl">
            <li><a href="https://envosta.com/features/">Features</a></li>
            <li><a href="https://envosta.com/pricing">Plans &amp; Pricing</a></li>
            <li><a href="https://envosta.com/resources" className="active">Resources</a></li>
            <li><a href="https://envosta.com/support">Support</a></li>
          </ul>
          <div className="nc">
            <a href="https://app.envosta.com/" className="gh">Log in</a>
            <div className="block-button">
              <a href="https://envosta.com/pricing" className="bp">Get Started</a>
            </div>
          </div>
          <button
            className="ham"
            onClick={() => document.querySelector('.mn')?.classList.toggle('open')}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>
      <div className="mn">
        <a href="https://envosta.com/features/">Features</a>
        <a href="https://envosta.com/pricing">Plans &amp; Pricing</a>
        <a href="https://envosta.com/resources">Resources</a>
        <a href="https://envosta.com/support">Support</a>
      </div>

      {/* BLOG HERO */}
      <section className="blog-hero">
        <div className="c">
          <h1 className="rv">Insights for growing <em>online</em></h1>
          <p className="rv">Hosting tips, WordPress guides, and expert insights for business owners — written by the Envosta team.</p>
          <div className="cat-filter rv">
            <a href="#" className="cat-btn active">All Posts</a>
            <a href="#" className="cat-btn">WordPress</a>
            <a href="#" className="cat-btn">Performance</a>
            <a href="#" className="cat-btn">Security</a>
            <a href="#" className="cat-btn">WooCommerce</a>
            <a href="#" className="cat-btn">Design</a>
            <a href="#" className="cat-btn">Business</a>
          </div>
        </div>
      </section>

      {/* FEATURED POST */}
      <section style={{ padding: '0 0 16px' }}>
        <div className="c">
          <div className="feat-post rv">
            <div className="feat-img">
              <div className="feat-img-label">Featured</div>
              <div className="feat-img-icon">&#9889;</div>
            </div>
            <div className="feat-body">
              <div className="post-cat">Performance</div>
              <h3>How We Reduced Average Load Times to Under 0.8 Seconds</h3>
              <p>A deep dive into the infrastructure changes, caching strategies, and CDN optimizations that make Envosta-hosted sites among the fastest on the web.</p>
              <div className="post-meta">
                <span>Dec 12, 2025</span>
                <div className="post-meta-dot"></div>
                <span>8 min read</span>
              </div>
              <div style={{ marginTop: '20px' }}>
                <a href="#" className="read-link">Read Article &rarr;</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POST GRID */}
      <section style={{ padding: '40px 0 100px' }}>
        <div className="c">
          <div className="sec-header rv">
            <h2>Latest articles</h2>
            <p>Stay ahead with expert insights on WordPress, hosting, security, and growing your business online.</p>
          </div>

          <div className="post-grid">

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">WordPress</div>
                <div className="post-card-img-icon">&#128268;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">WordPress</div>
                <h4>The 7 Plugins Every WordPress Site Actually Needs</h4>
                <p>Stop installing 30 plugins. Here are the only seven you need for security, speed, SEO, and backups — and how to configure each one.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Dec 8, 2025</span><div className="post-meta-dot"></div><span>6 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">Security</div>
                <div className="post-card-img-icon">&#128737;&#65039;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">Security</div>
                <h4>WordPress Security in 2026: What&#39;s Changed</h4>
                <p>New threats require new defenses. We break down the latest attack vectors and the simple steps that protect 99% of WordPress sites.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Dec 3, 2025</span><div className="post-meta-dot"></div><span>7 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">WooCommerce</div>
                <div className="post-card-img-icon">&#128722;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">WooCommerce</div>
                <h4>Speed Up Your WooCommerce Store Without Breaking It</h4>
                <p>Slow checkouts kill conversions. A step-by-step guide to optimizing your WooCommerce store for sub-second load times.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Nov 28, 2025</span><div className="post-meta-dot"></div><span>9 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">Design</div>
                <div className="post-card-img-icon">&#127912;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">Design</div>
                <h4>5 Website Design Mistakes Costing You Customers</h4>
                <p>From slow hero images to confusing navigation — the design issues we fix most often during onboarding calls, and how to avoid them.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Nov 22, 2025</span><div className="post-meta-dot"></div><span>5 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">Business</div>
                <div className="post-card-img-icon">&#128200;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">Business</div>
                <h4>Why Your Local Business Needs a Website in 2026</h4>
                <p>Social media algorithms change. Your website doesn&#39;t. Here&#39;s why owning your online presence matters more than ever.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Nov 18, 2025</span><div className="post-meta-dot"></div><span>4 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">Performance</div>
                <div className="post-card-img-icon">&#128640;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">Performance</div>
                <h4>Core Web Vitals: A Plain-English Guide</h4>
                <p>Google uses Core Web Vitals to rank your site. We explain LCP, FID, and CLS in terms anyone can understand — and how to fix them.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Nov 12, 2025</span><div className="post-meta-dot"></div><span>6 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">WordPress</div>
                <div className="post-card-img-icon">&#128260;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">WordPress</div>
                <h4>How to Migrate WordPress Without Downtime</h4>
                <p>A complete walkthrough of our zero-downtime migration process — from DNS changes to database transfers and everything in between.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Nov 6, 2025</span><div className="post-meta-dot"></div><span>10 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">Security</div>
                <div className="post-card-img-icon">&#128274;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">Security</div>
                <h4>SSL Certificates Explained: What They Are and Why You Need One</h4>
                <p>The padlock icon in your browser bar matters more than you think. Everything business owners need to know about SSL.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Oct 30, 2025</span><div className="post-meta-dot"></div><span>4 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

            <div className="post-card rv">
              <div className="post-card-img">
                <div className="post-cat-badge">Business</div>
                <div className="post-card-img-icon">&#128222;</div>
              </div>
              <div className="post-card-body">
                <div className="post-cat">Business</div>
                <h4>What Happens During an Envosta Onboarding Call</h4>
                <p>Curious what our free setup consultation looks like? A behind-the-scenes look at what we cover and how we configure your site.</p>
                <div className="post-card-footer">
                  <div className="post-meta"><span>Oct 24, 2025</span><div className="post-meta-dot"></div><span>5 min</span></div>
                  <a href="#" className="read-link">Read &rarr;</a>
                </div>
              </div>
            </div>

          </div>

          <div className="pagination rv">
            <a href="#" className="pg-btn active">1</a>
            <a href="#" className="pg-btn">2</a>
            <a href="#" className="pg-btn">3</a>
            <span className="pg-ellipsis">&hellip;</span>
            <a href="#" className="pg-btn">8</a>
            <a href="#" className="pg-btn">&rarr;</a>
          </div>

        </div>
      </section>

      {/* NEWSLETTER CTA */}
      <section className="cta-section">
        <div className="c">
          <div className="cta-box rv">
            <h2>Get marketing tips delivered to your inbox</h2>
            <p>Join 2,400+ business owners who get our weekly WordPress tips, security updates, and performance guides.</p>
            <div className="nl-form">
              <input type="email" placeholder="you@company.com" />
              <button className="bp blue">Subscribe</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="c">
          <div className="fg-f">
            <div className="fbr">
              <a href="/" className="logo" style={{ marginBottom: '16px' }}>
                <div className="logo-mark">
                  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3h22v5H11v5h13v5H11v5h16v5H5z" fill="currentColor" />
                  </svg>
                </div>
                <div className="logo-text">Env<span>o</span>sta</div>
              </a>
              <p style={{ maxWidth: '280px' }}>Managed WordPress hosting that starts with a consultation. Enterprise infrastructure, expert support, and hands-on onboarding — all in one place.</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <a href="#" className="social-icon" aria-label="Twitter">&#120143;</a>
                <a href="#" className="social-icon" aria-label="LinkedIn">in</a>
                <a href="#" className="social-icon" aria-label="Facebook">f</a>
                <a href="#" className="social-icon" aria-label="YouTube">&#9654;</a>
              </div>
            </div>
            <div className="fcol">
              <h5>Hosting</h5>
              <ul>
                <li><a href="https://envosta.com/pricing">Managed WordPress</a></li>
                <li><a href="https://envosta.com/pricing">WooCommerce Hosting</a></li>
                <li><a href="https://envosta.com/features/">Enterprise Hosting</a></li>
                <li><a href="https://envosta.com/pricing">Plans &amp; Pricing</a></li>
                <li><a href="#">Domain Names</a></li>
                <li><a href="#">Free Migration</a></li>
              </ul>
            </div>
            <div className="fcol">
              <h5>Features</h5>
              <ul>
                <li><a href="https://envosta.com/features/">Onboarding &amp; Setup</a></li>
                <li><a href="https://envosta.com/features/">SEO Tools</a></li>
                <li><a href="https://envosta.com/features/">Speed &amp; Performance</a></li>
                <li><a href="https://envosta.com/features/">Security &amp; SSL</a></li>
                <li><a href="https://envosta.com/features/">Daily Backups</a></li>
                <li><a href="https://envosta.com/features/">Global CDN</a></li>
              </ul>
            </div>
            <div className="fcol">
              <h5>Resources</h5>
              <ul>
                <li><a href="https://envosta.com/resources">Knowledge Base</a></li>
                <li><a href="https://envosta.com/resources">Blog</a></li>
                <li><a href="https://envosta.com/resources">Guides &amp; Tutorials</a></li>
                <li><a href="#">Developer Docs</a></li>
                <li><a href="#">System Status</a></li>
                <li><a href="#">Changelog</a></li>
              </ul>
            </div>
            <div className="fcol">
              <h5>Company</h5>
              <ul>
                <li><a href="#">About Envosta</a></li>
                <li><a href="https://envosta.com/support">Contact Us</a></li>
                <li><a href="https://envosta.com/support">Support Center</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Partners &amp; Affiliates</a></li>
                <li><a href="#">Brand Assets</a></li>
              </ul>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--bdr)', marginTop: '48px', paddingTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '16px' }}>
            <p style={{ fontSize: '.75rem', color: 'var(--t3)' }}>&copy; 2025 Envosta Inc. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>Privacy Policy</a>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>Terms of Service</a>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>Cookie Policy</a>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>GDPR</a>
              <a href="#" style={{ fontSize: '.75rem', color: 'var(--t3)', textDecoration: 'none', transition: 'color .2s' }}>Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
