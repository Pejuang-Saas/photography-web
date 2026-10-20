import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BookingEntry from '@/app/components/booking/booking-entry';
import ReservationsClosed from '@/app/components/booking/reservations-closed';
import { getPublicPackages, getStudioInfo } from '@/lib/landing-data';
import { QueryProvider } from '@/lib/query-provider';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ b?: string | string[] }>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findPackage(slug: string) {
  const packages = await getPublicPackages();
  return packages?.find((pkg) => pkg.slug === slug && pkg.isActive) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await findPackage(slug);

  return {
    title: pkg ? `Reservasi ${pkg.name}` : 'Reservasi',
    // A checkout page has no value in search results.
    robots: { index: false, follow: false },
  };
}

export default async function ReservationPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { b } = await searchParams;
  // `?b=` is the id of a booking being resumed after a refresh; anything else is ignored.
  const resumeId = typeof b === 'string' && UUID.test(b) ? b : null;
  const [pkg, studio] = await Promise.all([findPackage(slug), getStudioInfo()]);
  if (!pkg) notFound();
  // Closed: nobody starts a booking, but one already made (`?b=`) can still be paid.
  if (studio && !studio.reservationsOpen && !resumeId) {
    return <ReservationsClosed studio={studio} packageName={pkg.name} />;
  }

  return (
    <QueryProvider>
      <BookingEntry packageItem={pkg} initialStudio={studio} resumeId={resumeId} />
    </QueryProvider>
  );
}
