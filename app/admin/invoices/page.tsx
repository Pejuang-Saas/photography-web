'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/lib/admin-context';
import { formatRupiah } from '@/lib/mock-data';
import {
  FileText,
  Search,
  MessageCircle,
  Eye,
  CheckCircle2,
  Receipt,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function InvoicesManagementPage() {
  const { bookings, setSelectedInvoice } = useAdmin();
  const [searchQuery, setSearchQuery] = useState('');

  const invoiceList = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED' || b.invoiceNumber);

  const filteredInvoices = invoiceList.filter((inv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const invNum = (inv.invoiceNumber || '').toLowerCase();
    const name = inv.customerName.toLowerCase();
    const code = inv.bookingCode.toLowerCase();
    const phone = inv.customerPhone;
    return invNum.includes(query) || name.includes(query) || code.includes(query) || phone.includes(query);
  });

  const handleResendWA = (inv: (typeof bookings)[0]) => {
    toast.success('Invoice Berhasil Dikirim', {
      description: `Invoice ${inv.invoiceNumber || 'INV-KYA-2026'} dikirim ke WhatsApp ${inv.customerName} (${inv.customerPhone}).`,
    });
  };

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

      {/* Invoice Table */}
      <Card className="rounded-xl border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="p-3.5 pl-5 font-semibold">No. Invoice</th>
                <th className="p-3.5 font-semibold">Klien / Wisudawan</th>
                <th className="p-3.5 font-semibold">Paket & Lokasi</th>
                <th className="p-3.5 font-semibold">Nominal Tagihan</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 pr-5 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Belum ada invoice yang terbit atau sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const invoiceNum = inv.invoiceNumber || `INV-KYA-2026-${inv.bookingCode.slice(-3)}`;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      <td className="p-3.5 pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <FileText className="size-4" />
                          </div>
                          <div>
                            <div className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                              {invoiceNum}
                            </div>
                            <div className="text-[10px] text-zinc-500">{inv.sessionDate}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-zinc-900 dark:text-white text-xs">{inv.customerName}</div>
                        <div className="text-[11px] text-zinc-500 font-mono">{inv.customerPhone}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-zinc-800 dark:text-zinc-200 font-medium">{inv.packageName}</div>
                        <div className="text-[10px] text-zinc-500">{inv.location}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono font-bold text-zinc-900 dark:text-white text-xs">
                          {formatRupiah(inv.totalPrice)}
                        </div>
                        {inv.paymentAmount && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            Telah Bayar: {formatRupiah(inv.paymentAmount)}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        {inv.paymentStatus === 'PAID_FULL' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 className="size-3 mr-1" /> Lunas
                          </Badge>
                        ) : (
                          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
                            <CheckCircle2 className="size-3 mr-1" /> DP Terverifikasi
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInvoice(inv)}
                            className="h-8 gap-1 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          >
                            <Eye className="size-3.5 text-amber-500" />
                            Pratinjau
                          </Button>

                          <Button
                            size="sm"
                            onClick={() => handleResendWA(inv)}
                            className="h-8 gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm"
                          >
                            <MessageCircle className="size-3.5" />
                            Kirim WA
                          </Button>
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
