'use client';

import { useState, type FormEvent } from 'react';
import type { AddOn } from '@/lib/booking-api';
import { errorMessage, useSaveAddOn } from '@/lib/admin-queries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AddOnDialog({
  item,
  categories,
  open,
  onOpenChange,
}: {
  item?: AddOn;
  /** The package categories that exist, offered as choices for where this add-on applies. */
  categories: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveAddOn();
  const [name, setName] = useState(item?.name ?? '');
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(item));
  const [description, setDescription] = useState(item?.description ?? '');
  const [unitLabel, setUnitLabel] = useState(item?.unitLabel ?? '');
  const [price, setPrice] = useState(String(item?.price ?? ''));
  const [extraMinutes, setExtraMinutes] = useState(String(item?.extraMinutes ?? 0));
  const [maxQuantity, setMaxQuantity] = useState(String(item?.maxQuantity ?? 10));
  const [picked, setPicked] = useState<string[]>(item?.categories ?? []);
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  // A category the add-on already names stays on offer even if no package has it any more.
  const choices = [...new Set([...categories, ...picked])];
  const toggle = (category: string) =>
    setPicked((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(
      {
        id: item?.id,
        body: {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || undefined,
          unitLabel: unitLabel.trim() || undefined,
          price: Number(price),
          extraMinutes: Number(extraMinutes) || 0,
          maxQuantity: Number(maxQuantity) || 1,
          categories: picked,
          sortOrder: Number(sortOrder) || 0,
          isActive,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  const label = 'font-medium text-zinc-600 dark:text-zinc-400';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Add-on' : 'Tambah Add-on'}</DialogTitle>
          <DialogDescription>
            Customer memilihnya saat reservasi. Harga dikalikan jumlah, dan waktu tambahan
            memperpanjang sesi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className={label}>Nama add-on *</span>
              <Input
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!slugTouched) setSlug(slugify(event.target.value));
                }}
              />
            </label>
            <label className="space-y-1">
              <span className={label}>Slug *</span>
              <Input
                required
                minLength={2}
                maxLength={120}
                value={slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlug(slugify(event.target.value));
                }}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className={label}>Harga per satuan (Rp) *</span>
              <Input
                required
                inputMode="numeric"
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label className="space-y-1">
              <span className={label}>Satuan *</span>
              <Input
                required
                maxLength={40}
                placeholder="30 menit, 5 foto, orang..."
                value={unitLabel}
                onChange={(event) => setUnitLabel(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className={label}>Tambah waktu (menit)</span>
              <Input
                inputMode="numeric"
                value={extraMinutes}
                onChange={(event) => setExtraMinutes(event.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label className="space-y-1">
              <span className={label}>Maks. jumlah</span>
              <Input
                inputMode="numeric"
                value={maxQuantity}
                onChange={(event) => setMaxQuantity(event.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label className="space-y-1">
              <span className={label}>Urutan</span>
              <Input
                inputMode="numeric"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value.replace(/\D/g, ''))}
              />
            </label>
          </div>
          <p className="-mt-1.5 text-[11px] text-zinc-500">
            Waktu tambahan per satuan: isi 30 untuk add-on yang menambah 30 menit setiap satuan, 0
            jika tidak memperpanjang sesi.
          </p>

          <fieldset className="space-y-2">
            <legend className={label}>Berlaku untuk kategori paket</legend>
            <div className="flex flex-wrap gap-2">
              {choices.map((category) => {
                const on = picked.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(category)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 font-medium transition-colors',
                      on
                        ? 'border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-white'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400',
                    )}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-zinc-500">
              {picked.length === 0
                ? 'Tidak ada yang dipilih: add-on ini ditawarkan untuk semua paket.'
                : `Hanya ditawarkan untuk paket ${picked.join(' dan ')}.`}
            </p>
          </fieldset>

          <label className="block space-y-1">
            <span className={label}>Deskripsi</span>
            <Textarea
              rows={2}
              maxLength={500}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-amber-500"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>Aktif (bisa dipilih customer)</span>
          </label>

          {save.isError && (
            <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-rose-700 dark:text-rose-300">
              {errorMessage(save.error)}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={save.isPending}
              className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
            >
              {save.isPending ? 'Menyimpan...' : 'Simpan Add-on'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
