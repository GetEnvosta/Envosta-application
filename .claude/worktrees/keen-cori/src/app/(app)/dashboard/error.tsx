'use client';

import Link from 'next/link';

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8 max-w-md mx-auto text-center">
      <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 text-xl font-bold">!</div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-500 mb-6">An error occurred loading this page. Try refreshing or contact support if the issue persists.</p>
      <div className="flex gap-3 justify-center">
        <button onClick={reset} className="btn-primary text-sm">Try again</button>
        <Link href="/dashboard" className="btn-secondary text-sm">Back to dashboard</Link>
      </div>
    </div>
  );
}
