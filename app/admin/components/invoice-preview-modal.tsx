'use client';

import React from 'react';
import { useAdmin } from '@/lib/admin-context';
import { formatRupiah } from '@/lib/mock-data';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Printer,
  Download,
  MessageCircle,
  QrCode,
} from 'lucide-react';
import { toast } from 'sonner';

export default function InvoicePreviewModal() {
  const { selectedInvoice, setSelectedInvoice } = useAdmin();

  if (!selectedInvoice) return null;

  const invoiceNumber = selectedInvoice.invoiceNumber || `INV-KYA-2026-${selectedInvoice.bookingCode.slice(-3)}`;

  const handleResendWA = () => {
    toast.success('Invoice Dikirim', {
      description: `Invoice ${invoiceNumber} dikirim ke WhatsApp ${selectedInvoice.customerName}.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    toast.success('Mengunduh Invoice PDF', {
      description: `Invoice ${invoiceNumber}.pdf berhasil disimpan.`,
    });
  };

  return (
    <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
      <DialogContent className="w-[95vw] max-w-3xl sm:max-w-3xl max-h-[92vh] overflow-y-auto border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-6 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Invoice:</span>
            <span className="font-mono text-xs font-bold text-zinc-900 dark:text-white">{invoiceNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Printer className="size-3.5" />
              Cetak
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="h-8 gap-1.5 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Download className="size-3.5" />
              Unduh PDF
            </Button>
            <Button
              size="sm"
              onClick={handleResendWA}
              className="h-8 gap-1.5 rounded-lg bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              <MessageCircle className="size-3.5" />
              Kirim ke WA
            </Button>
          </div>
        </div>

        {/* Invoice Sheet */}
        <div className="p-8 space-y-6 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 m-6 rounded-xl text-xs print:m-0 print:border-none shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-6">
            <div>
              <h2 className="font-bold text-zinc-900 dark:text-white text-base tracking-tight">KAYASTORY PHOTOGRAPHY</h2>
              <p className="text-zinc-500 text-xs mt-0.5">Spesialis Foto Wisuda & Kebaya Semarang</p>
              <p className="text-zinc-500 text-[11px]">Jl. Prof. Sudarto, Tembalang, Semarang | WA: 0812-3456-7890</p>
            </div>

            <div className="text-right">
              <Badge variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-[10px] font-semibold uppercase px-2 py-0.5">
                {selectedInvoice.paymentStatus === 'PAID_FULL' ? 'LUNAS' : 'DP 50%'}
              </Badge>
              <p className="font-mono text-zinc-700 dark:text-zinc-300 text-xs font-bold mt-2">{invoiceNumber}</p>
              <p className="text-zinc-500 text-[11px]">{selectedInvoice.createdAt}</p>
            </div>
          </div>

          {/* Client & Session Info */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">Ditagihkan Kepada:</span>
              <p className="font-bold text-zinc-900 dark:text-white text-sm">{selectedInvoice.customerName}</p>
              <p className="text-zinc-600 dark:text-zinc-400 font-mono">{selectedInvoice.customerPhone}</p>
              <p className="text-zinc-600 dark:text-zinc-400">{selectedInvoice.university}</p>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">Detail Pemotretan:</span>
              <p className="font-medium text-zinc-900 dark:text-white">Tanggal: {selectedInvoice.sessionDate}</p>
              <p className="text-zinc-800 dark:text-zinc-200 font-mono font-semibold">Pukul: {selectedInvoice.timeSlot} WIB</p>
              <p className="text-zinc-600 dark:text-zinc-400">Lokasi: {selectedInvoice.location}</p>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400">
                <tr>
                  <th className="p-3 pl-4 font-semibold">Deskripsi Layanan</th>
                  <th className="p-3 text-center font-semibold">Qty</th>
                  <th className="p-3 text-right pr-4 font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr>
                  <td className="p-3 pl-4">
                    <p className="font-semibold text-zinc-900 dark:text-white">{selectedInvoice.packageName}</p>
                    <p className="text-[11px] text-zinc-500">Sesi Foto + All RAW High-Res + Master Edit</p>
                  </td>
                  <td className="p-3 text-center text-zinc-600 dark:text-zinc-400">1 Sesi</td>
                  <td className="p-3 pr-4 text-right font-mono font-bold text-zinc-900 dark:text-white">{formatRupiah(selectedInvoice.packagePrice)}</td>
                </tr>
                {selectedInvoice.addons.map((addon) => (
                  <tr key={addon.id}>
                    <td className="p-3 pl-4 text-zinc-700 dark:text-zinc-300">+ Addon: {addon.name}</td>
                    <td className="p-3 text-center text-zinc-600 dark:text-zinc-400">1</td>
                    <td className="p-3 pr-4 text-right font-mono text-zinc-800 dark:text-zinc-200">{formatRupiah(addon.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3 text-zinc-500 text-xs">
              <QrCode className="size-8 text-zinc-700 dark:text-zinc-300" />
              <div>
                <p className="font-medium text-zinc-800 dark:text-zinc-200 text-[11px]">Validasi Digital Kayastory</p>
                <p className="font-mono text-[10px] text-zinc-500">{selectedInvoice.bookingCode}</p>
              </div>
            </div>

            <div className="w-full sm:w-56 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Total Tagihan:</span>
                <span className="font-mono text-zinc-900 dark:text-white font-bold text-sm">{formatRupiah(selectedInvoice.totalPrice)}</span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 pt-1">
                <span>Telah Dibayar:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold">{formatRupiah(selectedInvoice.paymentAmount || selectedInvoice.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
