'use client';

import { useEffect, useRef } from 'react';

export function StarField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const frag = document.createDocumentFragment();
    const colors = ['white', 'white', 'cool', 'cool', 'blue', 'warm'];

    // Clusters for natural grouping
    const clusters: Array<{ x: number; y: number; spread: number }> = [];
    for (let c = 0; c < 10; c++) {
      clusters.push({
        x: Math.random() * 100,
        y: 20 + Math.random() * 60,
        spread: 6 + Math.random() * 12,
      });
    }

    function place() {
      let x: number, y: number;
      if (Math.random() < 0.55) {
        const cl = clusters[Math.floor(Math.random() * clusters.length)];
        x = cl.x + (Math.random() - 0.5) * cl.spread * 2;
        y = cl.y + (Math.random() - 0.5) * cl.spread * 2;
      } else {
        x = Math.random() * 100;
        y = Math.random() * 100;
      }
      // Keep stars in middle 70% — solid edges have no stars
      y = 15 + Math.max(0, Math.min(100, y)) * 0.7;
      x = Math.max(0, Math.min(100, x));
      return { x, y };
    }

    function make(size: string, color: string, twinkle: boolean) {
      const star = document.createElement('div');
      star.className = 'star ' + size + ' ' + color + (twinkle ? ' twinkle' : '');
      const p = place();
      star.style.left = p.x.toFixed(1) + '%';
      star.style.top = p.y.toFixed(1) + '%';
      if (twinkle) {
        star.style.setProperty('--tw-del', (Math.random() * 10).toFixed(1) + 's');
        star.style.setProperty('--tw-dur', (2 + Math.random() * 6).toFixed(1) + 's');
      }
      frag.appendChild(star);
    }

    // Layer 1: Deep background dust
    for (let i = 0; i < 40; i++) {
      make('xs', colors[Math.floor(Math.random() * colors.length)], Math.random() > 0.7);
    }

    // Layer 2: Mid-distance stars
    for (let i = 0; i < 50; i++) {
      const size = Math.random() > 0.6 ? 'md' : 'sm';
      make(size, colors[Math.floor(Math.random() * colors.length)], Math.random() > 0.35);
    }

    // Layer 3: Closer stars
    for (let i = 0; i < 15; i++) {
      make('lg', colors[Math.floor(Math.random() * colors.length)], Math.random() > 0.3);
    }

    // Layer 4: Feature stars
    for (let i = 0; i < 5; i++) {
      make('xl', Math.random() > 0.5 ? 'cool' : 'white', true);
    }

    // Layer 5: Hero stars
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('div');
      const col = Math.random() > 0.6 ? 'cool' : Math.random() > 0.5 ? 'blue' : 'white';
      star.className = 'star bright ' + col + ' twinkle';
      star.style.left = (15 + Math.random() * 70).toFixed(1) + '%';
      star.style.top = (25 + Math.random() * 50).toFixed(1) + '%';
      star.style.setProperty('--tw-del', (Math.random() * 6).toFixed(1) + 's');
      star.style.setProperty('--tw-dur', (3 + Math.random() * 4).toFixed(1) + 's');
      frag.appendChild(star);
    }

    container.appendChild(frag);

    return () => {
      // Clean up all generated star elements
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  return <div className="zone-c-stars" id="zone-c-stars" ref={containerRef} />;
}
