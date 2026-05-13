'use client';

import { useRouter } from 'next/navigation';

export function ImpersonationBanner({
  targetName,
  targetEmail,
  mode = 'admin',
}: {
  targetName: string | null;
  targetEmail: string;
  mode?: 'admin';
}) {
  const router = useRouter();
  void mode;

  async function handleStop() {
    const res = await fetch('/api/stop-impersonation', { method: 'POST' });
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    }
  }

  return (
    <div className="text-sm font-medium px-4 py-2 flex items-center justify-center gap-3 relative z-50 bg-amber-500 text-amber-950">
      <span>
        Viewing as <strong>{targetName || targetEmail}</strong>
        {targetName && <span className="opacity-70 ml-1">({targetEmail})</span>}
      </span>
      <button
        onClick={handleStop}
        className="text-xs font-semibold px-3 py-1 rounded-full transition-colors bg-amber-950 text-amber-100 hover:bg-amber-900"
      >
        Stop impersonating
      </button>
    </div>
  );
}
