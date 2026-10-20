'use client';

import { useState, type FormEvent } from 'react';
import { errorMessage, useSavePackageCategory } from '@/lib/admin-queries';
import type { AdminPackageCategory } from '@/lib/admin-api';
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

export default function CategoryDialog({
  item,
  open,
  onOpenChange,
}: {
  item?: AdminPackageCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSavePackageCategory();
  const [name, setName] = useState(item?.name ?? '');
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));

  const renamed = Boolean(item) && name.trim() !== item?.name;
  const affected = (item?.packageCount ?? 0) + (item?.addOnCount ?? 0);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(
      {
        id: item?.id,
        body: {
          name: name.trim(),
          title: title.trim(),
          description: description.trim(),
          sortOrder: Number(sortOrder) || 0,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  const label = 'font-medium text-zinc-600 dark:text-zinc-400';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-lg overflow-y-auto rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Kategori' : 'Tambah Kategori Paket'}</DialogTitle>
          <DialogDescription>
            Mengelompokkan paket di katalog. Heading dan deskripsinya tampil di atas paket-paket di
            dalamnya.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
          <label className="block space-y-1">
            <span className={label}>Nama kategori *</span>
            <Input
              required
              maxLength={80}
              placeholder="Lite, Premium, Group..."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <span className="block text-[11px] text-zinc-500">
              Nama singkat yang dipilih di form paket dan add-on.
            </span>
          </label>
          {renamed && affected > 0 && (
            <p
              role="status"
              className="rounded-lg border border-amber-500/40 bg-amber-500/[0.08] px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300"
            >
              Mengganti nama ikut memperbarui {item?.packageCount} paket dan {item?.addOnCount}{' '}
              add-on yang memakai kategori ini.
            </p>
          )}

          <label className="block space-y-1">
            <span className={label}>Judul di katalog *</span>
            <Input
              required
              maxLength={120}
              placeholder="Lite Version"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className={label}>Deskripsi</span>
            <Textarea
              rows={4}
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Satu atau dua kalimat tentang kelompok paket ini."
            />
          </label>

          <label className="block space-y-1">
            <span className={label}>
              Urutan <span className="font-normal text-zinc-400">(kecil tampil dulu)</span>
            </span>
            <Input
              inputMode="numeric"
              className="max-w-32"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value.replace(/\D/g, ''))}
            />
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
              {save.isPending ? 'Menyimpan...' : 'Simpan Kategori'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
