'use client';

import React, { useState, useMemo } from 'react';
import { useAdmin } from '@/lib/admin-context';
import { formatRupiah } from '@/lib/mock-data';
import {
  Search,
  Clock,
  Calendar,
  Download,
  CreditCard,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';

export default function BookingsManagementPage() {
  const { bookings, setSelectedBooking } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('ALL');

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (activeTab === 'PENDING' && b.status !== 'PENDING_VERIFICATION') return false;
      if (activeTab === 'CONFIRMED' && b.status !== 'CONFIRMED') return false;
      if (activeTab === 'COMPLETED' && b.status !== 'COMPLETED') return false;

      if (selectedUniversity !== 'ALL' && !b.university.includes(selectedUniversity)) {
        return false;
      }

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchName = b.customerName.toLowerCase().includes(query);
        const matchCode = b.bookingCode.toLowerCase().includes(query);
        const matchPhone = b.customerPhone.includes(query);
        const matchUniv = b.university.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchPhone && !matchUniv) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, activeTab, selectedUniversity, searchQuery]);

  const pendingCount = bookings.filter((b) => b.status === 'PENDING_VERIFICATION').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Manajemen Reservasi
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Daftar reservasi pemotretan wisuda dan verifikasi bukti transfer klien.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const csvContent =
              'Kode,Nama,Telepon,Universitas,Paket,Total,Tanggal,Status\n' +
              filteredBookings
                .map(
                  (b) =>
                    `"${b.bookingCode}","${b.customerName}","${b.customerPhone}","${b.university}","${b.packageName}",${b.totalPrice},"${b.sessionDate}","${b.status}"`
                )
                .join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `kayastory-reservasi.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="h-9 gap-1.5 border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Download className="size-3.5 text-amber-500" />
          Ekspor CSV
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
          <TabsList className="bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800 p-1 rounded-xl h-10 flex items-center gap-1">
            <TabsTrigger
              value="ALL"
              className="text-xs px-3.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white data-active:bg-white dark:data-active:bg-zinc-800 data-active:text-zinc-950 dark:data-active:text-white font-semibold data-active:shadow-sm transition-all"
            >
              Semua ({bookings.length})
            </TabsTrigger>
            <TabsTrigger
              value="PENDING"
              className="text-xs px-3.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white data-active:bg-white dark:data-active:bg-zinc-800 data-active:text-amber-600 dark:data-active:text-amber-400 font-semibold data-active:shadow-sm transition-all"
            >
              Menunggu Verifikasi ({pendingCount})
            </TabsTrigger>
            <TabsTrigger
              value="CONFIRMED"
              className="text-xs px-3.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white data-active:bg-white dark:data-active:bg-zinc-800 data-active:text-emerald-600 dark:data-active:text-emerald-400 font-semibold data-active:shadow-sm transition-all"
            >
              Dikonfirmasi
            </TabsTrigger>
            <TabsTrigger
              value="COMPLETED"
              className="text-xs px-3.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white data-active:bg-white dark:data-active:bg-zinc-800 data-active:text-indigo-600 dark:data-active:text-indigo-400 font-semibold data-active:shadow-sm transition-all"
            >
              Selesai
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search & Select */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 dark:text-zinc-500" />
            <Input
              placeholder="Cari klien, telp, kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-xl border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            />
          </div>

          <Select value={selectedUniversity} onValueChange={(val) => val && setSelectedUniversity(val)}>
            <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200">
              <SelectValue placeholder="Semua Kampus" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs">
              <SelectItem value="ALL">Semua Kampus</SelectItem>
              <SelectItem value="Undip">Undip</SelectItem>
              <SelectItem value="Unnes">Unnes</SelectItem>
              <SelectItem value="Udinus">Udinus</SelectItem>
              <SelectItem value="Polines">Polines</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table */}
      <Card className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="p-3.5 pl-5 font-semibold">Kode & Klien</th>
                <th className="p-3.5 font-semibold">Universitas</th>
                <th className="p-3.5 font-semibold">Paket & Total</th>
                <th className="p-3.5 font-semibold">Jadwal Sesi</th>
                <th className="p-3.5 font-semibold">Status Pembayaran</th>
                <th className="p-3.5 pr-5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Tidak ditemukan data reservasi yang cocok.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const waLink = `https://wa.me/${booking.customerPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=Halo%20kak%20${encodeURIComponent(booking.customerName)}`;

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <td className="p-3.5 pl-5">
                        <div className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          {booking.bookingCode}
                        </div>
                        <div className="font-bold text-zinc-900 dark:text-white text-sm">{booking.customerName}</div>
                        <div className="font-mono text-[11px] text-zinc-500">
                          {booking.customerPhone}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-zinc-900 dark:text-zinc-200 font-medium">{booking.university}</div>
                        {booking.faculty && (
                          <div className="text-[11px] text-zinc-500">{booking.faculty}</div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="text-zinc-800 dark:text-zinc-300 font-medium">{booking.packageName}</div>
                        <div className="font-mono font-bold text-zinc-900 dark:text-white text-xs">
                          {formatRupiah(booking.totalPrice)}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-300 font-medium">
                          <Calendar className="size-3.5 text-amber-500" />
                          {booking.sessionDate}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-500 pl-5">
                          {booking.timeSlot} WIB
                        </div>
                      </td>

                      <td className="p-3.5">
                        {booking.status === 'PENDING_VERIFICATION' ? (
                          <div className="space-y-1">
                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold gap-1 animate-pulse">
                              <Clock className="size-3" /> Verifikasi Struk
                            </Badge>
                            <div className="text-[10px] font-mono text-zinc-500">
                              {booking.paymentBank}
                            </div>
                          </div>
                        ) : booking.paymentStatus === 'PAID_FULL' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            Lunas ({formatRupiah(booking.totalPrice)})
                          </Badge>
                        ) : (
                          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
                            DP Terverifikasi
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="size-4" />
                          </a>

                          {booking.status === 'PENDING_VERIFICATION' ? (
                            <Button
                              size="sm"
                              onClick={() => setSelectedBooking(booking)}
                              className="h-8 px-3 rounded-lg bg-amber-500 text-xs font-bold text-zinc-950 hover:bg-amber-600 shadow-sm"
                            >
                              Verifikasi
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedBooking(booking)}
                              className="h-8 px-3 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <Eye className="size-3.5 mr-1" />
                              Detail
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
