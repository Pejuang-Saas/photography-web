'use client';

import React from 'react';
import { useAdmin } from '@/lib/admin-context';
import { formatRupiah } from '@/lib/mock-data';
import {
  Plus,
  Edit,
  Check,
  Camera,
  Clock,
  Users,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function PackagesManagementPage() {
  const { packages } = useAdmin();

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'Solo':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'Squad':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'Family':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'Cinematic':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20';
    }
  };

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
          onClick={() => toast.info('Fitur Tambah Paket akan terhubung ke database')}
          size="sm"
          className="h-9 gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs shadow-md shadow-amber-500/20"
        >
          <Plus className="size-3.5" />
          Tambah Paket Foto
        </Button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group hover:border-amber-500/40"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 border ${getCategoryBadge(pkg.category)}`}>
                    {pkg.category} Package
                  </Badge>
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

              {/* Package Specs */}
              <div className="space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-3 text-xs text-zinc-600 dark:text-zinc-300">
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5 text-amber-500" />
                  <span>Durasi: <strong>{pkg.durationMinutes} Menit</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-3.5 text-indigo-500" />
                  <span>Maksimal: <strong>{pkg.maxPeople} Orang</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="size-3.5 text-sky-500" />
                  <span>Master Edit: <strong>{pkg.editedPhotos} Foto High-Res</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-500" />
                  <span>Semua RAW File Diserahkan (Cloud Drive)</span>
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-3 flex items-center justify-between text-xs bg-zinc-50/50 dark:bg-zinc-950/40 rounded-b-xl">
              <span className="text-zinc-500 font-mono text-[11px]">
                {pkg.totalBookings}x dipesan klien
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toast.info(`Edit konfigurasi paket: ${pkg.name}`)}
                className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold px-2.5"
              >
                <Edit className="size-3 mr-1" />
                Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
