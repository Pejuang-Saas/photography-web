'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/lib/admin-context';
import {
  Bell,
  Search,
  Plus,
  Menu,
  Calendar,
  CreditCard,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import AdminSidebar from './sidebar';
import { ThemeToggle } from '@/components/theme-toggle';

interface AdminTopbarProps {
  onOpenNewBooking?: () => void;
}

export default function AdminTopbar({ onOpenNewBooking }: AdminTopbarProps) {
  const pathname = usePathname();
  const { notifications, unreadCount, markAllNotificationsRead, setSelectedBooking, bookings } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');

  const getPageTitle = () => {
    if (pathname === '/admin') return 'Dashboard Overview';
    if (pathname.startsWith('/admin/bookings')) return 'Manajemen Reservasi & Verifikasi';
    if (pathname.startsWith('/admin/calendar')) return 'Kalender Jadwal Studio';
    if (pathname.startsWith('/admin/invoices')) return 'Invoice & Pembayaran';
    if (pathname.startsWith('/admin/packages')) return 'Paket Layanan';
    if (pathname.startsWith('/admin/settings')) return 'Pengaturan & Integrasi Sistem';
    return 'Admin Dashboard';
  };

  const handleNotificationClick = (bookingId?: string) => {
    if (bookingId) {
      const found = bookings.find((b) => b.id === bookingId);
      if (found) {
        setSelectedBooking(found);
      }
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 px-4 sm:px-6 backdrop-blur-md transition-colors duration-150">
      {/* Left: Mobile Menu Trigger + Title */}
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden size-8 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                <Menu className="size-4" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 w-64">
            <AdminSidebar />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 hidden sm:inline">Kayastory /</span>
          <h1 className="text-sm font-bold text-zinc-900 dark:text-white">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Search + Notifications + Theme Toggle + Action */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <div className="relative hidden md:block w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 dark:text-zinc-500" />
          <Input
            placeholder="Cari data booking..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 rounded-xl border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 pl-9 pr-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:border-amber-500"
          />
        </div>

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="relative size-8 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent
            align="end"
            className="w-80 sm:w-96 rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-zinc-900 dark:text-white">Notifikasi Studio</span>
                {unreadCount > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    {unreadCount} Baru
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  Tandai Dibaca
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60 p-1.5">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  Tidak ada notifikasi baru.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n.bookingId)}
                    className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      n.read
                        ? 'hover:bg-zinc-50 dark:hover:bg-zinc-900/50 opacity-60'
                        : 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]'
                    }`}
                  >
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {n.type === 'PAYMENT_PROOF' && <CreditCard className="size-3.5" />}
                      {n.type === 'BOOKING_NEW' && <Calendar className="size-3.5" />}
                      {n.type === 'SYSTEM' && <MessageSquare className="size-3.5" />}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{n.title}</span>
                        <span className="text-[10px] text-zinc-400">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Quick Add Booking Action */}
        <Button
          onClick={onOpenNewBooking}
          size="sm"
          className="h-9 gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20"
        >
          <Plus className="size-3.5" />
          <span className="hidden sm:inline">Tambah Booking</span>
        </Button>
      </div>
    </header>
  );
}
