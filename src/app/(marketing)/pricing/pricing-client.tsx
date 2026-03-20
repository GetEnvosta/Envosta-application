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
      document.querySelectorAll('.price-val').forEach((el) => {
        const e = el as HTMLElement;
        e.textContent = annual ? e.dataset.annual! : e.dataset.monthly!;
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
