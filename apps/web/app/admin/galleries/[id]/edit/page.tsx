'use client';

import { useParams, useRouter } from 'next/navigation';
import { Images, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/admin-queries';
import { galleryApi } from '@/lib/gallery-api';
import { useGallery, useUpdateGallery } from '@/lib/gallery-queries';
import { CmsPageHeader } from '../../../components/cms-page-header';
import { QueryError, QueryLoading } from '../../../components/query-state';
import GalleryForm, { type GalleryFormValues } from '../../_components/gallery-form';

export default function EditGalleryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const gallery = useGallery(id);
  const update = useUpdateGallery(id);

  if (gallery.isLoading) return <QueryLoading rows={4} />;
  if (gallery.isError || !gallery.data) {
    return (
      <QueryError
        title="Galeri tidak dapat dimuat"
        message={errorMessage(gallery.error)}
        retry={() => gallery.refetch()}
      />
    );
  }
  const data = gallery.data;
  const folderUrl = `https://drive.google.com/drive/folders/${data.driveFolderId}`;

  async function submit(values: GalleryFormValues) {
    const folderChanged = values.driveFolderUrl !== folderUrl;
    await update.mutateAsync({
      name: values.name,
      description: values.description,
      maxSelections: values.maxSelections ?? null,
      bookingId: values.bookingId || null,
      status: values.status,
      ...(folderChanged && { driveFolderUrl: values.driveFolderUrl }),
    });
    // The photos come from the folder, so a new one is read straight away.
    if (folderChanged) {
      await galleryApi.triggerSync(id).catch((error) => {
        toast.error(`Galeri diperbarui, tetapi sync belum berjalan: ${errorMessage(error)}`);
      });
    }
    router.replace(`/admin/galleries/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <CmsPageHeader
        title="Edit Galeri"
        description={data.name}
        icon={Images}
        backHref={`/admin/galleries/${id}`}
      />
      <GalleryForm
        initial={{
          name: data.name,
          driveFolderUrl: folderUrl,
          description: data.description ?? '',
          maxSelections: data.maxSelections ?? undefined,
          bookingId: data.booking?.id ?? '',
          status: data.status,
        }}
        statuses={['DRAFT', 'ACTIVE', 'ARCHIVED']}
        statusLabel="Status"
        folderNote={(changed) =>
          changed && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-3 text-xs text-amber-900 dark:text-amber-300"
            >
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                Folder diganti. Setelah disimpan, galeri dibaca ulang dari folder baru. Foto yang
                hanya ada di folder lama akan disembunyikan dari customer, dan pilihan yang sudah
                dikirim atas foto itu tetap tersimpan.
              </span>
            </p>
          )
        }
        submitLabel="Simpan Perubahan"
        pendingLabel="Menyimpan…"
        cancelHref={`/admin/galleries/${id}`}
        onSubmit={submit}
      />
    </div>
  );
}
