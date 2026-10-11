'use client';

import { useState, type FormEvent } from 'react';
import type { ManualAccount } from '@/lib/admin-api';
import { errorMessage, useSaveManualAccount } from '@/lib/admin-queries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function ManualAccountDialog({
  account,
  open,
  onOpenChange,
}: {
  account?: ManualAccount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveManualAccount();
  const [bankName, setBankName] = useState(account?.bankName ?? '');
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? '');
  const [accountHolder, setAccountHolder] = useState(account?.accountHolder ?? '');
  const [isPrimary, setIsPrimary] = useState(account?.isPrimary ?? false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(
      {
        id: account?.id,
        body: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
          isPrimary,
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>{account ? 'Edit Rekening' : 'Tambah Rekening Baru'}</DialogTitle>
          <DialogDescription>
            Rekening aktif ditampilkan ke customer saat memilih transfer manual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
          <label className="block space-y-1">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Bank / E-Wallet *</span>
            <Input
              required
              minLength={2}
              maxLength={80}
              placeholder="BCA, Mandiri, GoPay..."
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              Nomor Rekening / No. HP *
            </span>
            <Input
              required
              minLength={4}
              maxLength={80}
              inputMode="numeric"
              className="font-mono"
              value={accountNumber}
              onChange={(event) => setAccountNumber(event.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">Atas Nama *</span>
            <Input
              required
              minLength={2}
              maxLength={120}
              value={accountHolder}
              onChange={(event) => setAccountHolder(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            <span>Jadikan rekening utama</span>
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
              {save.isPending ? 'Menyimpan...' : 'Simpan Rekening'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
