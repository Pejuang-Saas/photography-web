'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { CheckCircle2, ImageOff, Loader2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/admin-queries';
import { ApiError } from '@/lib/api-client';
import { publicGalleryApi } from '@/lib/gallery-api';
import type { CreateSessionRequest, Photo, PublicGalleryInfo } from '@/types/gallery';
import FilterTabs from './FilterTabs';
import GalleryEntryModal from './GalleryEntryModal';
import PhotoGrid from './PhotoGrid';
import SelectionBar from './SelectionBar';
import SubmitModal from './SubmitModal';
import { galleryReducer, initialState, photosFor, sessionStorageKey } from './gallery-state';
import { useAutoSave } from './use-auto-save';

// The site's body is always near-black (the landing page), so this page paints its own surface
// the way the admin does, and follows the visitor's theme.
const SHELL =
  'min-h-screen bg-[#f5f6f8] text-zinc-900 antialiased dark:bg-[#0f141d] dark:text-zinc-100';

type Boot =
  { phase: 'loading' } | { phase: 'ready' } | { phase: 'error'; title: string; message: string };

function ErrorScreen({
  title,
  message,
  retry,
}: {
  title: string;
  message: string;
  retry?: () => void;
}) {
  return (
    <div className={SHELL}>
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <TriangleAlert className="size-10 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold">{title}</h1>
        <p className="mt-2 max-w-md text-sm text-zinc-500">{message}</p>
        {retry && (
          <Button variant="outline" className="mt-5" onClick={retry}>
            Coba lagi
          </Button>
        )}
      </main>
    </div>
  );
}

function bootError(error: unknown): Boot {
  if (error instanceof ApiError && error.status === 404) {
    return {
      phase: 'error',
      title: 'Gallery tidak ditemukan',
      message: 'Tautan ini tidak valid. Periksa kembali tautan yang Anda terima dari studio.',
    };
  }
  if (error instanceof ApiError && error.errorCode === 'GALLERY_INACTIVE') {
    return {
      phase: 'error',
      title: 'Gallery ini sudah tidak aktif',
      message: 'Hubungi studio jika Anda masih perlu memilih foto.',
    };
  }
  return { phase: 'error', title: 'Gallery tidak dapat dimuat', message: errorMessage(error) };
}

/** The customer's page: look through the photos, pick favourites, send the choice. */
export default function PhotoSelectionPage({ token }: { token: string }) {
  const [boot, setBoot] = useState<Boot>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [info, setInfo] = useState<PublicGalleryInfo | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [state, dispatch] = useReducer(galleryReducer, initialState);

  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryPending, setEntryPending] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');

  const onSubmittedElsewhere = useCallback(() => dispatch({ type: 'submitted' }), []);
  const { flush, markSaved } = useAutoSave({
    token,
    sessionToken,
    selectedIds: state.selectedIds,
    enabled: boot.phase === 'ready' && !state.isSubmitted,
    onSubmittedElsewhere,
  });

  // ── Opening the link: the gallery, then the customer's earlier session if the browser has one ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBoot({ phase: 'loading' });
      try {
        const gallery = await publicGalleryApi.info(token);
        if (cancelled) return;
        setInfo(gallery);

        const stored = localStorage.getItem(sessionStorageKey(token));
        if (stored) {
          try {
            const session = await publicGalleryApi.getSession(token, stored);
            if (cancelled) return;
            markSaved(session.selectedPhotoIds);
            dispatch({
              type: 'restore',
              photoIds: session.selectedPhotoIds,
              submitted: session.status === 'SUBMITTED',
            });
            setCustomerName(session.customerName);
            setSessionToken(stored);
            if (session.status === 'SUBMITTED') {
              setThanks(`Pilihan Anda sudah dikirim. Terima kasih, ${session.customerName}.`);
            } else {
              toast.info('Melanjutkan sesi sebelumnya');
            }
          } catch (error) {
            // A session the server no longer knows is forgotten; any other failure is not a reason to lose it.
            if (error instanceof ApiError && error.status === 404) {
              localStorage.removeItem(sessionStorageKey(token));
            } else {
              throw error;
            }
          }
        }
        setBoot({ phase: 'ready' });
      } catch (error) {
        if (!cancelled) setBoot(bootError(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, attempt, markSaved]);

  // ── The photos: first page at once, the rest in the background, all kept in memory ─────────────
  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    (async () => {
      setLoadingPhotos(true);
      try {
        for (let page = 1; ; page += 1) {
          const result = await publicGalleryApi.photos(token, page);
          if (cancelled) return;
          setPhotos((current) => {
            const known = new Set(current.map((photo) => photo.id));
            return [...current, ...result.items.filter((photo) => !known.has(photo.id))];
          });
          if (page >= result.totalPages) break;
        }
      } catch (error) {
        if (!cancelled) toast.error(`Foto tidak dapat dimuat sepenuhnya: ${errorMessage(error)}`);
      } finally {
        if (!cancelled) setLoadingPhotos(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, sessionToken]);

  async function startSession(data: CreateSessionRequest) {
    setEntryPending(true);
    setEntryError(null);
    try {
      const session = await publicGalleryApi.createSession(token, data);
      localStorage.setItem(sessionStorageKey(token), session.sessionToken);
      markSaved([]);
      setCustomerName(data.customerName);
      setSessionToken(session.sessionToken);
    } catch (error) {
      setEntryError(errorMessage(error));
    } finally {
      setEntryPending(false);
    }
  }

  const max = info?.maxSelections ?? null;
  const selectedCount = state.selectedIds.size;
  const atLimit = max !== null && selectedCount >= max;

  const toggle = useCallback(
    (photoId: string) => {
      // The reducer ignores a click once submitted; the limit is the customer's to be told about.
      if (max !== null && !state.selectedIds.has(photoId) && state.selectedIds.size >= max) {
        toast.warning(`Maksimal ${max} foto yang boleh dipilih`);
        return;
      }
      dispatch({ type: 'toggle', photoId });
    },
    [max, state.selectedIds],
  );

  const shown = useMemo(
    () => photosFor(photos, state.selectedIds, state.activeFilter),
    [photos, state.selectedIds, state.activeFilter],
  );
  const selectedPhotos = useMemo(
    () => photos.filter((photo) => state.selectedIds.has(photo.id)),
    [photos, state.selectedIds],
  );
  const total = loadingPhotos || photos.length === 0 ? (info?.totalPhotos ?? 0) : photos.length;
  const counts = {
    all: total,
    selected: selectedCount,
    unselected: Math.max(0, total - selectedCount),
  };

  async function submit() {
    if (!sessionToken) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // The last clicks may still be waiting for their save.
      await flush();
      const result = await publicGalleryApi.submit(token, sessionToken);
      dispatch({ type: 'submitted' });
      setThanks(result.message);
      setSubmitOpen(false);
      toast.success(result.message);
    } catch (error) {
      setSubmitError(errorMessage(error));
      toast.error('Gagal submit. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  if (boot.phase === 'loading') {
    return (
      <div className={SHELL}>
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="size-6 animate-spin text-zinc-400" aria-label="Memuat gallery" />
        </main>
      </div>
    );
  }
  if (boot.phase === 'error') {
    return (
      <ErrorScreen
        title={boot.title}
        message={boot.message}
        retry={
          boot.title === 'Gallery tidak dapat dimuat' ? () => setAttempt((n) => n + 1) : undefined
        }
      />
    );
  }

  return (
    <div className={SHELL}>
      <main className="mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6">
        <header className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{info?.name}</h1>
              {info?.description && (
                <p className="mt-1 max-w-2xl text-sm text-zinc-500">{info.description}</p>
              )}
              <p className="mt-1 text-sm text-zinc-500">
                {total} Foto{customerName && ` · ${customerName}`}
              </p>
            </div>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-700 dark:text-amber-400">
              {selectedCount} dipilih
            </span>
          </div>

          {thanks && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4 text-sm text-emerald-800 dark:text-emerald-300"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <p>{thanks}</p>
            </div>
          )}

          <FilterTabs
            active={state.activeFilter}
            counts={counts}
            onChange={(filter) => dispatch({ type: 'filter', filter })}
          />
        </header>

        <section className="mt-6">
          {shown.length > 0 ? (
            <PhotoGrid
              photos={shown}
              selectedIds={state.selectedIds}
              disabled={state.isSubmitted}
              lockUnselected={atLimit}
              onToggle={toggle}
              resetKey={state.activeFilter}
            />
          ) : loadingPhotos ? (
            <p className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" />
              Memuat foto…
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-zinc-500">
              <ImageOff className="size-8" />
              <p className="text-sm">
                {photos.length === 0
                  ? 'Belum ada foto di gallery ini.'
                  : state.activeFilter === 'selected'
                    ? 'Belum ada foto yang dipilih.'
                    : 'Semua foto sudah dipilih.'}
              </p>
            </div>
          )}
          {loadingPhotos && shown.length > 0 && (
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 className="size-3.5 animate-spin" />
              Memuat foto lainnya…
            </p>
          )}
        </section>
      </main>

      {sessionToken && (
        <SelectionBar
          selectedCount={selectedCount}
          max={max}
          submitted={state.isSubmitted}
          onSubmit={() => {
            setSubmitError(null);
            setSubmitOpen(true);
          }}
        />
      )}
      <GalleryEntryModal
        isOpen={!sessionToken}
        galleryName={info?.name ?? ''}
        error={entryError}
        pending={entryPending}
        onSubmitCustomerData={startSession}
      />
      <SubmitModal
        isOpen={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmit={submit}
        selectedPhotos={selectedPhotos}
        selectedCount={selectedCount}
        pending={submitting}
        error={submitError}
      />
      <Toaster position="top-center" />
    </div>
  );
}
