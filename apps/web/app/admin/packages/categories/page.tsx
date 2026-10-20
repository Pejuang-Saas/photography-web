'use client';

import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
import {
  errorMessage,
  useAdminPackageCategories,
  useDeletePackageCategory,
} from '@/lib/admin-queries';
import type { AdminPackageCategory } from '@/lib/admin-api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CmsDeleteDialog } from '../../components/cms-delete-dialog';
import { QueryError, QueryLoading } from '../../components/query-state';
import CategoryDialog from './category-dialog';

export default function PackageCategoriesPage() {
  const categories = useAdminPackageCategories();
  const remove = useDeletePackageCategory();
  const [dialog, setDialog] = useState<{ item?: AdminPackageCategory } | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            Kategori Paket
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
            Kelompok paket di katalog. Pilihan kategori di menu Paket dan Add-on mengikuti daftar
            ini.
          </p>
        </div>
        <Button
          onClick={() => setDialog({})}
          size="sm"
          className="h-9 gap-1.5 rounded-xl bg-amber-500 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 hover:bg-amber-600"
        >
          <Plus className="size-3.5" />
          Tambah Kategori
        </Button>
      </div>

      {categories.isLoading && <QueryLoading rows={3} />}
      {categories.isError && (
        <QueryError
          title="Kategori tidak dapat dimuat"
          message={errorMessage(categories.error)}
          retry={() => categories.refetch()}
        />
      )}

      {categories.data && categories.data.length === 0 && (
        <p className="rounded-xl border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Belum ada kategori. Tambahkan yang pertama, lalu pilih di form paket.
        </p>
      )}

      {categories.data && categories.data.length > 0 && (
        <Card className="overflow-hidden rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                <tr>
                  <th className="p-3.5 pl-5 font-semibold">Kategori</th>
                  <th className="p-3.5 font-semibold">Deskripsi di katalog</th>
                  <th className="p-3.5 text-right font-semibold">Urutan</th>
                  <th className="p-3.5 font-semibold">Dipakai</th>
                  <th className="p-3.5 pr-5 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {categories.data.map((category) => (
                  <tr
                    key={category.id}
                    className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <td className="p-3.5 pl-5">
                      <div className="font-bold text-zinc-900 dark:text-white">
                        {category.title}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500">{category.name}</div>
                    </td>
                    <td className="max-w-md p-3.5 text-zinc-600 dark:text-zinc-300">
                      {category.description ? (
                        <p className="line-clamp-2">{category.description}</p>
                      ) : (
                        <span className="text-zinc-400">Tanpa deskripsi</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {category.sortOrder}
                    </td>
                    <td className="p-3.5 text-zinc-600 dark:text-zinc-300">
                      {category.packageCount} paket · {category.addOnCount} add-on
                    </td>
                    <td className="p-3.5 pr-5">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDialog({ item: category })}
                          className="h-8 gap-1 border-zinc-300 bg-white text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <Edit className="size-3.5 text-amber-500" />
                          Edit
                        </Button>
                        <CmsDeleteDialog
                          title={category.title}
                          entityLabel="kategori"
                          description={
                            category.packageCount > 0 ? (
                              <>
                                Kategori{' '}
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  “{category.title}”
                                </span>{' '}
                                masih dipakai {category.packageCount} paket, jadi belum bisa
                                dihapus. Pindahkan paketnya ke kategori lain dulu.
                              </>
                            ) : (
                              <>
                                Kategori{' '}
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  “{category.title}”
                                </span>{' '}
                                dihapus.
                                {category.addOnCount > 0 &&
                                  ` ${category.addOnCount} add-on berhenti ditawarkan untuk kategori ini.`}
                              </>
                            )
                          }
                          isPending={remove.isPending}
                          onConfirm={() => remove.mutate(category.id)}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              aria-label={`Hapus kategori ${category.title}`}
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
        <CategoryDialog
          key={dialog.item?.id ?? 'new'}
          item={dialog.item}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </div>
  );
}
