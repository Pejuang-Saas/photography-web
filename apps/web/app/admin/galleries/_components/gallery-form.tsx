'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, useAdminBookings } from '@/lib/admin-queries';
import { ApiError } from '@/lib/api-client';
import type { GalleryStatus } from '@/types/gallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '../../components/form-field';

export type GalleryFormValues = {
  name: string;
  driveFolderUrl: string;
  description: string;
  /** Undefined means no limit. */
  maxSelections: number | undefined;
  /** Undefined means any number of customers. */
  maxCustomers: number | undefined;
  /** Empty means not linked to a booking. */
  bookingId: string;
  status: GalleryStatus;
};

const STATUS_LABEL: Record<GalleryStatus, string> = {
  DRAFT: 'Draft (belum bisa dibuka customer)',
  ACTIVE: 'Aktif (bisa dibuka customer)',
  ARCHIVED: 'Diarsipkan (tautan ditutup)',
};

/** The fields of a gallery, for making one and for changing one. */
export default function GalleryForm({
  initial,
  statuses,
  statusLabel,
  folderNote,
  submitLabel,
  pendingLabel,
  cancelHref,
  onSubmit,
}: {
  initial: GalleryFormValues;
  /** The statuses on offer: a new gallery cannot start archived. */
  statuses: GalleryStatus[];
  statusLabel: string;
  /** Shown under the folder address once it differs from the one the gallery was made with. */
  folderNote?: (changed: boolean) => ReactNode;
  submitLabel: string;
  pendingLabel: string;
  cancelHref: string;
  /** Throws to show the message under the folder address. */
  onSubmit: (values: GalleryFormValues) => Promise<void>;
}) {
  const router = useRouter();
  const bookings = useAdminBookings();
  const [name, setName] = useState(initial.name);
  const [driveFolderUrl, setDriveFolderUrl] = useState(initial.driveFolderUrl);
  const [description, setDescription] = useState(initial.description);
  const [maxSelections, setMaxSelections] = useState(initial.maxSelections?.toString() ?? '');
  const [maxCustomers, setMaxCustomers] = useState(initial.maxCustomers?.toString() ?? '');
  const [bookingId, setBookingId] = useState(initial.bookingId);
  const [status, setStatus] = useState<GalleryStatus>(initial.status);
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const completed = (bookings.data ?? []).filter((booking) => booking.status === 'COMPLETED');
  const max = maxSelections.trim() === '' ? undefined : Number(maxSelections);
  const maxInvalid = max !== undefined && (!Number.isInteger(max) || max < 1);
  const customers = maxCustomers.trim() === '' ? undefined : Number(maxCustomers);
  const customersInvalid =
    customers !== undefined && (!Number.isInteger(customers) || customers < 1);
  const ready =
    name.trim() !== '' && driveFolderUrl.trim() !== '' && !maxInvalid && !customersInvalid;
  const folderChanged = driveFolderUrl.trim() !== initial.driveFolderUrl;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || pending) return;
    setProblem(null);
    setPending(true);
    try {
      await onSubmit({
        name: name.trim(),
        driveFolderUrl: driveFolderUrl.trim(),
        description: description.trim(),
        maxSelections: max,
        maxCustomers: customers,
        bookingId,
        status,
      });
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : errorMessage(error));
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <FormField label="Nama galeri *">
            <Input
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Wedding Andi & Sinta"
            />
          </FormField>

          <FormField
            label="Alamat folder Google Drive *"
            hint='Pastikan folder sudah diset publik: "Anyone with the link" sebagai Viewer.'
            error={problem ?? undefined}
          >
            <Input
              required
              value={driveFolderUrl}
              onChange={(event) => setDriveFolderUrl(event.target.value)}
              placeholder="https://drive.google.com/drive/folders/…"
            />
          </FormField>
          {folderNote?.(folderChanged)}

          <FormField label="Deskripsi (opsional)">
            <Textarea
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              label="Maksimal foto dipilih (opsional)"
              hint="Kosongkan jika tidak dibatasi."
              error={maxInvalid ? 'Isi dengan angka bulat, minimal 1' : undefined}
            >
              <Input
                inputMode="numeric"
                value={maxSelections}
                onChange={(event) => setMaxSelections(event.target.value)}
                placeholder="100"
              />
            </FormField>

            <FormField
              label="Maksimal customer yang bisa memilih (opsional)"
              hint="Setelah sebanyak ini customer mulai memilih, customer lain hanya bisa melihat foto. Kosongkan jika tidak dibatasi."
              error={customersInvalid ? 'Isi dengan angka bulat, minimal 1' : undefined}
            >
              <Input
                inputMode="numeric"
                value={maxCustomers}
                onChange={(event) => setMaxCustomers(event.target.value)}
                placeholder="1"
              />
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Booking terkait (opsional)" hint="Hanya booking yang sudah selesai.">
              <select
                value={bookingId}
                onChange={(event) => setBookingId(event.target.value)}
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              >
                <option value="">Tidak dikaitkan</option>
                {completed.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.bookingCode} · {booking.customerName}
                  </option>
                ))}
                {bookingId && !completed.some((booking) => booking.id === bookingId) && (
                  <option value={bookingId}>Booking terpilih</option>
                )}
              </select>
            </FormField>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {statusLabel}
            </span>
            <div role="radiogroup" aria-label={statusLabel} className="flex flex-wrap gap-2">
              {statuses.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={status === value}
                  onClick={() => setStatus(value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    status === value
                      ? 'border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-white'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {STATUS_LABEL[value]}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
          Batal
        </Button>
        <Button
          type="submit"
          disabled={!ready || pending}
          className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
        >
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
