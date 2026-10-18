'use client';

import Link from 'next/link';
import { CalendarDays, ExternalLink, FileText, MessageCircle, UserRound } from 'lucide-react';
import { useAdmin } from '@/lib/admin-context';
import type { CrmChat } from '@/lib/crm-api';
import { formatDateTime, formatDay } from '@/lib/format';
import { initialsOf } from '@/lib/crm-format';
import { bookingBadge } from '@/lib/booking-status';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import CategoryBadge from './category-badge';

function formatPhone(digits: string | null) {
  if (!digits) return 'Nomor belum diketahui';
  const match = digits.match(/^(62)(\d{3})(\d{4})(\d+)$/);
  return match ? `+${match[1]} ${match[2]}-${match[3]}-${match[4]}` : `+${digits}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <dt className="shrink-0 text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">{children}</dd>
    </div>
  );
}

export default function CrmCustomerDetail({ chat }: { chat: CrmChat }) {
  const { setSelectedInvoice } = useAdmin();
  const booking = chat.booking;
  const badge = booking ? bookingBadge(booking as Parameters<typeof bookingBadge>[0]) : null;

  return (
    <div className="space-y-6 overflow-y-auto p-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-zinc-200 text-lg font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {initialsOf(chat.displayName)}
        </span>
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">{chat.displayName}</h3>
          <p className="font-mono text-xs text-zinc-500">{formatPhone(chat.phone)}</p>
        </div>
        {chat.phone && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={
              <a href={`https://wa.me/${chat.phone}`} target="_blank" rel="noopener noreferrer" />
            }
          >
            <MessageCircle className="size-3.5" />
            Buka di WhatsApp
          </Button>
        )}
      </div>

      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
          <UserRound className="size-3.5" />
          Percakapan
        </h4>
        <dl className="space-y-2.5">
          <Row label="Kategori">
            {chat.category ? (
              <CategoryBadge name={chat.category.name} color={chat.category.color} />
            ) : (
              <span className="text-zinc-400">Belum ada</span>
            )}
          </Row>
          <Row label="Jendela 24 jam">
            <span
              className={cn(
                'font-semibold',
                chat.window.open
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {chat.window.open ? 'Aktif' : 'Berakhir'}
            </span>
          </Row>
          {chat.window.expiresAt && (
            <Row label={chat.window.open ? 'Berakhir pada' : 'Berakhir sejak'}>
              {formatDateTime(chat.window.expiresAt)}
            </Row>
          )}
          {chat.lastMessageAt && (
            <Row label="Pesan terakhir">{formatDateTime(chat.lastMessageAt)}</Row>
          )}
        </dl>
      </section>

      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
          <CalendarDays className="size-3.5" />
          Booking
        </h4>
        {booking && badge ? (
          <div className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                {booking.bookingCode}
              </span>
              <span
                className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', badge.className)}
              >
                {badge.label}
              </span>
            </div>
            <dl className="space-y-2.5">
              <Row label="Paket">{booking.packageName}</Row>
              <Row label="Tanggal">{formatDay(booking.sessionDate)}</Row>
              <Row label="Jam">{booking.timeSlot} WIB</Row>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setSelectedInvoice({ id: booking.id })}
              >
                <FileText className="size-3.5" />
                Lihat Invoice
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                nativeButton={false}
                render={<Link href="/admin/bookings" />}
              >
                <ExternalLink className="size-3.5" />
                Reservasi
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-xs text-zinc-500 dark:border-zinc-700">
            Nomor ini belum punya booking.
          </div>
        )}
      </section>
    </div>
  );
}
