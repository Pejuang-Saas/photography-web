'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { publicGalleryApi } from '@/lib/gallery-api';
import { selectionKey } from './gallery-state';

const DEBOUNCE_MS = 1500;
const RETRY_MS = 4000;

/**
 * Saves the draft in the background once the customer stops clicking. Clicking never waits for
 * the network; a failed save is retried until it works, and `flush` forces a save before submitting.
 */
export function useAutoSave({
  token,
  sessionToken,
  selectedIds,
  enabled,
  onSubmittedElsewhere,
}: {
  token: string;
  sessionToken: string | null;
  selectedIds: Set<string>;
  /** False until the saved draft has been loaded and after submitting. */
  enabled: boolean;
  onSubmittedElsewhere: () => void;
}) {
  const latest = useRef(selectedIds);
  const savedKey = useRef('');
  const saving = useRef<Promise<void> | null>(null);
  const warned = useRef(false);

  useEffect(() => {
    latest.current = selectedIds;
  }, [selectedIds]);

  /** Tells the hook what the server already has, so a draft that was just loaded is not saved back. */
  const markSaved = useCallback((ids: Iterable<string>) => {
    savedKey.current = selectionKey(ids);
  }, []);

  /** One save at a time, so two cannot arrive out of order; nothing is sent when nothing changed. */
  const saveNow = useCallback(async () => {
    if (!sessionToken) return;
    while (saving.current) await saving.current.catch(() => undefined);

    const ids = [...latest.current];
    const key = selectionKey(ids);
    if (key === savedKey.current) return;

    const job = publicGalleryApi
      .save(token, sessionToken, ids)
      .then(() => {
        savedKey.current = key;
        warned.current = false;
      })
      .catch((error: unknown) => {
        // Already submitted in another tab: nothing more to save.
        if (error instanceof ApiError && error.status === 409) {
          onSubmittedElsewhere();
          return;
        }
        throw error;
      })
      .finally(() => {
        saving.current = null;
      });
    saving.current = job;
    await job;
  }, [token, sessionToken, onSubmittedElsewhere]);

  useEffect(() => {
    if (!enabled || !sessionToken) return;
    if (selectionKey(selectedIds) === savedKey.current) return;

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        await saveNow();
      } catch {
        if (!warned.current) {
          warned.current = true;
          toast.warning('Gagal menyimpan pilihan sementara. Mencoba kembali…');
        }
        if (!cancelled) timeout = setTimeout(tick, RETRY_MS);
      }
    };
    timeout = setTimeout(tick, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [selectedIds, enabled, sessionToken, saveNow]);

  // Leaving the page within the debounce window must not lose the last clicks.
  useEffect(() => {
    if (!enabled || !sessionToken) return;
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return;
      const ids = [...latest.current];
      if (selectionKey(ids) === savedKey.current) return;
      void publicGalleryApi.save(token, sessionToken, ids, true).catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [enabled, sessionToken, token]);

  return { flush: saveNow, markSaved };
}
