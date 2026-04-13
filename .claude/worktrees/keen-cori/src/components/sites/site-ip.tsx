'use client';

import { useState, useEffect } from 'react';

export function SiteIp({ siteId, initialIp }: { siteId: string; initialIp?: string | null }) {
  const [ip, setIp] = useState(initialIp ?? null);

  useEffect(() => {
    if (ip) return;
    fetch('/api/site-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get-ip', siteId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.ip) setIp(data.ip);
      })
      .catch(() => {});
  }, [siteId, ip]);

  return <span>{ip ?? 'Pending'}</span>;
}
