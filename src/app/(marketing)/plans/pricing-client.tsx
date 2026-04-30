'use client';

import { useEffect } from 'react';

export default function PricingClient() {
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

    // Billing toggle
    let annual = false;
    const toggle = document.getElementById('billing-toggle');
    const lblMonthly = document.getElementById('lbl-monthly');
    const lblAnnual = document.getElementById('lbl-annual');

    function toggleBilling() {
      annual = !annual;
      toggle?.classList.toggle('on', annual);
      lblMonthly?.classList.toggle('active', !annual);
      lblAnnual?.classList.toggle('active', annual);
      // Update displayed prices (per-month equivalent on annual)
      document.querySelectorAll('.price-val').forEach((el) => {
        const e = el as HTMLElement;
        e.textContent = annual ? e.dataset.annual! : e.dataset.monthly!;
      });
      // Show/hide "billed annually" note (period label "USD/month" stays
      // because we display the per-month equivalent on annual too).
      document.querySelectorAll('.annual-note').forEach((el) => {
        (el as HTMLElement).style.display = annual ? 'block' : 'none';
      });
      // Update Get Started links to include billing period
      document.querySelectorAll<HTMLAnchorElement>('a[href*="/get-started?plan="]').forEach((a) => {
        const url = new URL(a.href);
        if (annual) {
          url.searchParams.set('billing', 'annual');
        } else {
          url.searchParams.delete('billing');
        }
        a.href = url.toString();
      });
    }

    toggle?.addEventListener('click', toggleBilling);

    // FAQ accordion
    const faqQuestions = document.querySelectorAll('.faq-q');
    const faqHandler = (e: Event) => {
      const q = e.currentTarget as HTMLElement;
      q.parentElement?.classList.toggle('open');
    };
    faqQuestions.forEach((q) => q.addEventListener('click', faqHandler));

    return () => {
      toggle?.removeEventListener('click', toggleBilling);
      faqQuestions.forEach((q) => q.removeEventListener('click', faqHandler));
    };
  }, []);

  return null;
}
