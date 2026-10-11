'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAdmin } from '@/lib/admin-context';
import { errorMessage, useAdminBookings } from '@/lib/admin-queries';
import { monthlyTrend, monthSummary, packageBreakdown } from '@/lib/admin-stats';
import { bookingBadge } from '@/lib/booking-status';
import { formatDay, formatRupiah } from '@/lib/format';
import { QueryError } from './components/query-state';
import StatCard from './components/stat-card';
import { CustomerGrowthChart } from './components/customer-growth-chart';
import { PackageBreakdownChart } from './components/package-breakdown-chart';
import { Banknote, CalendarCheck, Clock, ArrowUpRight, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AdminDashboardPage() {
  const { setSelectedBooking } = useAdmin();
  const bookingsQuery = useAdminBookings();
  const bookings = useMemo(() => bookingsQuery.data ?? [], [bookingsQuery.data]);

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING_VERIFICATION');
  const unpaidCount = bookings.filter((b) => b.status === 'PENDING_PAYMENT').length;
  const summary = useMemo(() => monthSummary(bookings), [bookings]);
  const trend = useMemo(() => monthlyTrend(bookings, 6), [bookings]);
  const packages = useMemo(() => packageBreakdown(bookings), [bookings]);

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col gap-4 border-b border-zinc-200/80 pb-5 dark:border-zinc-800/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
              Halo, Admin 👋
            </h1>
            <Badge className="border-emerald-500/20 bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Live Data
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Ringkasan performa reservasi dan aktivitas studio terbaru.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/calendar">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <CalendarCheck className="size-3.5 mr-1.5 text-amber-500" />
              Kalender Studio
            </Button>
          </Link>
          <Link href="/admin/bookings">
            <Button
              size="sm"
              className="h-9 bg-amber-500 text-xs font-bold text-zinc-950 shadow-sm shadow-amber-500/20 hover:bg-amber-600"
            >
              <Clock className="size-3.5 mr-1.5" />
              Verifikasi ({pendingBookings.length})
            </Button>
          </Link>
        </div>
      </div>

      {bookingsQuery.isError && (
        <QueryError
          title="Data dashboard tidak dapat dimuat"
          message={errorMessage(bookingsQuery.error)}
          retry={() => bookingsQuery.refetch()}
        />
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pendapatan Bulan Ini"
          value={formatRupiah(summary.revenue)}
          subtitle="Pembayaran terverifikasi (DP & pelunasan)"
          change={summary.revenueChange ?? '—'}
          isPositive={!summary.revenueChange?.startsWith('-')}
          icon={Banknote}
          variant="emerald"
        />
        <StatCard
          title="Reservasi Bulan Ini"
          value={`${summary.bookings} Sesi`}
          subtitle="Dibuat bulan berjalan"
          change={summary.bookingsChange ?? '—'}
          isPositive={!summary.bookingsChange?.startsWith('-')}
          icon={CalendarCheck}
          variant="indigo"
        />
        <StatCard
          title="Menunggu Verifikasi"
          value={`${pendingBookings.length} Klien`}
          subtitle="Bukti transfer terunggah"
          change={pendingBookings.length > 0 ? 'Perlu tindakan' : 'Semua beres'}
          isPositive={pendingBookings.length === 0}
          icon={Clock}
          variant="rose"
        />
        <StatCard
          title="Belum Dibayar"
          value={`${unpaidCount} Klien`}
          subtitle="Slot ditahan sementara"
          change={unpaidCount > 0 ? 'Menunggu pembayaran' : 'Tidak ada'}
          isPositive={unpaidCount === 0}
          icon={Wallet}
          variant="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <CustomerGrowthChart data={trend} />
        </div>
        <div className="lg:col-span-4">
          <PackageBreakdownChart data={packages} />
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="rounded-lg border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <CardTitle className="text-sm font-bold text-zinc-900 dark:text-white">
                Reservasi Terkini
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Aktivitas booking terbaru klien
              </CardDescription>
            </div>
            <Link
              href="/admin/bookings"
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 transition-colors"
            >
              Lihat Semua ({bookings.length})
              <ArrowUpRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="p-3 pl-4 font-semibold">Klien</th>
                    <th className="p-3 font-semibold">Paket & Jadwal</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 pr-4 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {bookings.slice(0, 5).map((booking) => (
                    <tr
                      key={booking.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="p-3 pl-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">
                          {booking.customerName}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-[150px]">
                          {booking.customerPhone}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-zinc-800 dark:text-zinc-300 font-medium">
                          {booking.packageName}
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          {formatDay(booking.sessionDate)} • {booking.timeSlot}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={`${bookingBadge(booking).className} text-[10px] font-semibold`}
                        >
                          {bookingBadge(booking).label}
                        </Badge>
                      </td>
                      <td className="p-3 pr-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                          }}
                          className="h-7 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold"
                        >
                          Detail ↗
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
