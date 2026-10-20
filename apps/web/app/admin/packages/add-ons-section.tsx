'use client';

import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import {
  errorMessage,
  useAdminAddOns,
  useAdminPackageCategories,
  useDeleteAddOn,
} from '@/lib/admin-queries';
import type { AddOn } from '@/lib/booking-api';
import { formatRupiah } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CmsDeleteDialog } from '../components/cms-delete-dialog';
import { QueryError, QueryLoading } from '../components/query-state';
import AddOnDialog from './add-on-dialog';

/** The add-ons customers can pick at checkout, and where each applies. */
export default function AddOnsSection() {
  const addOns = useAdminAddOns();
  const categories = useAdminPackageCategories();
  const remove = useDeleteAddOn();
  const [dialog, setDialog] = useState<{ item?: AddOn } | null>(null);

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            Add-on
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
            Tambahan yang bisa dipilih customer saat reservasi: tambah waktu, extra edit, dan
            sejenisnya.
          </p>
        </div>
        <Button
          onClick={() => setDialog({})}
          size="sm"
          className="h-9 gap-1.5 rounded-xl bg-amber-500 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 hover:bg-amber-600"
        >
          <Plus className="size-3.5" />
          Tambah Add-on
        </Button>
      </div>

      {addOns.isLoading && <QueryLoading rows={2} />}
      {addOns.isError && (
        <QueryError
          title="Add-on tidak dapat dimuat"
          message={errorMessage(addOns.error)}
          retry={() => addOns.refetch()}
        />
      )}

      {addOns.data && addOns.data.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Belum ada add-on.
        </p>
      )}

      {addOns.data && addOns.data.length > 0 && (
        <Card className="overflow-hidden rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                <tr>
                  <th className="p-3.5 pl-5 font-semibold">Add-on</th>
                  <th className="p-3.5 font-semibold">Harga</th>
                  <th className="p-3.5 font-semibold">Waktu</th>
                  <th className="p-3.5 font-semibold">Berlaku untuk</th>
                  <th className="p-3.5 pr-5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {addOns.data.map((addOn) => (
                  <tr
                    key={addOn.id}
                    className={`transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                      addOn.isActive ? '' : 'opacity-55'
                    }`}
                  >
                    <td className="p-3.5 pl-5">
                      <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                        {addOn.name}
                        {!addOn.isActive && (
                          <Badge className="border border-zinc-500/20 bg-zinc-500/10 text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
                            Nonaktif
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">maks. {addOn.maxQuantity}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-zinc-900 dark:text-white">
                      {formatRupiah(addOn.price)}
                      <span className="font-sans font-normal text-zinc-500">
                        {' '}
                        / {addOn.unitLabel}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-600 dark:text-zinc-300">
                      {addOn.extraMinutes > 0 ? `+${addOn.extraMinutes} menit` : '—'}
                    </td>
                    <td className="p-3.5">
                      {addOn.categories.length === 0 ? (
                        <span className="text-zinc-500">Semua paket</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {addOn.categories.map((category) => (
                            <Badge
                              key={category}
                              className="border border-amber-500/20 bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400"
                            >
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 pr-5">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDialog({ item: addOn })}
                          className="h-8 gap-1 border-zinc-300 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <Edit className="size-3.5 text-amber-500" />
                          Edit
                        </Button>
                        <CmsDeleteDialog
                          title={addOn.name}
                          entityLabel="add-on"
                          description={
                            <>
                              Add-on{' '}
                              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                “{addOn.name}”
                              </span>{' '}
                              tidak lagi ditawarkan. Reservasi yang sudah memilihnya tidak berubah.
                            </>
                          }
                          isPending={remove.isPending}
                          onConfirm={() => remove.mutate(addOn.id)}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Hapus ${addOn.name}`}
                              className="h-8 px-2.5 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {dialog && (
        <AddOnDialog
          key={dialog.item?.id ?? 'new'}
          item={dialog.item}
          categories={(categories.data ?? []).map((category) => category.name)}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </section>
  );
}
