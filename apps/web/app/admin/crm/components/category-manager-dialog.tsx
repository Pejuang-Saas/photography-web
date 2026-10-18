'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import type { CrmCategory } from '@/lib/crm-api';
import { CRM_COLOR_KEYS, CRM_COLORS, crmColor } from '@/lib/crm-colors';
import { useCrmCategories, useDeleteCategory, useSaveCategory } from '@/lib/crm-queries';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

function ColorPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Warna kategori" className="flex items-center gap-1.5">
      {CRM_COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={CRM_COLORS[key].label}
          title={CRM_COLORS[key].label}
          disabled={disabled}
          onClick={() => onChange(key)}
          className={cn(
            'size-5 rounded-full ring-offset-2 ring-offset-background transition disabled:opacity-50',
            CRM_COLORS[key].dot,
            value === key ? 'ring-2 ring-zinc-900 dark:ring-white' : 'opacity-60 hover:opacity-100',
          )}
        />
      ))}
    </div>
  );
}

function CategoryRow({ category }: { category: CrmCategory }) {
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [name, setName] = useState(category.name);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commit(patch: { name?: string; color?: string }) {
    setError(null);
    try {
      await save.mutateAsync({ id: category.id, ...patch });
    } catch (failure) {
      setError(errorMessage(failure));
      setName(category.name);
    }
  }

  function commitName() {
    const next = name.trim();
    if (!next) return setName(category.name);
    if (next !== category.name) void commit({ name: next });
  }

  return (
    <li className="space-y-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center gap-2.5">
        <span className={cn('size-3 shrink-0 rounded-full', crmColor(category.color).dot)} />
        <Input
          aria-label={`Nama kategori ${category.name}`}
          value={name}
          maxLength={40}
          onChange={(event) => setName(event.target.value)}
          onBlur={commitName}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          className="h-9"
        />
        <span className="shrink-0 font-mono text-[11px] text-zinc-500" title="Jumlah percakapan">
          {category.chatCount}
        </span>
        {confirming ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={remove.isPending}
            onClick={() => remove.mutate(category.id)}
          >
            Hapus?
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Hapus kategori ${category.name}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="size-4 text-zinc-500" />
          </Button>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 pl-[22px]">
        <ColorPicker
          value={category.color}
          disabled={save.isPending}
          onChange={(color) => commit({ color })}
        />
        {confirming && (
          <button
            type="button"
            className="text-[11px] text-zinc-500 underline"
            onClick={() => setConfirming(false)}
          >
            Batal
          </button>
        )}
      </div>
      {confirming && category.chatCount > 0 && (
        <p className="pl-[22px] text-[11px] text-amber-700 dark:text-amber-400">
          {category.chatCount} percakapan akan menjadi tanpa kategori.
        </p>
      )}
      {error && <p className="pl-[22px] text-[11px] text-rose-600">{error}</p>}
    </li>
  );
}

function NewCategoryForm() {
  const save = useSaveCategory();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>('blue');
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const next = name.trim();
    if (!next) return;
    setError(null);
    try {
      await save.mutateAsync({ id: null, name: next, color });
      setName('');
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void add();
      }}
      className="space-y-3 rounded-xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700"
    >
      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Kategori baru</p>
      <div className="flex gap-2">
        <Input
          aria-label="Nama kategori baru"
          placeholder="Misalnya Wisuda Kilat"
          maxLength={40}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-9"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!name.trim() || save.isPending}
          className="h-9 gap-1.5"
        >
          <Plus className="size-3.5" />
          Tambah
        </Button>
      </div>
      <ColorPicker value={color} onChange={setColor} />
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </form>
  );
}

export default function CategoryManagerDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const categories = useCrmCategories();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] gap-5 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kelola kategori obrolan</DialogTitle>
          <DialogDescription>
            Ketuk nama untuk mengganti, pilih warna badge, atau hapus. Menghapus kategori tidak
            menghapus percakapan.
          </DialogDescription>
        </DialogHeader>

        {categories.isLoading && <p className="text-xs text-zinc-500">Memuat…</p>}
        {categories.isError && (
          <p className="text-xs text-rose-600">{errorMessage(categories.error)}</p>
        )}
        {categories.data && (
          <ul className="space-y-3">
            {categories.data.length === 0 && (
              <li className="py-3 text-center text-xs text-zinc-500">Belum ada kategori.</li>
            )}
            {categories.data.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>
        )}
        <NewCategoryForm />
      </DialogContent>
    </Dialog>
  );
}
