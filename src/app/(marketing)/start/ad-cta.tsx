'use client';

/**
 * Ad-lander CTA — forwards the ad's query string (utm_*, fbclid, etc.)
 * onto the signup URL so campaign attribution survives the click through
 * to checkout. Renders as the old-brand primary button.
 */
import { useEffect, useState } from 'react';

export function AdCta({
  label,
  className = 'bp lg',
  href = '/get-started',
}: {
  label: string;
  className?: string;
  href?: string;
}) {
  const [target, setTarget] = useState(href);

  useEffect(() => {
    if (window.location.search) {
      setTarget(`${href}${href.includes('?') ? '&' : '?'}${window.location.search.slice(1)}`);
    }
  }, [href]);

  return (
    <a href={target} className={className}>
      {label}
    </a>
  );
}
