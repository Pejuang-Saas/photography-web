'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle } from 'lucide-react';
import { bookingApi, type ServicePackage } from '@/lib/booking-api';
import type { StudioInfo } from '@/lib/studio-api';
import BookingCheckout from './booking-checkout';

/**
 * Entry point of the checkout page. With `?b=<booking id>` it first restores the booking from the
 * server (so a refresh lands back on the payment or result screen); otherwise it just starts fresh.
 */
export default function BookingEntry({
  packageItem,
  initialStudio,
  resumeId,
}: {
  packageItem: ServicePackage;
  initialStudio: StudioInfo | null;
  resumeId: string | null;
}) {
  const query = useQuery({
    queryKey: ['public', 'resume', resumeId],
    queryFn: () => bookingApi.getResume(resumeId!),
    enabled: Boolean(resumeId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  // A link to another package's booking is as useless as an unknown id: start over on a clean URL.
  const mismatch = Boolean(query.data && query.data.packageId !== packageItem.id);
  const unusable = query.isError || mismatch;

  useEffect(() => {
    if (unusable) window.history.replaceState(null, '', window.location.pathname);
  }, [unusable]);

  if (resumeId && query.isLoading) {
    return (
      <div className="dark flex min-h-[100dvh] items-center justify-center bg-bg text-fg">
        <p className="flex items-center gap-3 text-sm text-muted" role="status">
          <LoaderCircle className="size-4 animate-spin" />
          Memulihkan reservasi kamu...
        </p>
      </div>
    );
  }

  return (
    <BookingCheckout
      packageItem={packageItem}
      initialStudio={initialStudio}
      resume={query.data && !mismatch ? query.data : null}
    />
  );
}
