'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import { bookingApi, type Booking, type ServicePackage } from '@/lib/booking-api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type PublicBookingDialogProps = {
  packageItem: ServicePackage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const timeSlots = [
  '08:30 - 09:30',
  '09:30 - 10:30',
  '10:30 - 11:30',
  '13:00 - 14:30',
  '15:00 - 16:30',
];

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'Reservasi belum berhasil dikirim. Silakan coba lagi.';
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function PublicBookingDialog({
  packageItem,
  open,
  onOpenChange,
}: PublicBookingDialogProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [timeSlot, setTimeSlot] = useState(timeSlots[0]);
  const [paymentPlan, setPaymentPlan] = useState<'DP_50' | 'FULL'>('DP_50');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);

  const paymentSettings = useQuery({
    queryKey: ['public', 'payment-settings'],
    queryFn: bookingApi.getPaymentSettings,
    enabled: open,
    staleTime: 60_000,
  });

  const createBooking = useMutation({
    mutationFn: () =>
      bookingApi.createBooking(
        {
          packageId: packageItem.id,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          sessionDate,
          timeSlot,
          paymentPlan: paymentSettings.data?.allowDownPayment === false ? 'FULL' : paymentPlan,
          notes: notes.trim() || undefined,
        },
        crypto.randomUUID(),
      ),
    onSuccess: setBooking,
  });

  const activePaymentPlan =
    paymentSettings.data?.allowDownPayment === false ? 'FULL' : paymentPlan;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createBooking.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-xl overflow-y-auto rounded-2xl border-white/10 bg-[#151413] p-6 text-fg shadow-2xl">
        {booking ? (
          <div className="space-y-6 py-4">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-accent">Reservasi diterima</DialogTitle>
              <DialogDescription className="text-muted">
                Simpan kode reservasi ini untuk mengecek status pembayaranmu.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-muted">Kode Reservasi</p>
              <p className="mt-2 text-2xl font-black tracking-wider text-accent">{booking.bookingCode}</p>
            </div>

            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted">Paket</span>
                <span className="text-right font-medium">{booking.packageName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Jadwal</span>
                <span className="text-right font-medium">
                  {booking.sessionDate.slice(0, 10)} · {booking.timeSlot}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-2">
                <span className="text-muted">Minimal pembayaran</span>
                <span className="font-bold text-accent">{formatRupiah(booking.requiredAmount)}</span>
              </div>
            </div>

            <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
              Selesai
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Reservasi {packageItem.name}</DialogTitle>
              <DialogDescription className="text-muted">
                Isi data di bawah. Slot baru dikunci setelah reservasi berhasil dibuat.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted">Nama lengkap *</span>
                  <Input
                    required
                    minLength={3}
                    maxLength={120}
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="Nama sesuai identitas"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted">Nomor WhatsApp *</span>
                  <Input
                    required
                    minLength={10}
                    maxLength={20}
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="08xxxxxxxxxx"
                    inputMode="tel"
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-sm">
                <span className="text-muted">Email *</span>
                <Input
                  required
                  type="email"
                  maxLength={180}
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="nama@email.com"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted">Tanggal sesi *</span>
                  <Input
                    required
                    type="date"
                    min={todayIso()}
                    value={sessionDate}
                    onChange={(event) => setSessionDate(event.target.value)}
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="text-muted">Slot waktu *</span>
                  <select
                    required
                    value={timeSlot}
                    onChange={(event) => setTimeSlot(event.target.value)}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot} className="bg-[#151413]">
                        {slot} WIB
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <fieldset className="space-y-2 text-sm">
                <legend className="text-muted">Rencana pembayaran *</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 p-3 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                    <input
                      type="radio"
                      name="paymentPlan"
                      value="DP_50"
                      checked={activePaymentPlan === 'DP_50'}
                      disabled={paymentSettings.data?.allowDownPayment === false}
                      onChange={() => setPaymentPlan('DP_50')}
                    />
                    <span>DP 50%</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 p-3 has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                    <input
                      type="radio"
                      name="paymentPlan"
                      value="FULL"
                      checked={activePaymentPlan === 'FULL'}
                      onChange={() => setPaymentPlan('FULL')}
                    />
                    <span>Bayar penuh</span>
                  </label>
                </div>
              </fieldset>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-muted">
                {paymentSettings.isLoading
                  ? 'Memuat metode pembayaran...'
                  : paymentSettings.data?.activeMode === 'GATEWAY'
                    ? `Pembayaran dilanjutkan melalui ${paymentSettings.data.gatewayProvider ?? 'gateway yang tersedia'} setelah reservasi dibuat.`
                    : 'Setelah reservasi dibuat, kamu dapat mengunggah bukti transfer melalui halaman pembayaran.'}
              </div>

              <label className="block space-y-1.5 text-sm">
                <span className="text-muted">Catatan (opsional)</span>
                <Textarea
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Contoh: lokasi kampus atau kebutuhan khusus"
                />
              </label>

              {createBooking.isError && (
                <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                  {getErrorMessage(createBooking.error)}
                </p>
              )}

              <Button type="submit" disabled={createBooking.isPending} className="w-full">
                {createBooking.isPending ? 'Mengirim reservasi...' : 'Kirim reservasi'}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
