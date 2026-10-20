'use client';

import React, { useMemo, useState } from 'react';
import { errorMessage, useAdminBookings, useAdminPackages } from '@/lib/admin-queries';
import type { ServicePackage } from '@/lib/booking-api';
import { packageLines } from '@/lib/package-details';
import { formatRupiah } from '@/lib/format';
import { Plus, Edit, Check, Camera, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { QueryError, QueryLoading } from '../components/query-state';
import PackageDialog from './package-dialog';

export default function PackagesManagementPage() {
  const packagesQuery = useAdminPackages();
  const bookingsQuery = useAdminBookings();
  const [dialog, setDialog] = useState<{ item?: ServicePackage } | null>(null);

  const bookingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const booking of bookingsQuery.data ?? []) {
      if (['REJECTED', 'EXPIRED', 'CANCELLED'].includes(booking.status)) continue;
      counts.set(booking.packageId, (counts.get(booking.packageId) ?? 0) + 1);
    }
    return counts;
  }, [bookingsQuery.data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Paket Layanan & Harga
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Kelola paket photoshoot wisuda, durasi pemotretan, dan kuota master edit.
          </p>
        </div>

        <Button
          onClick={() => setDialog({})}
          size="sm"
          className="h-9 gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20"
        >
          <Plus className="size-3.5" />
          Tambah Paket Foto
        </Button>
      </div>

      {packagesQuery.isLoading && <QueryLoading rows={3} />}
      {packagesQuery.isError && (
        <QueryError
          title="Paket tidak dapat dimuat"
          message={errorMessage(packagesQuery.error)}
          retry={() => packagesQuery.refetch()}
        />
      )}

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {(packagesQuery.data ?? []).map((pkg) => {
          const features = packageLines(pkg);
          return (
            <Card
              key={pkg.id}
              className={`rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group hover:border-amber-500/40 ${
                pkg.isActive ? '' : 'opacity-60'
              }`}
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      {pkg.category && (
                        <Badge className="text-[10px] font-bold uppercase tracking-wider border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                          {pkg.category}
                        </Badge>
                      )}
                      {!pkg.isActive && (
                        <Badge className="text-[10px] font-bold border bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20">
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {pkg.name}
                    </h3>
                  </div>
                  <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Camera className="size-4.5" />
                  </div>
                </div>

                <div>
                  <span className="font-mono text-xl font-extrabold text-zinc-900 dark:text-white">
                    {formatRupiah(pkg.price)}
                  </span>
                  <span className="text-xs text-zinc-500"> / sesi foto</span>
                </div>

                <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3 text-xs text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-amber-500" />
                    <span>
                      Durasi: <strong>{pkg.durationMinutes} Menit</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-3.5 text-indigo-500" />
                    <span>
                      Maksimal: <strong>{pkg.maxPeople} Orang</strong>
                    </span>
                  </div>
                  {features.slice(0, 4).map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  {features.length > 4 && (
                    <p className="pl-5 text-[11px] text-zinc-500">
                      +{features.length - 4} fasilitas lain
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3 flex items-center justify-between text-xs bg-zinc-50/50 dark:bg-zinc-950/40 rounded-b-xl">
                <span className="text-zinc-500 font-mono text-[11px]">
                  {bookingCounts.get(pkg.id) ?? 0}x dipesan klien
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialog({ item: pkg })}
                  className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold px-2.5"
                >
                  <Edit className="size-3 mr-1" />
                  Edit
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {dialog && (
        <PackageDialog
          key={dialog.item?.id ?? 'new'}
          item={dialog.item}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </div>
  );
}
