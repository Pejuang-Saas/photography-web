'use client';

import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import type { PaymentPlan } from '@/lib/api-types';
import { bookingApi, type Booking, type ServicePackage } from '@/lib/booking-api';
import {
  EMPTY_CUSTOMER_FORM,
  validateCustomerForm,
  type CustomerErrors,
  type CustomerForm,
} from '@/lib/booking-form';
import { formatDateTime } from '@/lib/format';
import { useStudioInfo } from '@/lib/studio-queries';
import { useIdempotencyKey } from '@/lib/use-idempotency-key';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import StepBookingSuccess from './step-booking-success';
import StepCustomerSchedule from './step-customer-schedule';
import StepGatewayPayment from './step-gateway-payment';
import StepManualPayment from './step-manual-payment';
import StepOrderPreview from './step-order-preview';

type Step = 'customer' | 'preview' | 'payment' | 'success';

const STEP_META: Record<Step, { number: number; title: string; description: string }> = {
  customer: {
    number: 1,
    title: 'Data Diri & Jadwal',
    description: 'Isi data dan pilih jadwal sesi. Slot baru dikunci di langkah berikutnya.',
  },
  preview: {
    number: 2,
    title: 'Preview Pesanan',
    description: 'Periksa kembali pesananmu dan pilih skema pembayaran.',
  },
  payment: {
    number: 3,
    title: 'Pembayaran',
    description: 'Selesaikan pembayaran untuk mengunci jadwalmu.',
  },
  success: { number: 4, title: 'Selesai', description: 'Reservasi kamu sudah tercatat.' },
};

export default function BookingMultiStepModal({
  packageItem,
  open,
  onOpenChange,
}: {
  packageItem: ServicePackage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const keyFor = useIdempotencyKey();
  const [step, setStep] = useState<Step>('customer');
  const [form, setForm] = useState<CustomerForm>(EMPTY_CUSTOMER_FORM);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [plan, setPlan] = useState<PaymentPlan>('DP_50');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paidBy, setPaidBy] = useState('');

  const paymentSettings = useQuery({
    queryKey: ['public', 'payment-settings'],
    queryFn: bookingApi.getPaymentSettings,
    enabled: open,
    staleTime: 60_000,
  });
  const studio = useStudioInfo(open);

  const allowDownPayment = paymentSettings.data?.allowDownPayment !== false;
  const activePlan: PaymentPlan = allowDownPayment ? plan : 'FULL';

  const createBooking = useMutation({
    mutationFn: () => {
      const payload = {
        packageId: packageItem.id,
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim(),
        sessionDate: form.sessionDate,
        timeSlot: form.timeSlot,
        paymentPlan: activePlan,
        notes: form.notes.trim() || undefined,
      };
      return bookingApi.createBooking(payload, keyFor(JSON.stringify(payload)));
    },
    onSuccess: (created) => {
      setBooking(created);
      setStep('payment');
    },
    onError: (error) => {
      // The slot was taken by someone else: send the customer back to pick another one.
      if (error instanceof ApiError && error.status === 409) {
        setNotice(error.message);
        setStep('customer');
      }
    },
  });

  function handleCustomerNext() {
    const found = validateCustomerForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setNotice(null);
    createBooking.reset();
    setStep('preview');
  }

  const handleConfirmed = useCallback(() => setStep('success'), []);

  function restart() {
    setBooking(null);
    setNotice(null);
    createBooking.reset();
    setStep('customer');
  }

  function handleOpenChange(next: boolean) {
    if (!next && step === 'payment' && booking) {
      const until = booking.expiresAt ? ` sampai ${formatDateTime(booking.expiresAt)} WIB` : '';
      const leave = window.confirm(
        `Pembayaran belum selesai. Slot tetap ditahan${until}.\nSimpan kode reservasi ${booking.bookingCode}. Tutup sekarang?`,
      );
      if (!leave) return;
    }
    onOpenChange(next);
  }

  const meta = STEP_META[step];
  const previewError =
    createBooking.isError &&
    !(createBooking.error instanceof ApiError && createBooking.error.status === 409)
      ? createBooking.error instanceof ApiError
        ? createBooking.error.message
        : 'Reservasi belum berhasil dibuat. Silakan coba lagi.'
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-xl overflow-y-auto rounded-2xl border-white/10 bg-[#151413] p-6 text-fg shadow-2xl">
        <DialogHeader>
          <p
            className="font-mono text-[11px] uppercase tracking-widest text-muted"
            aria-live="polite"
          >
            Langkah {meta.number} dari 4
          </p>
          <DialogTitle className="text-2xl font-bold">
            {step === 'customer' ? `Reservasi ${packageItem.name}` : meta.title}
          </DialogTitle>
          <DialogDescription className="text-muted">{meta.description}</DialogDescription>
          <div className="flex gap-1.5 pt-1" aria-hidden>
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`h-1 flex-1 rounded-full ${n <= meta.number ? 'bg-accent' : 'bg-white/10'}`}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="pt-2">
          {step === 'customer' && (
            <StepCustomerSchedule
              form={form}
              errors={errors}
              notice={notice}
              onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
              onNext={handleCustomerNext}
            />
          )}

          {step === 'preview' && (
            <StepOrderPreview
              packageItem={packageItem}
              form={form}
              plan={activePlan}
              allowDownPayment={allowDownPayment}
              studio={studio.data}
              pending={createBooking.isPending}
              error={previewError}
              onPlanChange={setPlan}
              onBack={() => setStep('customer')}
              onNext={() => createBooking.mutate()}
            />
          )}

          {step === 'payment' && booking && booking.paymentMode === 'MANUAL' && (
            <StepManualPayment
              booking={booking}
              accounts={paymentSettings.data?.manualAccounts ?? []}
              studio={studio.data}
              onSubmitted={(senderName) => {
                setPaidBy(senderName);
                setStep('success');
              }}
            />
          )}

          {step === 'payment' && booking && booking.paymentMode === 'GATEWAY' && (
            <StepGatewayPayment
              booking={booking}
              provider={paymentSettings.data?.gatewayProvider ?? null}
              onConfirmed={handleConfirmed}
              onRestart={restart}
            />
          )}

          {step === 'success' && booking && (
            <StepBookingSuccess
              booking={booking}
              mode={booking.paymentMode}
              senderName={paidBy || form.customerName.trim()}
              studio={studio.data}
              onClose={() => onOpenChange(false)}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
