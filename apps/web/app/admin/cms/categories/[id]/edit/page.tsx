'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { cmsApi } from '@/lib/cms-api';
import { CmsErrorState, CmsLoadingState } from '../../../../components/cms-state';
import { CategoryForm } from '../../category-form';

export default function EditGalleryCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const categories = useQuery({ queryKey: ['cms', 'categories'], queryFn: cmsApi.listCategories });
  if (categories.isLoading) return <CmsLoadingState />;
  if (categories.isError) return <CmsErrorState message={categories.error instanceof Error ? categories.error.message : 'Terjadi kesalahan.'} retry={() => categories.refetch()} />;
  const category = categories.data?.find((entry) => entry.id === id);
  if (!category) return <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900"><p className="text-zinc-500">Kategori gallery tidak ditemukan.</p><Link href="/admin/cms/categories"><Button className="mt-4">Kembali ke kategori</Button></Link></div>;
  return <CategoryForm category={category} />;
}
