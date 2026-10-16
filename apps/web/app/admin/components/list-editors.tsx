'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type Pair = { title: string; description: string };

function Counter({ count, max }: { count: number; max: number }) {
  return <span className="font-mono text-[11px] text-zinc-500">{`${count}/${max}`}</span>;
}

function AddButton({
  count,
  max,
  label,
  onClick,
}: {
  count: number;
  max: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={count >= max}
      className="h-8 gap-1.5"
    >
      <Plus className="size-3.5" />
      {count >= max ? `Maksimal ${max}` : label}
    </Button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onClick}
      className="size-8 shrink-0 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}

function NumberBadge({ n }: { n: number }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400"
    >
      {n}
    </span>
  );
}

/** One text input per item, with add and delete. Used for keywords, guarantees, and the like. */
export function StringListEditor({
  items,
  onChange,
  max,
  itemLabel,
  placeholder,
  addLabel,
  emptyText,
  maxLength = 160,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  max: number;
  itemLabel: string;
  placeholder?: string;
  addLabel: string;
  emptyText: string;
  maxLength?: number;
}) {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2.5">
      <div className="flex justify-end">
        <Counter count={items.length} max={max} />
      </div>
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500 dark:border-zinc-700">
          {emptyText}
        </p>
      )}
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <NumberBadge n={index + 1} />
            <Input
              aria-label={`${itemLabel} ${index + 1}`}
              maxLength={maxLength}
              autoFocus={index === focusIndex}
              placeholder={placeholder}
              value={item}
              onChange={(event) =>
                onChange(items.map((current, i) => (i === index ? event.target.value : current)))
              }
            />
            <RemoveButton
              label={`Hapus ${itemLabel.toLowerCase()} ${index + 1}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            />
          </li>
        ))}
      </ul>
      <AddButton
        count={items.length}
        max={max}
        label={addLabel}
        onClick={() => {
          setFocusIndex(items.length);
          onChange([...items, '']);
        }}
      />
    </div>
  );
}

/** A title plus a description per item, with add and delete. Used for steps and "about" points. */
export function PairListEditor({
  items,
  onChange,
  max,
  itemLabel,
  titlePlaceholder,
  descriptionPlaceholder,
  addLabel,
  emptyText,
  titleMaxLength = 100,
  descriptionMaxLength = 300,
}: {
  items: Pair[];
  onChange: (items: Pair[]) => void;
  max: number;
  itemLabel: string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  addLabel: string;
  emptyText: string;
  titleMaxLength?: number;
  descriptionMaxLength?: number;
}) {
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const patch = (index: number, change: Partial<Pair>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...change } : item)));

  return (
    <div className="space-y-2.5">
      <div className="flex justify-end">
        <Counter count={items.length} max={max} />
      </div>
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500 dark:border-zinc-700">
          {emptyText}
        </p>
      )}
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <div className="pt-1">
              <NumberBadge n={index + 1} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                aria-label={`Judul ${itemLabel.toLowerCase()} ${index + 1}`}
                maxLength={titleMaxLength}
                autoFocus={index === focusIndex}
                placeholder={titlePlaceholder}
                value={item.title}
                onChange={(event) => patch(index, { title: event.target.value })}
                className="font-medium"
              />
              <Textarea
                aria-label={`Deskripsi ${itemLabel.toLowerCase()} ${index + 1}`}
                rows={2}
                maxLength={descriptionMaxLength}
                placeholder={descriptionPlaceholder}
                value={item.description}
                onChange={(event) => patch(index, { description: event.target.value })}
              />
            </div>
            <RemoveButton
              label={`Hapus ${itemLabel.toLowerCase()} ${index + 1}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            />
          </li>
        ))}
      </ul>
      <AddButton
        count={items.length}
        max={max}
        label={addLabel}
        onClick={() => {
          setFocusIndex(items.length);
          onChange([...items, { title: '', description: '' }]);
        }}
      />
    </div>
  );
}
