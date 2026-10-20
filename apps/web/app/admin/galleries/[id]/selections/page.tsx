import { redirect } from 'next/navigation';

/** The customers' choices now live at the bottom of the gallery's page; old links land there. */
export default async function GallerySelectionsRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/galleries/${id}#pilihan`);
}
