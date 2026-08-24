'use client';

import React from 'react';
import Link from 'next/link';
import { useAdmin } from '@/lib/admin-context';
import { formatRupiah } from '@/lib/mock-data';
import StatCard from './components/stat-card';
import { CustomerGrowthChart } from './components/customer-growth-chart';
import { CampusAnalyticsChart } from './components/campus-analytics-chart';
import { PackageBreakdownChart } from './components/package-breakdown-chart';
import {
  Banknote,
  CalendarCheck,
  Clock,
  ArrowUpRight,
  Camera,
  Eye,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AdminDashboardPage() {
  const { bookings, setSelectedBooking } = useAdmin();

  const pendingBookings = bookings.filter((b) => b.status === 'PENDING_VERIFICATION');
  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === 'PAID_FULL' || b.paymentStatus === 'PAID_DP')
    .reduce((acc, curr) => acc + (curr.paymentAmount || curr.totalPrice), 0);

  const totalBookingCount = bookings.length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Dashboard Analytics
            </h1>
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
              Live Data
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Analitik reservasi customer, tren pendapatan studio, dan jadwal pemotretan.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/admin/calendar">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <CalendarCheck className="size-3.5 mr-1.5 text-amber-500" />
              Kalender Studio
            </Button>
          </Link>
          <Link href="/admin/bookings">
            <Button
              size="sm"
              className="h-9 bg-amber-500 hover:bg-amber-600 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20"
            >
              <Clock className="size-3.5 mr-1.5" />
              Verifikasi ({pendingBookings.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pendapatan"
          value={formatRupiah(totalRevenue + 24500000)}
          subtitle="Bulan ini (DP & Pelunasan)"
          change="+18.4%"
          isPositive={true}
          icon={Banknote}
          variant="emerald"
        />
        <StatCard
          title="Total Booking"
          value={`${totalBookingCount + 36} Sesi`}
          subtitle="Bulan ini"
          change="+14.2%"
          isPositive={true}
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
          title="Slot Terisi"
          value="82%"
          subtitle="Agustus 2026 (Semarang)"
          change="+5.0%"
          isPositive={true}
          icon={Camera}
          variant="amber"
        />
      </div>

      {/* Action Required Banner */}
      {pendingBookings.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertCircle className="size-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                {pendingBookings.length} Bukti Transfer Perlu Diverifikasi
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Konfirmasi pembayaran untuk mengunci slot jadwal dan otomatis mengirim invoice resmi ke WhatsApp klien.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingBookings.slice(0, 2).map((bk) => (
              <Button
                key={bk.id}
                size="sm"
                onClick={() => setSelectedBooking(bk)}
                className="h-8 text-xs bg-amber-500 text-zinc-950 font-bold hover:bg-amber-600 shadow-sm"
              >
                <Eye className="size-3.5 mr-1" />
                Review {bk.customerName.split(' ')[0]}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Main Charts Section (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Customer Growth & Revenue Chart (8 cols) */}
        <div className="lg:col-span-8">
          <CustomerGrowthChart />
        </div>

        {/* Right: Package Breakdown Donut Chart (4 cols) */}
        <div className="lg:col-span-4">
          <PackageBreakdownChart />
        </div>
      </div>

      {/* Second Row: Campus Distribution Chart & Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Campus Distribution Bar Chart (5 cols) */}
        <div className="lg:col-span-5">
          <CampusAnalyticsChart />
        </div>

        {/* Right: Recent Bookings Table (7 cols) */}
        <Card className="lg:col-span-7 rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 shadow-sm">
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
                    <th className="p-3 pl-4 font-semibold">Klien & Kampus</th>
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
                        <div className="font-semibold text-zinc-900 dark:text-white">{booking.customerName}</div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-[150px]">
                          {booking.university}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-zinc-800 dark:text-zinc-300 font-medium">{booking.packageName}</div>
                        <div className="text-[11px] font-mono text-zinc-500">
                          {booking.sessionDate} • {booking.timeSlot}
                        </div>
                      </td>
                      <td className="p-3">
                        {booking.status === 'PENDING_VERIFICATION' ? (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                            Pending Verifikasi
                          </Badge>
                        ) : booking.status === 'CONFIRMED' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            Dikonfirmasi
                          </Badge>
                        ) : (
                          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-semibold">
                            Selesai
                          </Badge>
                        )}
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
