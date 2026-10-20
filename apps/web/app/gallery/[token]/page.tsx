import type { Metadata } from 'next';
import { QueryProvider } from '@/lib/query-provider';
import PhotoSelectionPage from '../_components/PhotoSelectionPage';

export const metadata: Metadata = {
  title: 'Pilih Foto',
  // The link is a secret between the studio and one customer.
  robots: { index: false, follow: false },
};

export default async function GalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <QueryProvider>
      <PhotoSelectionPage token={token} />
    </QueryProvider>
  );
}
