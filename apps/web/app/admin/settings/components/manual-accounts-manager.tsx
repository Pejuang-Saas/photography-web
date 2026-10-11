'use client';

import { useState } from 'react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import type { ManualAccount } from '@/lib/admin-api';
import {
  errorMessage,
  useDeleteManualAccount,
  useManualAccounts,
  useSaveManualAccount,
} from '@/lib/admin-queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QueryError, QueryLoading } from '../../components/query-state';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import ManualAccountDialog from './manual-account-dialog';

export default function ManualAccountsManager() {
  const accounts = useManualAccounts();
  const save = useSaveManualAccount();
  const remove = useDeleteManualAccount();
  const [dialog, setDialog] = useState<{ account?: ManualAccount } | null>(null);
  const [deleting, setDeleting] = useState<ManualAccount | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Rekening Studio</h4>
        <Button size="sm" variant="outline" onClick={() => setDialog({})} className="h-8 gap-1.5">
          <Plus className="size-3.5" />
          Tambah Rekening Baru
        </Button>
      </div>

      {accounts.isLoading && <QueryLoading rows={2} />}
      {accounts.isError && (
        <QueryError
          title="Rekening tidak dapat dimuat"
          message={errorMessage(accounts.error)}
          retry={() => accounts.refetch()}
        />
      )}
      {accounts.data?.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700">
          Belum ada rekening. Tambahkan minimal satu rekening aktif agar customer bisa transfer.
        </p>
      )}

      <ul className="space-y-2">
        {(accounts.data ?? []).map((account) => (
          <li
            key={account.id}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 ${
              account.isActive ? '' : 'opacity-60'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">
                  {account.bankName}
                </span>
                {account.isPrimary && (
                  <Badge className="border border-amber-500/30 bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    Utama
                  </Badge>
                )}
              </div>
              <p className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                {account.accountNumber}
              </p>
              <p className="text-[11px] text-zinc-500">a.n. {account.accountHolder}</p>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="mr-1 flex cursor-pointer items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={account.isActive}
                  disabled={save.isPending}
                  onChange={(event) =>
                    save.mutate({ id: account.id, body: { isActive: event.target.checked } })
                  }
                />
                Aktif
              </label>
              {!account.isPrimary && (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Jadikan utama"
                  disabled={save.isPending}
                  onClick={() => save.mutate({ id: account.id, body: { isPrimary: true } })}
                  className="size-8"
                >
                  <Star className="size-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                title="Edit"
                onClick={() => setDialog({ account })}
                className="size-8"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="Hapus"
                onClick={() => setDeleting(account)}
                className="size-8 text-rose-600 dark:text-rose-400"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {save.isError && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{errorMessage(save.error)}</p>
      )}

      {dialog && (
        <ManualAccountDialog
          key={dialog.account?.id ?? 'new'}
          account={dialog.account}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}

      {deleting && (
        <CmsDeleteDialog
          hideTrigger
          open
          onOpenChange={(open) => !open && setDeleting(null)}
          title={`${deleting.bankName} ${deleting.accountNumber}`}
          entityLabel="rekening"
          isPending={remove.isPending}
          onConfirm={() => remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        />
      )}
    </div>
  );
}
