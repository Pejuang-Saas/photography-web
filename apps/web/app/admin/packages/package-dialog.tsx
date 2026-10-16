'use client';

import { useState, type FormEvent } from 'react';
import type { ServicePackage } from '@/lib/booking-api';
import { errorMessage, useSavePackage } from '@/lib/admin-queries';
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function featureList(features: unknown) {
  return Array.isArray(features)
    ? features.filter((item): item is string => typeof item === 'string')
    : [];
}

export default function PackageDialog({
  item,
  open,
  onOpenChange,
}: {
  item?: ServicePackage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSavePackage();
  const [name, setName] = useState(item?.name ?? '');
  const [slug, setSlug] = useState(item?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(item));
  const [category, setCategory] = useState(item?.category ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(String(item?.price ?? ''));
  const [duration, setDuration] = useState(String(item?.durationMinutes ?? 60));
  const [maxPeople, setMaxPeople] = useState(String(item?.maxPeople ?? 1));
  const [features, setFeatures] = useState(featureList(item?.features).join('\n'));
  const [isActive, setIsActive] = useState(item?.isActive ?? true);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(
      {
        id: item?.id,
        body: {
          name: name.trim(),
          slug: slug.trim(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
          price: Number(price),
          durationMinutes: Number(duration),
          maxPeople: Number(maxPeople),
          features: features
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          isActive,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Paket' : 'Tambah Paket Foto'}</DialogTitle>
          <DialogDescription>
            Paket aktif langsung muncul di katalog landing page.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Nama paket *</span>
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
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Slug *</span>
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
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Kategori</span>
              <Input
                maxLength={80}
                placeholder="Solo, Squad, Family..."
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Harga (Rp) *</span>
              <Input
                required
                inputMode="numeric"
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/\D/g, ''))}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Durasi (menit)</span>
              <Input
                inputMode="numeric"
                value={duration}
                onChange={(event) => setDuration(event.target.value.replace(/\D/g, ''))}
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-zinc-600 dark:text-zinc-400">Maks. orang</span>
              <Input
                inputMode="numeric"
                value={maxPeople}
                onChange={(event) => setMaxPeople(event.target.value.replace(/\D/g, ''))}
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Deskripsi</span>
            <Textarea
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              Fasilitas (satu per baris)
            </span>
            <Textarea
              rows={5}
              value={features}
              onChange={(event) => setFeatures(event.target.value)}
              placeholder={'1 Orang Wisudawan\n30 foto edited color grade'}
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="size-4 accent-amber-500"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span>Aktif (tampil di katalog dan bisa dipesan)</span>
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
              {save.isPending ? 'Menyimpan...' : 'Simpan Paket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
