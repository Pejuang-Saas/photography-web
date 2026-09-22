'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cmsApi } from '@/lib/cms-api';
import { GalleryForm } from '../../gallery-form';
import { CmsErrorState, CmsLoadingState } from '../../../../components/cms-state';

export default function EditGalleryPage() {
  const { id } = useParams<{ id: string }>();
  const gallery = useQuery({ queryKey: ['cms', 'gallery'], queryFn: cmsApi.listGallery });
  if (gallery.isLoading) return <CmsLoadingState />;
  if (gallery.isError) return <CmsErrorState message={gallery.error instanceof Error ? gallery.error.message : 'Terjadi kesalahan.'} retry={() => gallery.refetch()} />;
  const item = gallery.data?.find((entry) => entry.id === id);
  if (!item) return <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900"><p className="text-zinc-500">Foto gallery tidak ditemukan.</p><Link href="/admin/cms/gallery"><Button className="mt-4">Kembali ke gallery</Button></Link></div>;
  return <GalleryForm item={item} />;
}
