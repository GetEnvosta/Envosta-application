/**
 * Small badge showing the derived provision status for a site row.
 * Server-renderable. Pass `showDetail` to also render the secondary
 * detail text (attempt count, recovery deadline, etc) below the badge.
 */
import { getProvisionStatus } from '@/lib/provision-status';

const TONE: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  yellow: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  gray: 'bg-gray-50 text-gray-600 border-gray-200',
};

export function ProvisionStatusBadge({ site, showDetail = false }: { site: any; showDetail?: boolean }) {
  const ps = getProvisionStatus(site);
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${TONE[ps.tone]}`}>
        {ps.label}
      </span>
      {showDetail && ps.detail ? <span className="text-[10px] text-gray-500">{ps.detail}</span> : null}
    </span>
  );
}
