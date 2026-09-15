'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/lib/admin-context';
import { formatRupiah } from '@/lib/mock-data';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Camera,
  MessageCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CalendarSchedulePage() {
  const { bookings, setSelectedBooking } = useAdmin();
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(7); // August (0-indexed 7)
  const [selectedDateStr, setSelectedDateStr] = useState('2026-08-25');
  const [selectedPhotographer, setSelectedPhotographer] = useState('ALL');

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
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
    setCurrentYear(2026);
    setCurrentMonth(7);
    setSelectedDateStr('2026-08-25');
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyLeadingDays = Array.from({ length: (firstDayOfWeek + 6) % 7 }, (_, i) => i);

  const filteredBookings = bookings.filter((b) => {
    if (selectedPhotographer !== 'ALL' && !b.photographer.includes(selectedPhotographer)) {
      return false;
    }
    return true;
  });

  const selectedDayBookings = filteredBookings.filter((b) => b.sessionDate === selectedDateStr);

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
              Agustus 2026
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Jadwal sesi foto wisuda studio & outdoor terintegrasi kalender.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={selectedPhotographer} onValueChange={(val) => val && setSelectedPhotographer(val)}>
            <SelectTrigger className="h-9 w-44 rounded-xl border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200">
              <SelectValue placeholder="Semua Fotografer" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs">
              <SelectItem value="ALL">Semua Fotografer</SelectItem>
              <SelectItem value="Bima">Bima Satria</SelectItem>
              <SelectItem value="Rian">Rian Maulana</SelectItem>
              <SelectItem value="Arif">Arif Wicaksono</SelectItem>
            </SelectContent>
          </Select>

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
              const isToday = dayStr === '2026-08-25';

              const dayEvents = filteredBookings.filter((b) => b.sessionDate === dayStr);

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
                <p className="text-[11px] text-zinc-400">Slot kosong tersedia untuk booking baru.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayBookings.map((bk) => {
                  const waLink = `https://wa.me/${bk.customerPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}?text=Halo%20kak%20${encodeURIComponent(bk.customerName)}`;

                  return (
                    <div
                      key={bk.id}
                      onClick={() => setSelectedBooking(bk)}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3.5 space-y-2.5 hover:border-amber-500/40 hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-all cursor-pointer shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-zinc-900 dark:text-white text-xs">{bk.customerName}</div>
                          <div className="text-[11px] text-zinc-500">{bk.packageName}</div>
                        </div>
                        <Badge
                          className={`text-[10px] font-bold ${
                            bk.status === 'CONFIRMED'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {bk.status === 'CONFIRMED' ? 'Terkunci' : 'Pending'}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 text-xs border-t border-zinc-200 dark:border-zinc-800 pt-2 text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono font-bold">
                          <Clock className="size-3.5" />
                          <span>{bk.timeSlot} WIB</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{bk.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Camera className="size-3.5 text-zinc-400 shrink-0" />
                          <span>{bk.photographer}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                          {formatRupiah(bk.totalPrice)}
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
