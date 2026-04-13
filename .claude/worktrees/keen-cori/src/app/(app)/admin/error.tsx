'use client';

import Link from 'next/link';

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 text-xl font-bold">!</div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Admin error</h2>
      <p className="text-sm text-gray-500 mb-6">Failed to load this page. The error has been logged.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={reset} className="btn-admin text-sm">Try again</button>
        <Link href="/admin" className="btn-admin-secondary text-sm">Back to admin</Link>
      </div>
    </div>
  );
}
