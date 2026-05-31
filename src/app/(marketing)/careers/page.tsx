'use client';

import { useEffect, useRef } from 'react';

export default function CareersPage() {
  const formWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* ── Scroll reveal ── */
    document.querySelectorAll('.rv').forEach((el) => {
      new IntersectionObserver(
        (e) => {
          if (e[0].isIntersecting) e[0].target.classList.add('v');
        },
        { threshold: 0.05 }
      ).observe(el);
    });

    /* ── Department filter pills ── */
    document.querySelectorAll<HTMLAnchorElement>('.dp').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.dp').forEach((b) => b.classList.remove('on'));
        this.classList.add('on');
        const d = this.getAttribute('data-dept');
        let v = 0;
        document.querySelectorAll<HTMLElement>('.role-row').forEach(function (c) {
          if (d === 'all' || c.getAttribute('data-dept') === d) {
            c.style.display = '';
            v++;
          } else {
            c.style.display = 'none';
          }
        });
        const empty = document.querySelector<HTMLElement>('.roles-empty');
        if (empty) empty.style.display = v === 0 ? 'block' : 'none';
      });
    });

    /* ── Role row click → select role + scroll to form ── */
    document.querySelectorAll<HTMLAnchorElement>('.role-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelectorAll('.role-row').forEach((r) => r.classList.remove('picked'));
        this.classList.add('picked');
        const t = this.querySelector('.rr-name')?.textContent?.trim();
        const s = document.getElementById('f-role') as HTMLSelectElement | null;
        if (s && t) {
          for (let i = 0; i < s.options.length; i++) {
            if (s.options[i].textContent?.trim() === t) {
              s.selectedIndex = i;
              break;
            }
          }
        }
        document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    /* ── File upload handling ── */
    const fi = document.getElementById('f-resume') as HTMLInputElement | null;
    const uz = document.getElementById('uz') as HTMLElement | null;
    const fa = document.getElementById('fa') as HTMLElement | null;
    const ft = document.getElementById('fa-name') as HTMLElement | null;
    const fr = document.getElementById('fa-rm') as HTMLElement | null;

    function showFile(f: File) {
      if (ft) ft.textContent = f.name + ' (' + (f.size / 1048576).toFixed(1) + ' MB)';
      if (fa) fa.style.display = 'flex';
      if (uz) uz.style.display = 'none';
    }

    if (fi) {
      fi.addEventListener('change', function () {
        if (this.files && this.files[0]) showFile(this.files[0]);
      });
    }

    if (uz) {
      ['dragenter', 'dragover'].forEach((evt) => {
        uz.addEventListener(evt, (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          uz.classList.add('over');
        });
      });
      ['dragleave', 'drop'].forEach((evt) => {
        uz.addEventListener(evt, (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          uz.classList.remove('over');
        });
      });
      uz.addEventListener('drop', (e: Event) => {
        const de = e as DragEvent;
        if (de.dataTransfer?.files && de.dataTransfer.files[0]) {
          if (fi) (fi as any).files = de.dataTransfer.files;
          showFile(de.dataTransfer.files[0]);
        }
      });
    }

    if (fr) {
      fr.addEventListener('click', (e) => {
        e.preventDefault();
        if (fi) fi.value = '';
        if (fa) fa.style.display = 'none';
        if (uz) uz.style.display = '';
      });
    }

    /* ── Form submission ── */
    const btn = document.getElementById('submit-btn') as HTMLButtonElement | null;
    if (btn) {
      const rq = ['f-first', 'f-last', 'f-email', 'f-location', 'f-role', 'f-why'];
      const ec = '#ef4444';
      btn.addEventListener('click', function () {
        let ok = true;
        document
          .querySelectorAll<HTMLElement>('#application-form input,#application-form select,#application-form textarea')
          .forEach((el) => {
            el.style.borderColor = '';
          });
        rq.forEach((id) => {
          const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
          if (!el) return;
          if (!el.value.trim()) {
            el.style.borderColor = ec;
            ok = false;
          }
        });
        const em = document.getElementById('f-email') as HTMLInputElement | null;
        if (em && em.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) {
          em.style.borderColor = ec;
          ok = false;
        }
        const feEl = document.getElementById('f-resume') as HTMLInputElement | null;
        const uEl = document.getElementById('uz') as HTMLElement | null;
        if (feEl && (!feEl.files || !feEl.files[0])) {
          if (uEl) uEl.style.borderColor = ec;
          ok = false;
        } else {
          if (uEl) uEl.style.borderColor = '';
        }
        if (!ok) {
          const f = document.querySelector<HTMLElement>('[style*="' + ec + '"]');
          if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        btn.textContent = 'Submitting\u2026';
        btn.style.opacity = '.6';
        btn.style.pointerEvents = 'none';
        setTimeout(() => {
          const appForm = document.getElementById('application-form') as HTMLElement | null;
          const formOk = document.getElementById('form-ok') as HTMLElement | null;
          const wrap = document.getElementById('form-wrap') as HTMLElement | null;
          if (appForm) appForm.style.display = 'none';
          if (formOk) formOk.style.display = 'block';
          if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 1200);
      });
    }
  }, []);

  return (
    <>
      <style>{`
/* ═══ HERO ═══ */
.careers-hero{padding:160px 0 80px;text-align:center;position:relative;overflow:hidden}
.careers-hero::before{content:'';position:absolute;top:-40%;left:50%;transform:translateX(-50%);width:800px;height:800px;background:radial-gradient(circle,rgba(37,99,235,.12),transparent 65%);pointer-events:none}
.careers-hero .c{position:relative;z-index:1}
.careers-hero h1{font-size:clamp(2.4rem,5vw,3.8rem);font-weight:600;letter-spacing:-2px;line-height:1.12;margin-bottom:20px}
.careers-hero p{font-size:1.05rem;color:var(--t2);max-width:560px;margin:0 auto;line-height:1.8;font-weight:300}

/* ═══ PROCESS ═══ */
.process{padding:0 0 80px}
.process-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.proc-card{background:var(--card);border:1px solid var(--bdr);border-radius:var(--r);padding:28px;transition:border-color .3s,transform .3s}
.proc-card:hover{border-color:var(--bdr2);transform:translateY(-2px)}
.proc-card .ic{width:40px;height:40px;border-radius:10px;background:var(--gold-dim);display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:.82rem;font-weight:700;color:var(--gold-bright)}
.proc-card h4{font-size:.92rem;font-weight:500;margin-bottom:6px}
.proc-card p{font-size:.8rem;color:var(--t2);font-weight:300;line-height:1.7}

/* ═══ OPEN ROLES ═══ */
.roles{padding:0 0 80px}
.roles-bar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:24px}
.dept-pills{display:flex;gap:8px;flex-wrap:wrap;margin-left:auto}
.dp{padding:6px 18px;background:var(--card);border:1px solid var(--bdr);border-radius:100px;font-size:.78rem;color:var(--t2);font-weight:400;cursor:pointer;transition:all .2s;text-decoration:none}
.dp:hover{border-color:var(--bdr2);color:var(--t1)}
.dp.on{background:var(--gold);color:#fff;border-color:var(--gold)}
.roles-list{display:flex;flex-direction:column;gap:8px}
.role-row{display:grid;grid-template-columns:1fr auto auto auto;gap:20px;align-items:center;padding:20px 28px;border-radius:14px;border:1px solid var(--bdr);background:var(--card);transition:all .25s;text-decoration:none;color:inherit;cursor:pointer}
.role-row:hover{border-color:var(--bdr2);transform:translateY(-2px)}
.role-row.picked{border-color:var(--gold)}
.rr-name{font-size:.92rem;font-weight:500;color:var(--t1)}
.rr-dept{font-size:.7rem;padding:4px 12px;border-radius:100px;background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.2);color:var(--gold-bright);font-weight:400}
.rr-loc{font-size:.76rem;color:var(--t3);font-weight:300}
.rr-arrow{color:var(--t3);font-size:.88rem;transition:transform .2s,color .2s}
.role-row:hover .rr-arrow,.role-row.picked .rr-arrow{color:var(--gold);transform:translateX(3px)}
.roles-empty{text-align:center;padding:40px;color:var(--t3);font-size:.84rem;font-weight:300;display:none}
.roles-empty a{color:var(--gold);text-decoration:none}

/* ═══ WHY ENVOSTA ═══ */
.why{padding:0 0 80px}
.why-card{background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:48px;overflow:hidden}
.why-inner{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.why-text h3{font-size:1.6rem;font-weight:500;letter-spacing:-.5px;margin-bottom:16px}
.why-text>p{font-size:.88rem;color:var(--t2);line-height:1.7;font-weight:300;margin-bottom:24px}
.why-list{display:flex;flex-direction:column;gap:12px}
.why-item{display:flex;align-items:flex-start;gap:12px;font-size:.84rem;color:var(--t2);font-weight:300;line-height:1.6}
.why-item strong{color:var(--t1);font-weight:500}
.why-stats{display:flex;flex-direction:column;gap:12px}
.ws{background:var(--card2);border:1px solid var(--bdr);border-radius:var(--r);padding:20px 24px;display:flex;align-items:center;gap:16px;transition:border-color .3s}
.ws:hover{border-color:var(--gold)}
.ws .ws-ic{width:40px;height:40px;border-radius:10px;background:var(--gold-dim);display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
.ws .ws-txt{display:flex;flex-direction:column}
.ws .ws-lbl{font-size:.72rem;color:var(--t3);font-weight:300}
.ws .ws-val{font-size:.92rem;font-weight:500;color:var(--t1)}

/* ═══ APPLICATION FORM ═══ */
.apply{padding:0 0 100px}
.apply-header{text-align:center;margin-bottom:56px}
.apply-header h2{font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:500;letter-spacing:-1px;line-height:1.15;margin-bottom:14px}
.apply-header p{font-size:.92rem;color:var(--t3);font-weight:300;max-width:480px;margin:0 auto}
.form-wrap{max-width:640px;margin:0 auto;background:var(--card);border:1px solid var(--bdr);border-radius:20px;padding:48px 40px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.careers-fg{display:flex;flex-direction:column;gap:6px}
.careers-fg.w{grid-column:1/-1}
.careers-fg label{font-size:.76rem;font-weight:500;color:var(--t2)}
.careers-fg label .req{color:var(--gold-bright);margin-left:2px}
.careers-fg input,.careers-fg select,.careers-fg textarea{background:var(--bg);border:1px solid var(--bdr2);border-radius:10px;padding:12px 16px;color:var(--t1);font-size:.88rem;font-family:inherit;outline:none;transition:border-color .3s}
.careers-fg input:focus,.careers-fg select:focus,.careers-fg textarea:focus{border-color:var(--gold)}
.careers-fg input::placeholder,.careers-fg textarea::placeholder{color:var(--t3)}
.careers-fg select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236a7a94' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;cursor:pointer}
.careers-fg select option{background:var(--bg);color:var(--t1)}
.careers-fg textarea{resize:vertical;min-height:120px}
.uz{position:relative;border:1px dashed var(--bdr2);border-radius:10px;padding:24px 16px;text-align:center;transition:all .3s;background:var(--bg);cursor:pointer}
.uz:hover,.uz.over{border-color:var(--gold);background:rgba(37,99,235,.04)}
.uz input{position:absolute;inset:0;opacity:0;cursor:pointer;z-index:2}
.uz-ic{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:var(--gold-dim);margin:0 auto 12px;color:var(--gold)}
.uz-ic svg{width:20px;height:20px}
.uz-txt{font-size:.82rem;color:var(--t2);font-weight:300}
.uz-txt strong{color:var(--gold-bright);font-weight:500}
.uz-hint{font-size:.7rem;color:var(--t3);margin-top:4px;font-weight:300}
.careers-fa{display:flex;align-items:center;gap:8px;margin-top:8px;padding:8px 12px;background:var(--card2);border:1px solid var(--bdr);border-radius:8px;font-size:.78rem;color:var(--t2)}
.careers-fa .fa-x{margin-left:auto;color:var(--t3);cursor:pointer;background:none;border:none;font-size:.88rem;padding:0 4px;font-family:inherit;transition:color .2s}.careers-fa .fa-x:hover{color:#ef4444}
.form-submit{text-align:center;margin-top:24px}
.form-submit .bp{padding:14px 48px;font-size:.92rem}
.form-note{text-align:center;margin-top:12px;font-size:.72rem;color:var(--t3);font-weight:300}
.form-note a{color:var(--gold);text-decoration:none}
.form-ok{display:none;text-align:center;padding:48px 24px}
.form-ok .fok-ic{width:56px;height:56px;border-radius:50%;background:rgba(34,197,94,.12);display:flex;align-items:center;justify-content:center;margin:0 auto 20px}
.form-ok .fok-ic svg{width:28px;height:28px;color:var(--grn)}
.form-ok h3{font-size:1.2rem;font-weight:500;margin-bottom:8px}
.form-ok p{font-size:.88rem;color:var(--t2);font-weight:300;max-width:380px;margin:0 auto;line-height:1.7}

/* ═══ Checkmark icon ═══ */
.ck{width:16px;height:16px;flex-shrink:0;color:var(--grn)}

/* ═══ Blue button variant ═══ */
.bp.blue{background:var(--gold);color:#fff}.bp.blue:hover{background:var(--gold-bright)}

/* ── Responsive ── */
@media(max-width:1024px){.process-grid{grid-template-columns:1fr 1fr}.why-inner{grid-template-columns:1fr}.form-wrap{padding:36px 28px}}
@media(max-width:768px){.process-grid{grid-template-columns:1fr 1fr}.careers-hero{padding:140px 0 60px}.form-wrap{padding:28px 20px}.form-row{grid-template-columns:1fr}.role-row{grid-template-columns:1fr;gap:8px}.rr-dept,.rr-loc,.rr-arrow{justify-self:start}.roles-bar{flex-direction:column;align-items:flex-start}.dept-pills{margin-left:0}.why-card{padding:32px 24px}}
@media(max-width:480px){.process-grid{grid-template-columns:1fr}}
      `}</style>

      {/* ═══ HERO ═══ */}
      <section className="careers-hero">
        <div className="c">
          <h1 className="rv">Join Envosta, we&rsquo;re hiring</h1>
          <p className="rv">We&rsquo;re growing our team across engineering, design, support, and marketing. Explore open roles below and find where you fit.</p>
        </div>
      </section>

      {/* ═══ PROCESS ═══ */}
      <section className="process">
        <div className="c">
          <div className="process-grid">
            <div className="proc-card rv">
              <div className="ic">01</div>
              <h4>Application</h4>
              <p>Send your resume and a short note about why Envosta interests you.</p>
            </div>
            <div className="proc-card rv">
              <div className="ic">02</div>
              <h4>Intro Call</h4>
              <p>A casual 30-minute video chat to learn more about each other.</p>
            </div>
            <div className="proc-card rv">
              <div className="ic">03</div>
              <h4>Work Sample</h4>
              <p>A short, paid take-home exercise. Most take 2–3 hours.</p>
            </div>
            <div className="proc-card rv">
              <div className="ic">04</div>
              <h4>Team Chat &amp; Offer</h4>
              <p>Meet the team. If it&rsquo;s a fit, we move quickly to an offer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ OPEN ROLES ═══ */}
      <section className="roles" id="positions">
        <div className="c">
          <div className="sh rv">
            <span className="sh-tag">Open Positions</span>
            <h2>Find your role</h2>
          </div>
          <div className="roles-bar rv">
            <div className="dept-pills">
              <a href="#" className="dp on" data-dept="all">All</a>
              <a href="#" className="dp" data-dept="engineering">Engineering</a>
              <a href="#" className="dp" data-dept="design">Design</a>
              <a href="#" className="dp" data-dept="support">Support</a>
              <a href="#" className="dp" data-dept="marketing">Marketing</a>
            </div>
          </div>
          <div className="roles-list">
            <a className="role-row rv" data-dept="engineering">
              <span className="rr-name">Senior Backend Engineer</span>
              <span className="rr-dept">Engineering</span>
              <span className="rr-loc">Remote</span>
              <span className="rr-arrow">&rarr;</span>
            </a>
            <a className="role-row rv" data-dept="engineering">
              <span className="rr-name">Full-Stack Developer</span>
              <span className="rr-dept">Engineering</span>
              <span className="rr-loc">Remote</span>
              <span className="rr-arrow">&rarr;</span>
            </a>
            <a className="role-row rv" data-dept="design">
              <span className="rr-name">Product Designer</span>
              <span className="rr-dept">Design</span>
              <span className="rr-loc">Remote</span>
              <span className="rr-arrow">&rarr;</span>
            </a>
            <a className="role-row rv" data-dept="support">
              <span className="rr-name">WordPress Support Specialist</span>
              <span className="rr-dept">Support</span>
              <span className="rr-loc">Remote</span>
              <span className="rr-arrow">&rarr;</span>
            </a>
            <a className="role-row rv" data-dept="marketing">
              <span className="rr-name">Content &amp; SEO Lead</span>
              <span className="rr-dept">Marketing</span>
              <span className="rr-loc">Remote</span>
              <span className="rr-arrow">&rarr;</span>
            </a>
            <a className="role-row rv" data-dept="engineering">
              <span className="rr-name">DevOps / Site Reliability Engineer</span>
              <span className="rr-dept">Engineering</span>
              <span className="rr-loc">Remote</span>
              <span className="rr-arrow">&rarr;</span>
            </a>
          </div>
          <div className="roles-empty rv">No roles in this department right now. <a href="#apply">Apply anyway</a>.</div>
        </div>
      </section>

      {/* ═══ WHY ENVOSTA ═══ */}
      <section className="why">
        <div className="c">
          <div className="sh rv">
            <span className="sh-tag">Benefits</span>
            <h2>Why work at Envosta</h2>
          </div>
          <div className="why-card rv">
            <div className="why-inner">
              <div className="why-text">
                <h3>Built for people who do their best work with freedom</h3>
                <p>We keep the team small so everyone has impact. In return, we offer the flexibility, tools, and support to do exceptional work.</p>
                <div className="why-list">
                  <div className="why-item">
                    <svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span><strong>Competitive salary</strong> — benchmarked against top-tier remote companies</span>
                  </div>
                  <div className="why-item">
                    <svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span><strong>Flexible hours</strong> — async-first with core overlap windows</span>
                  </div>
                  <div className="why-item">
                    <svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span><strong>Home office budget</strong> — $2,000 setup allowance for gear and workspace</span>
                  </div>
                  <div className="why-item">
                    <svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span><strong>Generous PTO</strong> — 25 days paid time off plus local holidays</span>
                  </div>
                  <div className="why-item">
                    <svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span><strong>Learning stipend</strong> — annual budget for courses, books, and conferences</span>
                  </div>
                  <div className="why-item">
                    <svg className="ck" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span><strong>Health &amp; wellness</strong> — comprehensive benefits for you and your family</span>
                  </div>
                </div>
              </div>
              <div className="why-stats">
                <div className="ws">
                  <div className="ws-ic">🌐</div>
                  <div className="ws-txt"><span className="ws-lbl">Team Distribution</span><span className="ws-val">Fully Remote, Global</span></div>
                </div>
                <div className="ws">
                  <div className="ws-ic">👥</div>
                  <div className="ws-txt"><span className="ws-lbl">Team Size</span><span className="ws-val">Small &amp; Focused</span></div>
                </div>
                <div className="ws">
                  <div className="ws-ic">🚀</div>
                  <div className="ws-txt"><span className="ws-lbl">Ship Frequency</span><span className="ws-val">Weekly Deploys</span></div>
                </div>
                <div className="ws">
                  <div className="ws-ic">💬</div>
                  <div className="ws-txt"><span className="ws-lbl">Communication</span><span className="ws-val">Async-First</span></div>
                </div>
                <div className="ws">
                  <div className="ws-ic">🎓</div>
                  <div className="ws-txt"><span className="ws-lbl">Learning Budget</span><span className="ws-val">$1,500 / year</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ APPLICATION FORM ═══ */}
      <section className="apply rv" id="apply">
        <div className="c">
          <div className="apply-header">
            <h2>Submit your application</h2>
            <p>We respond to every application within 5 business days. No cover letter needed, just be yourself.</p>
          </div>
          <div className="form-wrap" id="form-wrap" ref={formWrapRef}>
            <div id="application-form">
              <div className="form-row">
                <div className="careers-fg">
                  <label>First Name <span className="req">*</span></label>
                  <input type="text" placeholder="Jane" required id="f-first" />
                </div>
                <div className="careers-fg">
                  <label>Last Name <span className="req">*</span></label>
                  <input type="text" placeholder="Doe" required id="f-last" />
                </div>
              </div>
              <div className="form-row">
                <div className="careers-fg">
                  <label>Email <span className="req">*</span></label>
                  <input type="email" placeholder="jane@company.com" required id="f-email" />
                </div>
                <div className="careers-fg">
                  <label>Phone</label>
                  <input type="tel" placeholder="+1 (555) 000-0000" id="f-phone" />
                </div>
              </div>
              <div className="form-row">
                <div className="careers-fg">
                  <label>Location <span className="req">*</span></label>
                  <input type="text" placeholder="City, Country" required id="f-location" />
                </div>
                <div className="careers-fg">
                  <label>Role <span className="req">*</span></label>
                  <select required id="f-role" defaultValue="">
                    <option value="" disabled>Select a role&hellip;</option>
                    <option>Senior Backend Engineer</option>
                    <option>Full-Stack Developer</option>
                    <option>Product Designer</option>
                    <option>WordPress Support Specialist</option>
                    <option>Content &amp; SEO Lead</option>
                    <option>DevOps / Site Reliability Engineer</option>
                    <option>General Application</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="careers-fg w">
                  <label>Resume / CV <span className="req">*</span></label>
                  <div className="uz" id="uz">
                    <input type="file" accept=".pdf,.doc,.docx" id="f-resume" />
                    <div className="uz-ic">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="uz-txt"><strong>Click to upload</strong> or drag and drop</div>
                    <div className="uz-hint">PDF, DOC, or DOCX — max 10 MB</div>
                  </div>
                  <div className="careers-fa" id="fa" style={{ display: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ flexShrink: 0, color: 'var(--gold)' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span id="fa-name"></span>
                    <button className="fa-x" id="fa-rm">&#10005;</button>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="careers-fg w">
                  <label>Portfolio / LinkedIn</label>
                  <input type="url" placeholder="https://linkedin.com/in/yourname" id="f-portfolio" />
                </div>
              </div>
              <div className="form-row">
                <div className="careers-fg w">
                  <label>Why Envosta? <span className="req">*</span></label>
                  <textarea placeholder="Tell us why you're interested and what you'd bring to the team." required id="f-why"></textarea>
                </div>
              </div>
              <div className="form-submit">
                <button className="bp blue lg" id="submit-btn" type="button">Submit Application</button>
              </div>
              <div className="form-note">By submitting you agree to our <a href="/legal/privacy">Privacy Policy</a>.</div>
            </div>
            <div className="form-ok" id="form-ok">
              <div className="fok-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3>Application submitted</h3>
              <p>Thanks for your interest in Envosta. We&rsquo;ll get back to you within 5 business days.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
