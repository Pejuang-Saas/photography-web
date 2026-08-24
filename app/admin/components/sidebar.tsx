'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/lib/admin-context';
import {
  LayoutDashboard,
  CalendarDays,
  FileCheck2,
  Receipt,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Camera,
  Settings2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { bookings } = useAdmin();

  const pendingCount = bookings.filter(
    (b) => b.status === 'PENDING_VERIFICATION' || b.paymentStatus === 'WAITING_CONFIRMATION'
  ).length;

  const navItems = [
    {
      title: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: 'Reservasi & Verifikasi',
      href: '/admin/bookings',
      icon: FileCheck2,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-amber-500 text-zinc-950',
    },
    {
      title: 'Kalender Jadwal',
      href: '/admin/calendar',
      icon: CalendarDays,
    },
    {
      title: 'Invoice & Pembayaran',
      href: '/admin/invoices',
      icon: Receipt,
    },
    {
      title: 'Paket & Layanan',
      href: '/admin/packages',
      icon: Layers,
    },
    {
      title: 'Pengaturan & Integrasi',
      href: '/admin/settings',
      icon: Settings2,
    },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 lg:flex transition-colors duration-150">
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800/80 px-5">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-zinc-950 font-extrabold text-xs shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform">
            K
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 dark:text-white">
              Kayastory
            </span>
            <Badge className="h-4.5 px-1.5 text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              Studio
            </Badge>
          </div>
        </Link>

        <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
          Menu Studio
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/70 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'size-4 transition-colors',
                      isActive
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300'
                    )}
                  />
                  <span>{item.title}</span>
                </div>

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={cn(
                      'flex h-5 items-center justify-center rounded-full px-1.5 text-[10px] font-mono font-extrabold',
                      item.badgeColor || 'bg-amber-500 text-zinc-950'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* WhatsApp Gateway Status Card */}
        <div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3.5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span>WA Gateway Terhubung</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            Notifikasi invoice & jadwal otomatis dikirim via WhatsApp.
          </p>
        </div>
      </div>

      {/* Footer Profile & Website Link */}
      <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 p-3 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <ArrowUpRight className="size-3.5 text-amber-500" />
            Buka Web Publik
          </span>
          <span className="font-mono text-[10px] text-zinc-400">kayastory.id ↗</span>
        </Link>

        <div className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 shadow-2xs">
          <Avatar className="size-7 border border-amber-500/30">
            <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" />
            <AvatarFallback className="bg-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300">
              KS
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-xs font-bold text-zinc-900 dark:text-white">Bima Satria</span>
            <span className="truncate text-[10px] text-zinc-500">Studio Owner</span>
          </div>
          <ShieldCheck className="size-3.5 text-amber-500 shrink-0" />
        </div>
      </div>
    </aside>
  );
}
