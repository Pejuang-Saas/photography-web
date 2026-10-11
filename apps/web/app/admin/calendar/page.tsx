'use client';

import React, { useMemo, useState } from 'react';
import type { AdminBooking } from '@/lib/admin-api';
import { useAdmin } from '@/lib/admin-context';
import { errorMessage, useAdminBookings } from '@/lib/admin-queries';
import { bookingBadge, SLOT_HOLDING_STATUSES } from '@/lib/booking-status';
import { formatRupiah, todayWib, toDay, whatsappLink } from '@/lib/format';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { QueryError } from '../components/query-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function CalendarSchedulePage() {
  const { setSelectedBooking } = useAdmin();
  const bookingsQuery = useAdminBookings();
  const today = todayWib();
  const [currentYear, setCurrentYear] = useState(Number(today.slice(0, 4)));
  const [currentMonth, setCurrentMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [selectedDateStr, setSelectedDateStr] = useState(today);

  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(Number(today.slice(0, 4)));
    setCurrentMonth(Number(today.slice(5, 7)) - 1);
    setSelectedDateStr(today);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyLeadingDays = Array.from({ length: (firstDayOfWeek + 6) % 7 }, (_, i) => i);

  const bookingsByDay = useMemo(() => {
    const byDay = new Map<string, AdminBooking[]>();
    for (const booking of bookingsQuery.data ?? []) {
      if (!SLOT_HOLDING_STATUSES.has(booking.status)) continue;
      const day = toDay(booking.sessionDate);
      byDay.set(day, [...(byDay.get(day) ?? []), booking]);
    }
    for (const list of byDay.values()) list.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
    return byDay;
  }, [bookingsQuery.data]);

  const selectedDayBookings = bookingsByDay.get(selectedDateStr) ?? [];

  return (
    <div className="space-y-6">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Kalender Jadwal
            </h1>
            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
              {monthNames[currentMonth]} {currentYear}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Slot sesi foto yang terkunci atau menunggu pembayaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-300/80 dark:border-zinc-800 p-1 rounded-xl">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
              className="size-7 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToday}
              className="h-7 px-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-white dark:hover:bg-zinc-800 rounded-md"
            >
              Hari Ini
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
              className="size-7 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white px-2">
            {monthNames[currentMonth]} {currentYear}
          </span>
        </div>
      </div>

      {bookingsQuery.isError && (
        <QueryError
          title="Jadwal tidak dapat dimuat"
          message={errorMessage(bookingsQuery.error)}
          retry={() => bookingsQuery.refetch()}
        />
      )}

      {/* Main Grid: Calendar (8 cols) + Selected Day (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Matrix */}
        <Card className="lg:col-span-8 rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 p-4 shadow-sm">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-zinc-400 dark:text-zinc-500 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
            <div>SEN</div>
            <div>SEL</div>
            <div>RAB</div>
            <div>KAM</div>
            <div>JUM</div>
            <div className="text-amber-600 dark:text-amber-400">SAB</div>
            <div className="text-amber-600 dark:text-amber-400">MIN</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 pt-2.5">
            {emptyLeadingDays.map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="min-h-[92px] rounded-xl bg-zinc-50 dark:bg-zinc-950/40 p-1.5 opacity-40"
              />
            ))}

            {daysArray.map((day) => {
              const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = selectedDateStr === dayStr;
              const isToday = dayStr === today;

              const dayEvents = bookingsByDay.get(dayStr) ?? [];

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDateStr(dayStr)}
                  className={`min-h-[94px] rounded-xl p-2 transition-all cursor-pointer border ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/[0.08] shadow-md shadow-amber-500/10'
                      : 'border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isToday
                          ? 'flex size-5 items-center justify-center rounded-full bg-amber-500 text-zinc-950 font-extrabold shadow-xs'
                          : isSelected
                            ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                            : 'text-zinc-700 dark:text-zinc-400'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded-full">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Event Badges List */}
                  <div className="mt-1.5 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBooking(event);
                        }}
                        className="truncate rounded px-1.5 py-0.5 text-[9px] font-bold border border-amber-500/30 bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition-colors"
                      >
                        {event.timeSlot.split(' - ')[0]} {event.customerName.split(' ')[0]}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[8px] text-zinc-500 text-center font-mono font-bold pt-0.5">
                        +{dayEvents.length - 2} sesi lagi
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Selected Day Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Agenda Tanggal
                </span>
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                  {selectedDateStr}
                </h3>
              </div>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold">
                {selectedDayBookings.length} Sesi Terjadwal
              </Badge>
            </div>

            {selectedDayBookings.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
                <CalendarIcon className="size-8 text-zinc-400 dark:text-zinc-600 mx-auto" />
                <p className="font-medium">Tidak ada jadwal pemotretan pada tanggal ini.</p>
                <p className="text-[11px] text-zinc-400">
                  Slot kosong tersedia untuk booking baru.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayBookings.map((bk) => {
                  const waLink = whatsappLink(bk.customerPhone, `Halo kak ${bk.customerName}`);
                  const badge = bookingBadge(bk);

                  return (
                    <div
                      key={bk.id}
                      onClick={() => setSelectedBooking(bk)}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 space-y-2.5 hover:border-amber-500/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-all cursor-pointer shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-white text-xs">
                            {bk.customerName}
                          </div>
                          <div className="text-[11px] text-zinc-500">{bk.packageName}</div>
                        </div>
                        <Badge className={`${badge.className} text-[10px] font-bold`}>
                          {badge.label}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-xs border-t border-zinc-200 dark:border-zinc-800 pt-2 text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono font-bold">
                          <Clock className="size-3.5" />
                          <span>{bk.timeSlot} WIB</span>
                        </div>
                      </div>

                      <div
                        className="flex items-center justify-between pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                          {formatRupiah(bk.totalAmount)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBooking(bk)}
                            className="h-7 px-2 text-[10px] text-zinc-700 dark:text-zinc-300"
                          >
                            <Eye className="size-3 mr-1" />
                            Detail
                          </Button>
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-sm"
                          >
                            <MessageCircle className="size-3" />
                            WA
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
