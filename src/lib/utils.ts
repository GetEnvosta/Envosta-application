/**
 * Shared formatting + classname helpers used across server + client.
 * Keep this file dependency-free (only clsx + tailwind-merge) so it
 * can be imported anywhere without dragging in Next/Supabase modules.
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Concat Tailwind classnames with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number, currency = 'cad') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(date: string | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(date));
}

export function statusColor(status: string) {
  const map: Record<string, string> = {
    active: 'badge-green', provisioning: 'badge-blue', pending: 'badge-yellow',
    registered: 'badge-green', pending_dns: 'badge-yellow', transferring: 'badge-blue',
    suspended: 'badge-yellow', cancelled: 'badge-gray', deleted: 'badge-red',
    failed: 'badge-red', expired: 'badge-red',
    past_due: 'badge-red', trialing: 'badge-blue',
    paid: 'badge-green', open: 'badge-yellow', draft: 'badge-gray',
    void: 'badge-gray', incomplete: 'badge-yellow',
  };
  return map[status] ?? 'badge-gray';
}
