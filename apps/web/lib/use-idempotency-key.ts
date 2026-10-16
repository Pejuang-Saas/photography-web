'use client';

import { useCallback, useRef } from 'react';

/**
 * One Idempotency-Key per distinct request payload. Retrying the same payload (for example after a
 * network error) reuses the key so the API deduplicates it; changing the payload gets a fresh key,
 * because the API rejects a reused key that arrives with a different body.
 */
export function useIdempotencyKey() {
  const current = useRef<{ signature: string; key: string } | null>(null);

  return useCallback((signature: string) => {
    if (current.current?.signature !== signature) {
      current.current = { signature, key: crypto.randomUUID() };
    }
    return current.current.key;
  }, []);
}
