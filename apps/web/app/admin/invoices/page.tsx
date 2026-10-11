'use client';

import React, { useMemo, useState } from 'react';
import { useAdmin } from '@/lib/admin-context';
import { errorMessage, useAdminBookings } from '@/lib/admin-queries';
import { bookingBadge, PAID_PAYMENT_STATUSES } from '@/lib/booking-status';
import { formatDay, formatRupiah, whatsappLink } from '@/lib/format';
import { FileText, Search, MessageCircle, Eye, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { QueryError } from '../components/query-state';

export default function InvoicesManagementPage() {
  const { setSelectedInvoice } = useAdmin();
  const bookingsQuery = useAdminBookings();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvoices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return (bookingsQuery.data ?? [])
      .filter((booking) => booking.invoice)
      .filter(
        (booking) =>
          !query ||
          booking.invoice!.invoiceNumber.toLowerCase().includes(query) ||
          booking.customerName.toLowerCase().includes(query) ||
          booking.bookingCode.toLowerCase().includes(query) ||
          booking.customerPhone.includes(query),
      );
  }, [bookingsQuery.data, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Invoice & Pembayaran
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Daftar invoice resmi Kayastory Photography dan log pengiriman WhatsApp ke customer.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400 dark:text-zinc-500" />
          <Input
            placeholder="Cari no. invoice, nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-9 pr-3 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
        </div>
      </div>

      {bookingsQuery.isError && (
        <QueryError
          title="Invoice tidak dapat dimuat"
          message={errorMessage(bookingsQuery.error)}
          retry={() => bookingsQuery.refetch()}
        />
      )}

      {/* Invoice Table */}
      <Card className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="p-3.5 pl-5 font-semibold">No. Invoice</th>
                <th className="p-3.5 font-semibold">Klien / Wisudawan</th>
                <th className="p-3.5 font-semibold">Paket & Jadwal</th>
                <th className="p-3.5 font-semibold">Nominal Tagihan</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 pr-5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    {bookingsQuery.isLoading
                      ? 'Memuat invoice...'
                      : 'Belum ada invoice yang terbit atau sesuai dengan pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((booking) => {
                  const invoice = booking.invoice!;
                  const paid = booking.payments
                    .filter((payment) => PAID_PAYMENT_STATUSES.has(payment.status))
                    .reduce((sum, payment) => sum + payment.amount, 0);
                  const badge = bookingBadge(booking);

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedInvoice(booking)}
                    >
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <FileText className="size-4" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                              {invoice.invoiceNumber}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              {formatDay(invoice.issuedAt)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-zinc-900 dark:text-white text-xs">
                          {booking.customerName}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {booking.customerPhone}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium">
                          {booking.packageName}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {formatDay(booking.sessionDate)} · {booking.timeSlot} WIB
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono font-bold text-zinc-900 dark:text-white text-xs">
                          {formatRupiah(booking.totalAmount)}
                        </div>
                        {paid > 0 && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            Telah Bayar: {formatRupiah(paid)}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <Badge className={`${badge.className} text-[10px] font-bold`}>
                          <CheckCircle2 className="size-3 mr-1" /> {badge.label}
                        </Badge>
                      </td>

                      <td className="p-3.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInvoice(booking)}
                            className="h-8 gap-1 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          >
                            <Eye className="size-3.5 text-amber-500" />
                            Pratinjau
                          </Button>

                          <a
                            href={whatsappLink(
                              booking.customerPhone,
                              `Halo kak ${booking.customerName}, berikut invoice ${invoice.invoiceNumber}.`,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                          >
                            <MessageCircle className="size-3.5" />
                            Chat WA
                          </a>
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
