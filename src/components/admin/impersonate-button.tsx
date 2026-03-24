'use client';

import { startImpersonation } from './actions';
import { LogIn } from 'lucide-react';

export function ImpersonateButton({ userId, label }: { userId: string; label?: string }) {
  return (
    <button
      onClick={() => startImpersonation(userId)}
      className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium"
      title={`Log in as ${label || 'this customer'}`}
    >
      <LogIn className="w-3.5 h-3.5" />
      Log in as
    </button>
  );
}
