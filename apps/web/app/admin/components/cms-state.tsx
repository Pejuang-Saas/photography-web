import type { ReactNode } from 'react';
import { AlertCircle, ImageIcon, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CmsLoadingState() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70" />)}</div>;
}

export function CmsEmptyState({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 text-center dark:border-zinc-700 dark:bg-zinc-900/40"><ImageIcon className="size-9 text-amber-500" /><h2 className="mt-3 font-bold text-zinc-900 dark:text-white">{title}</h2><p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p><div className="mt-4">{action}</div></div>;
}

export function CmsErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-6 text-center"><AlertCircle className="size-9 text-rose-500" /><h2 className="mt-3 font-bold text-zinc-900 dark:text-white">Data CMS tidak dapat dimuat</h2><p className="mt-1 max-w-md text-sm text-zinc-500">{message}</p><Button onClick={retry} variant="outline" className="mt-4">Coba lagi</Button></div>;
}

export function CmsSubmittingLabel({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-2"><LoaderCircle className="size-3.5 animate-spin" />{children}</span>;
}
