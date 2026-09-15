'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/lib/admin-context';
import { formatRupiah } from '@/lib/mock-data';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  User,
  MapPin,
  Camera,
  MessageCircle,
  FileText,
  CreditCard,
  ZoomIn,
} from 'lucide-react';

export default function BookingDetailModal() {
  const { selectedBooking, setSelectedBooking, verifyPayment, rejectPayment, setSelectedInvoice } = useAdmin();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isFullPayment, setIsFullPayment] = useState(true);
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (!selectedBooking) return null;

  const handleVerify = () => {
    const amount = customAmount > 0 ? customAmount : selectedBooking.totalPrice;
    verifyPayment(selectedBooking.id, amount, isFullPayment);
  };

  const handleReject = () => {
    if (!rejectReason) {
      setShowRejectInput(true);
      return;
    }
    rejectPayment(selectedBooking.id, rejectReason);
    setRejectReason('');
    setShowRejectInput(false);
  };

  const getStatusBadge = () => {
    switch (selectedBooking.status) {
      case 'PENDING_VERIFICATION':
        return (
          <Badge variant="secondary" className="gap-1 font-normal text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
            <Clock className="size-3" /> Menunggu Verifikasi
          </Badge>
        );
      case 'CONFIRMED':
        return (
          <Badge variant="outline" className="gap-1 font-normal text-xs border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200">
            <CheckCircle2 className="size-3" /> Dikonfirmasi
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="secondary" className="gap-1 font-normal text-xs bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400">
            <CheckCircle2 className="size-3" /> Selesai
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="destructive" className="gap-1 font-normal text-xs">
            <XCircle className="size-3" /> Dibatalkan
          </Badge>
        );
    }
  };

  const waLink = `https://wa.me/${selectedBooking.customerPhone.replace(/[^0-9]/g, '').replace(/^0/, '62')}`;

  return (
    <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
      <DialogContent className="w-[95vw] max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl">
        {/* Modal Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/40">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {selectedBooking.bookingCode}
              </h2>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Dibuat pada {selectedBooking.createdAt} WIB
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shadow-sm"
            >
              <MessageCircle className="size-3.5" />
              Chat WA
            </a>

            {selectedBooking.invoiceNumber && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvoice(selectedBooking)}
                className="h-8 gap-1.5 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <FileText className="size-3.5" />
                Lihat Invoice
              </Button>
            )}
          </div>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
          {/* Left Column: Customer & Session Detail */}
          <div className="md:col-span-7 space-y-4">
            {/* Customer Info Card */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="size-3.5" /> Data Klien & Kampus
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Nama Klien</span>
                  <span className="font-semibold text-zinc-900 dark:text-white text-sm">{selectedBooking.customerName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">No. WhatsApp</span>
                  <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{selectedBooking.customerPhone}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Universitas</span>
                  <span className="text-zinc-800 dark:text-zinc-200">{selectedBooking.university}</span>
                </div>
                {selectedBooking.faculty && (
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Fakultas / Prodi</span>
                    <span className="text-zinc-800 dark:text-zinc-300">{selectedBooking.faculty}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Session & Package Detail */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Paket Photoshoot & Jadwal
              </h3>
              
              <div className="flex items-center justify-between text-xs p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-white block">{selectedBooking.packageName}</span>
                  <span className="text-[11px] text-zinc-500">Harga Paket Dasar</span>
                </div>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                  {formatRupiah(selectedBooking.packagePrice)}
                </span>
              </div>

              {selectedBooking.addons.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-zinc-500">Add-ons Tambahan:</span>
                  {selectedBooking.addons.map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-zinc-100 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300">
                      <span>+ {addon.name}</span>
                      <span className="font-mono text-zinc-500 dark:text-zinc-400">{formatRupiah(addon.price)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Tanggal Sesi</span>
                  <span className="font-medium text-zinc-900 dark:text-white">{selectedBooking.sessionDate}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Slot Waktu</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-200">{selectedBooking.timeSlot} WIB</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Lokasi</span>
                  <span className="text-zinc-800 dark:text-zinc-300 flex items-center gap-1">
                    <MapPin className="size-3 text-zinc-500 shrink-0" />
                    {selectedBooking.location}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[11px]">Fotografer Ditugaskan</span>
                  <span className="text-zinc-800 dark:text-zinc-300 flex items-center gap-1">
                    <Camera className="size-3 text-zinc-500 shrink-0" />
                    {selectedBooking.photographer}
                  </span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="rounded-lg bg-zinc-100 dark:bg-zinc-900/80 p-2.5 text-xs text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Catatan Klien:</span>
                  {selectedBooking.notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Total Biaya Reservasi:</span>
                <span className="text-base font-mono font-bold text-zinc-900 dark:text-white">
                  {formatRupiah(selectedBooking.totalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Payment Verification & Proof */}
          <div className="md:col-span-5 space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="size-3.5" /> Bukti Pembayaran
                </h3>
                <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                  {selectedBooking.paymentBank || 'Transfer Bank'}
                </span>
              </div>

              {/* Proof Image */}
              {selectedBooking.paymentProofUrl ? (
                <div className="relative group overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
                  <img
                    src={selectedBooking.paymentProofUrl}
                    alt="Bukti Transfer"
                    className={`w-full object-cover transition-transform duration-200 ${
                      isZoomed ? 'scale-150 cursor-zoom-out' : 'h-52 cursor-zoom-in group-hover:scale-105'
                    }`}
                    onClick={() => setIsZoomed(!isZoomed)}
                  />
                  <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-[10px] text-zinc-300 flex items-center gap-1 backdrop-blur-sm">
                    <ZoomIn className="size-3" /> Klik untuk Zoom
                  </div>
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-xs text-zinc-500">
                  Belum ada bukti transfer diunggah
                </div>
              )}

              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Nominal Transfer:</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                    {formatRupiah(selectedBooking.paymentAmount || selectedBooking.totalPrice)}
                  </span>
                </div>
                {selectedBooking.paymentDate && (
                  <div className="flex justify-between text-[11px] text-zinc-500">
                    <span>Waktu:</span>
                    <span className="font-mono">{selectedBooking.paymentDate} WIB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Actions */}
            {selectedBooking.status === 'PENDING_VERIFICATION' && (
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 space-y-3.5 shadow-sm">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Verifikasi Pembayaran
                  </h4>
                  <p className="text-[11px] text-zinc-500 leading-normal mt-0.5">
                    Kunci slot jadwal dan kirim invoice WhatsApp ke ({selectedBooking.customerPhone}).
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFullPayment(true)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                      isFullPayment
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold border-zinc-900 dark:border-white shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Lunas (Full)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFullPayment(false)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                      !isFullPayment
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold border-zinc-900 dark:border-white shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    DP (Down Payment)
                  </button>
                </div>

                {showRejectInput && (
                  <div className="space-y-1.5">
                    <Textarea
                      placeholder="Alasan penolakan bukti transfer..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white min-h-[55px]"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    onClick={handleVerify}
                    className="w-full h-9 rounded-lg bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm"
                  >
                    <CheckCircle2 className="size-3.5 mr-1.5" />
                    Konfirmasi & Kirim Invoice WA
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReject}
                    className="w-full h-7 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <XCircle className="size-3 mr-1" />
                    {showRejectInput ? 'Kirim Penolakan ke WA' : 'Tolak Bukti Transfer'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
