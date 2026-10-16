// Shared shapes for the checkout so every step looks like one system (the global shadcn
// components are pill-shaped and tuned for the admin, not for this dark landing page).
export const fieldClass =
  'h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-sm text-fg placeholder:text-muted-dim outline-none transition-colors hover:border-white/20 focus:border-accent focus:ring-2 focus:ring-accent/30 aria-invalid:border-red-400/60 aria-invalid:ring-red-400/20';

/** Fields sized by viewport height (2.5rem-3.25rem), so step 1 fits a laptop and fills a tall monitor. */
export const fieldCompactClass = fieldClass.replace('h-11', 'h-[clamp(2.5rem,5vh,3.25rem)]');

export const textareaClass =
  'min-h-24 w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-fg placeholder:text-muted-dim outline-none transition-colors hover:border-white/20 focus:border-accent focus:ring-2 focus:ring-accent/30';

export const textareaCompactClass = textareaClass
  .replace('min-h-24', 'h-16')
  .replace('py-3', 'py-2.5');

export const primaryButtonClass =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-accent-fg transition-all hover:bg-accent-light active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export const secondaryButtonClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 px-5 text-sm font-semibold text-fg transition-colors hover:border-white/30 hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export const sectionClass =
  'rounded-2xl border border-white/10 bg-white/[0.025] p-4 sm:p-5 [@media(min-height:900px)]:p-7';

export const emeraldButtonClass =
  'inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition-colors hover:bg-emerald-700';
