'use client';

import { useQuery } from '@tanstack/react-query';
import { studioApi } from './studio-api';

export const studioKeys = {
  public: ['public', 'studio-info'] as const,
};

/** Public studio profile (contact, address, guarantees). Changes rarely, so cache it for a while. */
export function useStudioInfo(enabled = true) {
  return useQuery({
    queryKey: studioKeys.public,
    queryFn: studioApi.getPublic,
    staleTime: 5 * 60_000,
    enabled,
  });
}
