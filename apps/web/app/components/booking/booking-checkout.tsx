'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import type { PaymentPlan } from '@/lib/api-types';
import {
  bookingApi,
  type Booking,
  type ResumedBooking,
  type ServicePackage,
} from '@/lib/booking-api';
import {
  EMPTY_CUSTOMER_FORM,
  validateCustomerForm,
  type CustomerErrors,
  type CustomerForm,
} from '@/lib/booking-form';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { addOnsFor, summarizeOrder } from '@/lib/package-details';
import { brandMark, type StudioInfo } from '@/lib/studio-api';
import { useStudioInfo } from '@/lib/studio-queries';
import { useIdempotencyKey } from '@/lib/use-idempotency-key';
import {
  deadlineFromResume,
  resumeStep,
  successStatusOf,
  type Step,
  type SuccessStatus,
} from './resume';
import StepBookingSuccess from './step-booking-success';
import StepCustomerSchedule from './step-customer-schedule';
import StepGatewayPayment from './step-gateway-payment';
import StepManualPayment from './step-manual-payment';
import StepOrderPreview from './step-order-preview';

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

export default function BookingCheckout({
  packageItem,
  initialStudio,
  resume,
}: {
  packageItem: ServicePackage;
  initialStudio: StudioInfo | null;
  /** A booking restored from the server after a refresh; null for a fresh visit. */
  resume: ResumedBooking | null;
}) {
  const router = useRouter();
  const keyFor = useIdempotencyKey();
  const [step, setStep] = useState<Step>(() => (resume ? resumeStep(resume.status) : 'customer'));
  const [form, setForm] = useState<CustomerForm>(EMPTY_CUSTOMER_FORM);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [plan, setPlan] = useState<PaymentPlan>('DP_50');
  const [booking, setBooking] = useState<Booking | null>(resume);
  // Local timestamp the payment window closes at; see useDeadline for why it is not expiresAt.
  const [deadline, setDeadline] = useState<number | null>(() =>
    resume ? deadlineFromResume(resume) : null,
  );
  // Bumped on every restart so a retry with the same data is not deduplicated into the expired booking.
  const [attempt, setAttempt] = useState(0);
  const [paidBy, setPaidBy] = useState(resume?.customerName ?? '');
  const [successStatus, setSuccessStatus] = useState<SuccessStatus>(
    (resume && successStatusOf(resume.status)) || 'PENDING_VERIFICATION',
  );
  // The pay page opened before a refresh; dropped on restart so it is never offered for a new booking.
  const [restoredPayUrl, setRestoredPayUrl] = useState(resume?.gatewayRedirectUrl ?? null);

  const paymentSettings = useQuery({
    queryKey: ['public', 'payment-settings'],
    queryFn: bookingApi.getPaymentSettings,
    staleTime: 30_000,
  });
  const addOnList = useQuery({
    queryKey: ['public', 'add-ons'],
    queryFn: bookingApi.listAddOns,
    staleTime: 60_000,
  });
  const offeredAddOns = addOnsFor(addOnList.data ?? [], packageItem.category);
  const summary = summarizeOrder(packageItem, offeredAddOns, form.addOns);
  const studio = useStudioInfo(true, initialStudio ?? undefined);

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
        // Ids and quantities only; the server works out the prices.
        addOns: summary.lines.map((line) => ({
          addOnId: line.addOn.id,
          quantity: line.quantity,
        })),
      };
      return bookingApi.createBooking(payload, keyFor(`${JSON.stringify(payload)}#${attempt}`));
    },
    onSuccess: (created) => {
      setBooking(created);
      // Keeps the booking one refresh away; see BookingEntry.
      window.history.replaceState(null, '', `${window.location.pathname}?b=${created.id}`);
      setDeadline(
        created.expiresAt
          ? Date.now() +
              (new Date(created.expiresAt).getTime() - new Date(created.createdAt).getTime())
          : null,
      );
      setStep('payment');
    },
    onError: (error) => {
      // The slot was taken by someone else: send the customer back to pick another one.
      if (error instanceof ApiError && error.status === 409) {
        setNotice('Slot jadwal yang kamu pilih sudah terisi. Silakan pilih tanggal atau jam lain.');
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

  const onFormChange = useCallback(
    (patch: Partial<CustomerForm>) => setForm((current) => ({ ...current, ...patch })),
    [],
  );

  const handleConfirmed = useCallback(() => {
    setSuccessStatus('CONFIRMED');
    setStep('success');
  }, []);

  function restart() {
    setAttempt((current) => current + 1);
    setBooking(null);
    setDeadline(null);
    setRestoredPayUrl(null);
    window.history.replaceState(null, '', window.location.pathname);
    setNotice(null);
    createBooking.reset();
    setStep('customer');
  }

  function leave(href: string) {
    if (booking && step === 'payment') {
      const until = booking.expiresAt ? ` sampai ${formatDateTime(booking.expiresAt)} WIB` : '';
      const ok = window.confirm(
        `Pembayaran belum selesai. Slot tetap ditahan${until}.\nSimpan kode reservasi ${booking.bookingCode}. Tinggalkan halaman ini?`,
      );
      if (!ok) return;
    }
    router.push(href);
  }

  const meta = STEP_META[step];
  const previewError =
    createBooking.isError &&
    !(createBooking.error instanceof ApiError && createBooking.error.status === 409)
      ? createBooking.error instanceof ApiError
        ? createBooking.error.message
        : 'Reservasi belum berhasil dibuat. Silakan coba lagi.'
      : null;

  const brand = brandMark(studio.data?.studioName ?? initialStudio?.studioName ?? 'Studio');

  return (
    // `dark` switches the shadcn tokens; the accent overrides sit on a child because a rule on the
    // same element as `.dark` would lose to it.
    <div className="dark bg-bg text-fg">
      <div className="flex min-h-[100dvh] flex-col [--primary:#d9a521] [--primary-foreground:#070707] [--ring:#d9a521]">
        <header className="border-b border-white/10">
          <div className="mx-auto flex h-14 max-w-6xl items-center 2xl:max-w-7xl justify-between gap-4 px-4">
            <Link
              href="/"
              onClick={(event) => {
                event.preventDefault();
                leave('/');
              }}
              className="text-lg font-black tracking-tighter"
            >
              {brand}
              <span className="text-accent">.</span>
            </Link>

            <p className="hidden min-w-0 items-center gap-2 truncate text-sm sm:flex">
              <span className="truncate font-semibold">{packageItem.name}</span>
              <span className="font-bold text-accent">{formatRupiah(packageItem.price)}</span>
            </p>

            <Link
              href="/#paket"
              onClick={(event) => {
                event.preventDefault();
                leave('/#paket');
              }}
              className="shrink-0 text-xs text-muted hover:text-fg"
            >
              ← Ganti paket
            </Link>
          </div>
        </header>

        <main
          className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-5 2xl:max-w-7xl [@media(min-height:900px)]:py-10"
          aria-labelledby="checkout-title"
        >
          <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <p
                className="font-mono text-[11px] uppercase tracking-widest text-muted"
                aria-live="polite"
              >
                Langkah {meta.number} dari 4
              </p>
              <h1 id="checkout-title" className="text-xl font-bold sm:text-2xl">
                {step === 'customer' ? `Reservasi ${packageItem.name}` : meta.title}
              </h1>
              <p className="mt-1 hidden text-sm text-muted [@media(min-height:800px)]:block">
                {meta.description}
              </p>
            </div>
            <div className="flex w-full gap-1.5 sm:w-56" aria-hidden>
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`h-1 flex-1 rounded-full ${n <= meta.number ? 'bg-accent' : 'bg-white/10'}`}
                />
              ))}
            </div>
          </div>

          {step === 'customer' && (
            <StepCustomerSchedule
              form={form}
              errors={errors}
              notice={notice}
              packageItem={packageItem}
              addOns={offeredAddOns}
              onChange={onFormChange}
              onNext={handleCustomerNext}
            />
          )}

          {step === 'preview' && (
            <StepOrderPreview
              packageItem={packageItem}
              summary={summary}
              form={form}
              plan={activePlan}
              allowDownPayment={allowDownPayment}
              paymentMode={paymentSettings.data?.activeMode}
              paymentWindowMinutes={paymentSettings.data?.paymentWindowMinutes}
              studio={studio.data}
              pending={createBooking.isPending}
              error={previewError}
              onPlanChange={setPlan}
              onBack={() => setStep('customer')}
              onNext={() => createBooking.mutate()}
            />
          )}

          {step === 'payment' && booking && !paymentSettings.data && (
            <p className="flex items-center gap-2 text-sm text-muted" role="status">
              Memuat metode pembayaran...
            </p>
          )}

          {step === 'payment' &&
            booking &&
            paymentSettings.data &&
            booking.paymentMode === 'MANUAL' && (
              <StepManualPayment
                booking={booking}
                deadline={deadline}
                onRestart={restart}
                accounts={paymentSettings.data?.manualAccounts ?? []}
                studio={studio.data}
                onSubmitted={(senderName) => {
                  setPaidBy(senderName);
                  setSuccessStatus('PENDING_VERIFICATION');
                  setStep('success');
                }}
              />
            )}

          {step === 'payment' &&
            booking &&
            paymentSettings.data &&
            booking.paymentMode === 'GATEWAY' && (
              <StepGatewayPayment
                booking={booking}
                deadline={deadline}
                provider={paymentSettings.data?.gatewayProvider ?? null}
                initialRedirectUrl={restoredPayUrl}
                onConfirmed={handleConfirmed}
                onRestart={restart}
              />
            )}

          {step === 'success' && booking && (
            <StepBookingSuccess
              booking={booking}
              mode={booking.paymentMode}
              status={successStatus}
              senderName={paidBy || form.customerName.trim()}
              studio={studio.data}
              onClose={() => router.push('/')}
              onRestart={restart}
            />
          )}
        </main>
      </div>
    </div>
  );
}
