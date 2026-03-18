import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

export function StatCard({
  label, value, icon: Icon, href, sub,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  sub?: string;
}) {
  const Wrapper = href ? 'a' : 'div';
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={cn(
        'card p-5 group',
        href && 'hover:border-admin-200 transition-colors cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-admin-50 text-admin-600 flex items-center justify-center group-hover:bg-admin-100 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Wrapper>
  );
}
