import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { GalleryStatus } from '@/types/gallery';

const STYLE: Record<GalleryStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className:
      'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
  ACTIVE: {
    label: 'Aktif',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  ARCHIVED: {
    label: 'Diarsipkan',
    className: 'border-amber-600/30 bg-amber-600/10 text-amber-800 dark:text-amber-400',
  },
};

export default function GalleryStatusBadge({ status }: { status: GalleryStatus }) {
  const style = STYLE[status];
  return (
    <Badge variant="outline" className={cn('text-[11px] font-semibold', style.className)}>
      {style.label}
    </Badge>
  );
}
