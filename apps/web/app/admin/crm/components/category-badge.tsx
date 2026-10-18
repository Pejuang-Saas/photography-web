import { crmColor } from '@/lib/crm-colors';
import { cn } from '@/lib/utils';

export default function CategoryBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        crmColor(color).badge,
        className,
      )}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}
