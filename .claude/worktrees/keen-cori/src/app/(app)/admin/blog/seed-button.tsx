'use client';

import { useState } from 'react';
import { Database, Loader2 } from 'lucide-react';

export function SeedBlogButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors?: string[] } | null>(null);

  async function handleSeed() {
    if (!confirm('This will insert all seed blog posts. Existing posts with the same slug will be skipped. Continue?')) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/seed-blog', { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ inserted: 0, skipped: 0, errors: ['Request failed'] });
    }
    setLoading(false);
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleSeed}
        disabled={loading}
        className="btn-admin-secondary text-sm py-2 px-3.5 inline-flex items-center gap-1.5"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
        {loading ? 'Seeding...' : 'Seed Posts'}
      </button>
      {result && (
        <span className="text-xs text-gray-500">
          {result.inserted} inserted, {result.skipped} skipped
          {result.errors && result.errors.length > 0 && `, ${result.errors.length} errors`}
        </span>
      )}
    </div>
  );
}
