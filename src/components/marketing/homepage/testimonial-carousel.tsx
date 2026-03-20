'use client';

import { useEffect, useRef } from 'react';

export function TestimonialCarousel() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const slides = wrap.querySelectorAll<HTMLElement>('.sp-quote-slide');
    const bgs = wrap.querySelectorAll<HTMLElement>('.sp-quote-bg');
    const dots = wrap.querySelectorAll<HTMLElement>('.sp-dot');
    let current = 0;
    const total = slides.length;

    function show(idx: number) {
      slides.forEach((s) => s.classList.remove('sp-quote-active'));
      bgs.forEach((b) => {
        b.style.opacity = '0';
        b.classList.remove('sp-quote-bg-active');
      });
      dots.forEach((d) => d.classList.remove('sp-dot-active'));
      slides[idx].classList.add('sp-quote-active');
      bgs[idx].style.opacity = '.75';
      bgs[idx].classList.add('sp-quote-bg-active');
      dots[idx].classList.add('sp-dot-active');
      current = idx;
    }

    dots.forEach((d) => {
      d.addEventListener('click', () => {
        show(parseInt(d.dataset.idx || '0'));
      });
    });

    const interval = setInterval(() => {
      show((current + 1) % total);
    }, 6000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className="sp-hero-quote rv"
      id="sp-rotator"
      ref={wrapRef}
      style={{
        maxWidth: '1100px',
        margin: '0 auto 48px',
        minHeight: '620px',
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        isolation: 'isolate',
        background: '#000',
      }}
    >
      {/* Background images that rotate with quotes */}
      <div
        className="sp-quote-bg sp-quote-bg-active"
        data-index="0"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: "url('/assets/images/7785487548.jpg') center/cover",
          opacity: 0.75,
          transition: 'opacity .8s ease',
        }}
      />
      <div
        className="sp-quote-bg"
        data-index="1"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: "url('/assets/images/hero-e1649318546466.jpg') center/cover",
          opacity: 0,
          transition: 'opacity .8s ease',
        }}
      />
      <div
        className="sp-quote-bg"
        data-index="2"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: "url('/assets/images/7577854.jpg') center/cover",
          opacity: 0,
          transition: 'opacity .8s ease',
        }}
      />

      {/* Subtle gradient overlay for text readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.55))',
          zIndex: 1,
        }}
      />

      {/* Quote content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '100px 56px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '620px',
        }}
      >
        <div className="sp-quote-slide sp-quote-active" data-index="0">
          <div className="sp-stars" style={{ marginBottom: '24px' }}>
            ★★★★★
          </div>
          <p className="sp-hero-text">
            &ldquo;I showed up to one call and a week later I had the best website my business has
            ever had. I didn&apos;t have to think about any of the technical stuff.&rdquo;
          </p>
          <div className="sp-hero-author">
            <div className="sp-avatar">JM</div>
            <div>
              <div className="sp-name">Jordan Mitchell</div>
              <div className="sp-role">Owner, Mitchell Landscaping</div>
            </div>
          </div>
        </div>

        <div className="sp-quote-slide" data-index="1">
          <div className="sp-stars" style={{ marginBottom: '24px' }}>
            ★★★★★
          </div>
          <p className="sp-hero-text">
            &ldquo;Our old site was embarrassing. Envosta replaced it with something fast, clean,
            and professional. Our leads have doubled since the switch.&rdquo;
          </p>
          <div className="sp-hero-author">
            <div className="sp-avatar">SR</div>
            <div>
              <div className="sp-name">Sarah Reynolds</div>
              <div className="sp-role">Founder, Bloom &amp; Co Salon</div>
            </div>
          </div>
        </div>

        <div className="sp-quote-slide" data-index="2">
          <div className="sp-stars" style={{ marginBottom: '24px' }}>
            ★★★★★
          </div>
          <p className="sp-hero-text">
            &ldquo;The onboarding call alone was worth it. They handled things I didn&apos;t even
            know I needed. It&apos;s like having a whole team behind your website.&rdquo;
          </p>
          <div className="sp-hero-author">
            <div className="sp-avatar">DK</div>
            <div>
              <div className="sp-name">David Kim</div>
              <div className="sp-role">CEO, Apex Consulting Group</div>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div
          className="sp-dots"
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            zIndex: 3,
          }}
        >
          <button className="sp-dot sp-dot-active" data-idx="0" aria-label="Testimonial 1" />
          <button className="sp-dot" data-idx="1" aria-label="Testimonial 2" />
          <button className="sp-dot" data-idx="2" aria-label="Testimonial 3" />
        </div>
      </div>
    </div>
  );
}
