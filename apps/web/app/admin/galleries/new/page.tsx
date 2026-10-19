'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Images } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/admin-queries';
import { ApiError } from '@/lib/api-client';
import { useAdminBookings } from '@/lib/admin-queries';
import { galleryApi } from '@/lib/gallery-api';
import { useCreateGallery } from '@/lib/gallery-queries';
import type { GalleryStatus } from '@/types/gallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CmsPageHeader } from '../../components/cms-page-header';
import { FormField } from '../../components/form-field';

function NewGalleryForm() {
  const router = useRouter();
  const create = useCreateGallery();
  const bookings = useAdminBookings();
  const [name, setName] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [description, setDescription] = useState('');
  const [maxSelections, setMaxSelections] = useState('');
  // The booking page links here with the booking already chosen.
  const [bookingId, setBookingId] = useState(useSearchParams().get('bookingId') ?? '');
  const [status, setStatus] = useState<GalleryStatus>('DRAFT');
  const [problem, setProblem] = useState<string | null>(null);

  const completed = (bookings.data ?? []).filter((booking) => booking.status === 'COMPLETED');
  const max = maxSelections.trim() === '' ? undefined : Number(maxSelections);
  const maxInvalid = max !== undefined && (!Number.isInteger(max) || max < 1);
  const ready = name.trim() !== '' && driveFolderUrl.trim() !== '' && !maxInvalid;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready) return;
    setProblem(null);
    try {
      const gallery = await create.mutateAsync({
        name: name.trim(),
        driveFolderUrl: driveFolderUrl.trim(),
        description: description.trim() || undefined,
        maxSelections: max,
        bookingId: bookingId || undefined,
        status,
      });
      // The first read of the folder starts by itself; any failure shows on the detail page.
      await galleryApi.triggerSync(gallery.id).catch((error) => {
        toast.error(`Galeri dibuat, tetapi sync belum berjalan: ${errorMessage(error)}`);
      });
      router.replace(`/admin/galleries/${gallery.id}`);
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : errorMessage(error));
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
              Status awal
            </span>
            <div role="radiogroup" aria-label="Status awal" className="flex gap-2">
              {(['DRAFT', 'ACTIVE'] as const).map((value) => (
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
                  {value === 'DRAFT'
                    ? 'Draft (belum bisa dibuka customer)'
                    : 'Aktif (langsung bisa dibuka)'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/galleries')}>
          Batal
        </Button>
        <Button
          type="submit"
          disabled={!ready || create.isPending}
          className="bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
        >
          {create.isPending ? 'Membuat…' : 'Buat Galeri & Sinkronkan'}
        </Button>
      </div>
    </form>
  );
}

export default function NewGalleryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CmsPageHeader
        title="Buat Galeri"
        description="Hubungkan folder Google Drive publik. Foto dibaca otomatis setelah galeri dibuat."
        icon={Images}
        backHref="/admin/galleries"
      />
      <Suspense>
        <NewGalleryForm />
      </Suspense>
    </div>
  );
}
