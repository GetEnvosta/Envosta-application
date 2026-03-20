'use client';

import { useEffect, useRef } from 'react';

export default function FaqAccordion() {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const questions = list.querySelectorAll<HTMLElement>('.faq-q');

    const handlers: Array<{ el: HTMLElement; handler: () => void }> = [];

    questions.forEach((q) => {
      const handler = () => {
        q.parentElement?.classList.toggle('open');
      };
      q.addEventListener('click', handler);
      handlers.push({ el: q, handler });
    });

    return () => {
      handlers.forEach(({ el, handler }) => {
        el.removeEventListener('click', handler);
      });
    };
  }, []);

  return (
    <div className="faq-list rv" ref={listRef}>
      <div className="faq-item">
        <div className="faq-q">
          <h4>What happens after I sign up?</h4>
          <div className="faq-q-icon">+</div>
        </div>
        <div className="faq-a">
          <p>
            A conversation. We learn about your business, then build everything — design, structure,
            security, performance. When it&apos;s ready, you step in and make it yours. Most sites go
            live within a week.
          </p>
        </div>
      </div>

      <div className="faq-item">
        <div className="faq-q">
          <h4>How involved do I need to be during setup?</h4>
          <div className="faq-q-icon">+</div>
        </div>
        <div className="faq-a">
          <p>
            One call. You tell us about your business. We handle the rest — theme, SEO, security,
            forms, and everything in between. You come back when it&apos;s time to add your content
            and go live.
          </p>
        </div>
      </div>

      <div className="faq-item">
        <div className="faq-q">
          <h4>What do I need to provide?</h4>
          <div className="faq-q-icon">+</div>
        </div>
        <div className="faq-a">
          <p>
            The more we understand about your business, the better your starting point. Share your
            logo, brand colors, photos, and any details about your services — we use all of it to
            shape the structure, layout, and flow of your site. Think of what we deliver as a
            tailored wireframe built around your business. From there, you add your own copy and
            content to bring it to life.
          </p>
        </div>
      </div>

      <div className="faq-item">
        <div className="faq-q">
          <h4>What infrastructure does my site run on?</h4>
          <div className="faq-q-icon">+</div>
        </div>
        <div className="faq-a">
          <p>
            wp.cloud — the same enterprise platform behind WordPress.com and WordPress VIP. 99.99%
            uptime, sub-200ms response times, global CDN, automated security, and daily backups. All
            included.
          </p>
        </div>
      </div>

      <div className="faq-item">
        <div className="faq-q">
          <h4>Can I update my own site after launch?</h4>
          <div className="faq-q-icon">+</div>
        </div>
        <div className="faq-a">
          <p>
            Yes. The visual editor makes it simple — add pages, swap images, edit text. No code. And
            if you ever need a hand, we&apos;re right here.
          </p>
        </div>
      </div>

      <div className="faq-item">
        <div className="faq-q">
          <h4>What if I need help after my site is live?</h4>
          <div className="faq-q-icon">+</div>
        </div>
        <div className="faq-a">
          <p>
            We don&apos;t disappear after launch. Every plan includes ongoing support, managed
            updates, and security monitoring. Something breaks, you need changes — just reach out.
          </p>
        </div>
      </div>

      <div className="faq-item">
        <div className="faq-q">
          <h4>What if I want to leave?</h4>
          <div className="faq-q-icon">+</div>
        </div>
        <div className="faq-a">
          <p>
            You own everything — your domain, your content, your theme, your data. There&apos;s no
            lock-in, no proprietary formats, no exit fees. Your site is yours. We just make it easy
            to never want to leave.
          </p>
        </div>
      </div>
    </div>
  );
}
