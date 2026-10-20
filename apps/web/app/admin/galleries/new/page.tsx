'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Images } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/admin-queries';
import { galleryApi } from '@/lib/gallery-api';
import { useCreateGallery } from '@/lib/gallery-queries';
import { CmsPageHeader } from '../../components/cms-page-header';
import GalleryForm, { type GalleryFormValues } from '../_components/gallery-form';

function NewGalleryForm() {
  const router = useRouter();
  const create = useCreateGallery();
  // The booking page links here with the booking already chosen.
  const bookingId = useSearchParams().get('bookingId') ?? '';

  async function submit(values: GalleryFormValues) {
    const gallery = await create.mutateAsync({
      name: values.name,
      driveFolderUrl: values.driveFolderUrl,
      description: values.description || undefined,
      maxSelections: values.maxSelections,
      maxCustomers: values.maxCustomers,
      bookingId: values.bookingId || undefined,
      status: values.status,
    });
    // The first read of the folder starts by itself; any failure shows on the detail page.
    await galleryApi.triggerSync(gallery.id).catch((error) => {
      toast.error(`Galeri dibuat, tetapi sync belum berjalan: ${errorMessage(error)}`);
    });
    router.replace(`/admin/galleries/${gallery.id}`);
  }

  return (
    <GalleryForm
      initial={{
        name: '',
        driveFolderUrl: '',
        description: '',
        maxSelections: undefined,
        maxCustomers: undefined,
        bookingId,
        status: 'DRAFT',
      }}
      statuses={['DRAFT', 'ACTIVE']}
      statusLabel="Status awal"
      submitLabel="Buat Galeri & Sinkronkan"
      pendingLabel="Membuat…"
      cancelHref="/admin/galleries"
      onSubmit={submit}
    />
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
