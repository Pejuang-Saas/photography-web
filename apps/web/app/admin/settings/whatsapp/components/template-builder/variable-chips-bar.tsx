import { useMemo } from 'react';
import type { TemplateVariable } from '@/lib/whatsapp-template-api';

/** Pills that put a {variable} into the message, so nobody types the braces by hand. */
export default function VariableChipsBar({
  variables,
  onInsert,
}: {
  variables: TemplateVariable[];
  onInsert: (token: string) => void;
}) {
  const groups = useMemo(() => {
    const byGroup = new Map<string, TemplateVariable[]>();
    for (const variable of variables) {
      byGroup.set(variable.group, [...(byGroup.get(variable.group) ?? []), variable]);
    }
    return [...byGroup.entries()];
  }, [variables]);

  return (
    <div className="space-y-3">
      {groups.map(([group, items]) => (
        <div key={group}>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {group}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((variable) => (
              <button
                key={variable.key}
                type="button"
                title={`${variable.label}, contoh: ${variable.sample}${
                  variable.needsBooking ? ' (butuh data booking)' : ''
                }`}
                // Keep the caret in the text box while clicking.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onInsert(`{${variable.key}}`)}
                className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition-colors hover:border-amber-500/60 hover:bg-amber-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                + {variable.label}
                {variable.needsBooking && <span className="ml-1 text-amber-600">•</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[11px] text-zinc-500">
        <span className="text-amber-600">•</span> butuh data booking: tidak bisa dikirim ke nomor
        yang belum punya booking aktif.
      </p>
    </div>
  );
}
