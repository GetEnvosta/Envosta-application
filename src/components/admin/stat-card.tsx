import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';

const colorMap: Record<string, { bg: string; text: string; hover: string }> = {
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600',  hover: 'group-hover:bg-indigo-100' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-600',    hover: 'group-hover:bg-blue-100' },
  green:   { bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'group-hover:bg-emerald-100' },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-600',  hover: 'group-hover:bg-purple-100' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600',   hover: 'group-hover:bg-amber-100' },
  red:     { bg: 'bg-red-50',     text: 'text-red-600',     hover: 'group-hover:bg-red-100' },
  gray:    { bg: 'bg-gray-100',   text: 'text-gray-600',    hover: 'group-hover:bg-gray-200' },
  cyan:    { bg: 'bg-cyan-50',    text: 'text-cyan-600',    hover: 'group-hover:bg-cyan-100' },
};

export function StatCard({
  label, value, icon: Icon, href, sub, color = 'indigo',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  href?: string;
  sub?: string;
  color?: keyof typeof colorMap;
}) {
  const c = colorMap[color] ?? colorMap.indigo;
  const Wrapper = href ? 'a' : 'div';
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={cn(
        'card p-5 group',
        href && 'hover:border-gray-200 hover:shadow-md transition-all cursor-pointer'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors', c.bg, c.text, c.hover)}>
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
