'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';
import { CheckCircle2, Eye, ImageOff, Loader2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/admin-queries';
import { ApiError } from '@/lib/api-client';
import { usePhotoPages } from '@/lib/use-photo-pages';
import { publicGalleryApi } from '@/lib/gallery-api';
import type {
  CreateSessionRequest,
  FolderSummary,
  MediaType,
  Photo,
  PublicGalleryInfo,
} from '@/types/gallery';
import FilterTabs from './FilterTabs';
import FolderGrid, { FolderBreadcrumb } from './FolderGrid';
import GalleryEntryModal from './GalleryEntryModal';
import PhotoGrid from './PhotoGrid';
import PhotoNoteBox from './PhotoNoteBox';
import PhotoPreview from './PhotoPreview';
import { isEditPhoto } from './edit-folder';
import SelectionBar from './SelectionBar';
import TypeFilter from './TypeFilter';
import ReviewPage from './ReviewPage';
import {
  galleryReducer,
  initialState,
  sessionStorageKey,
  type GalleryFilter,
} from './gallery-state';
import { useFolderTrail } from './use-folder-trail';
import { useAutoSave } from './use-auto-save';

// The site's body is always near-black (the landing page), so this page paints its own surface
// the way the admin does, and follows the visitor's theme.
const SHELL =
  'min-h-screen bg-[#f5f6f8] text-zinc-900 antialiased dark:bg-[#0f141d] dark:text-zinc-100';

/** For screens with no header: the visitor can still switch theme. */
function CornerThemeToggle() {
  return (
    <div className="fixed right-4 top-4 z-20">
      <ThemeToggle />
    </div>
  );
}

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
      <CornerThemeToggle />
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
  const [state, dispatch] = useReducer(galleryReducer, initialState);

  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryPending, setEntryPending] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  // The review page is its own history entry (?review=1), so the browser's back button leaves it.
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [thanks, setThanks] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  // The customer's words per photo: a note on a pick, a revision request on an edited photo.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [revisions, setRevisions] = useState<Record<string, string>>({});
  const folderTrail = useFolderTrail();
  const [mediaType, setMediaType] = useState<MediaType>('all');

  const onSubmittedElsewhere = useCallback(() => dispatch({ type: 'submitted' }), []);
  // The studio released this customer while the page was open: start over rather than save forever.
  const onSessionLost = useCallback(() => {
    localStorage.removeItem(sessionStorageKey(token));
    toast.info('Sesi Anda sudah dilepas oleh studio. Halaman dimuat ulang.');
    setTimeout(() => window.location.reload(), 1500);
  }, [token]);
  const { flush, markSaved } = useAutoSave({
    token,
    sessionToken,
    selectedIds: state.selectedIds,
    enabled: boot.phase === 'ready' && !state.isSubmitted,
    onSubmittedElsewhere,
    onSessionLost,
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
            setNotes(session.notes ?? {});
            setRevisions(session.revisions ?? {});
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
      // Someone took the last place while the form was open: from here on it is look-only.
      if (error instanceof ApiError && error.errorCode === 'GALLERY_FULL') {
        setInfo((current) => current && { ...current, customersFull: true });
        toast.info('Kuota customer sudah penuh. Anda hanya bisa melihat foto.');
      } else {
        setEntryError(errorMessage(error));
      }
    } finally {
      setEntryPending(false);
    }
  }

  const max = info?.maxSelections ?? null;
  const selectedCount = state.selectedIds.size;
  const atLimit = max !== null && selectedCount >= max;

  /** Saves one photo's words. A note needs its photo saved as picked first, so the draft goes out first. */
  const saveWords = useCallback(
    async (kind: 'note' | 'revision', photoId: string, text: string) => {
      if (!sessionToken) return;
      if (kind === 'note') await flush();
      const send = kind === 'note' ? publicGalleryApi.saveNote : publicGalleryApi.saveRevision;
      await send(token, sessionToken, photoId, text);
      const clean = text.trim();
      const update = (current: Record<string, string>) => {
        const next = { ...current };
        if (clean) next[photoId] = clean;
        else delete next[photoId];
        return next;
      };
      (kind === 'note' ? setNotes : setRevisions)(update);
      toast.success(
        clean
          ? kind === 'note'
            ? 'Catatan tersimpan'
            : 'Permintaan revisi terkirim ke studio'
          : 'Dihapus',
      );
    },
    [sessionToken, token, flush],
  );

  const previewFooter = (photo: Photo) => {
    if (!sessionToken || viewOnly) return null;
    if (isEditPhoto(photo)) {
      return (
        <PhotoNoteBox
          key={`revision-${photo.id}`}
          label="Minta revisi untuk foto ini"
          placeholder="Contoh: warna terlalu gelap, tolong terangkan sedikit"
          saved={revisions[photo.id] ?? ''}
          readOnly={false}
          onSave={(text) => saveWords('revision', photo.id, text)}
        />
      );
    }
    if (!state.selectedIds.has(photo.id)) {
      return state.isSubmitted ? null : (
        <p className="text-xs text-zinc-500">Pilih foto ini untuk menambah catatan.</p>
      );
    }
    return (
      <PhotoNoteBox
        key={`note-${photo.id}`}
        label="Catatan untuk foto ini"
        placeholder="Contoh: crop lebih rapat, haluskan kulit"
        saved={notes[photo.id] ?? ''}
        readOnly={state.isSubmitted}
        onSave={(text) => saveWords('note', photo.id, text)}
      />
    );
  };

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

  // One page of the open folder (or of a tab) at a time; the next page loads as the customer scrolls.
  // Every place is taken and this visitor has none: they can look, not choose.
  const viewOnly = boot.phase === 'ready' && !!info?.customersFull && !sessionToken;
  const pages = usePhotoPages({
    queryKey: ['gallery', token, sessionToken, state.activeFilter, mediaType, folderTrail.path],
    enabled: !!sessionToken || viewOnly,
    fetchPage: (page) =>
      publicGalleryApi.photos(token, {
        page,
        folder: folderTrail.path,
        filter: state.activeFilter,
        type: mediaType,
        sessionToken: sessionToken ?? undefined,
      }),
  });
  const shown = pages.photos;
  // Folders only get in the way once the customer filters by choice, so then every photo is listed.
  const folders = state.activeFilter === 'all' ? pages.folders : [];
  const browsing =
    state.activeFilter === 'all' && (folderTrail.trail.length > 0 || folders.length > 0);

  // The last clicks may still be waiting for their save, and the server lists by what it has saved.
  const afterSave = useCallback(
    async (action: () => void) => {
      await flush().catch(() => undefined);
      action();
    },
    [flush],
  );
  const openFolder = (folder: FolderSummary) => void afterSave(() => folderTrail.open(folder));
  const goToFolder = (path: string) => void afterSave(() => folderTrail.goTo(path));
  const changeFilter = (filter: GalleryFilter) =>
    void afterSave(() => dispatch({ type: 'filter', filter }));

  const previewIndex = previewId ? shown.findIndex((photo) => photo.id === previewId) : -1;

  const total = info?.totalPhotos ?? 0;
  // "Semua" counts what the open folder holds, subfolders included; the other tabs span the gallery.
  const counts = {
    all: folderTrail.current?.count ?? total,
    selected: selectedCount,
    unselected: Math.max(0, total - selectedCount),
  };

  useEffect(() => {
    const sync = () => setReviewing(new URLSearchParams(window.location.search).has('review'));
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  async function openReview() {
    // The review lists what the server has saved, so the last clicks go first.
    await flush().catch(() => undefined);
    window.history.pushState(null, '', '?review=1');
    setReviewing(true);
    window.scrollTo(0, 0);
  }

  function leaveReview() {
    if (new URLSearchParams(window.location.search).has('review')) window.history.back();
    else setReviewing(false);
  }

  async function submit(note: string) {
    if (!sessionToken) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      // The last clicks may still be waiting for their save.
      await flush();
      const result = await publicGalleryApi.submit(token, sessionToken, note);
      dispatch({ type: 'submitted' });
      setThanks(result.message);
      leaveReview();
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
        <CornerThemeToggle />
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

  if (reviewing && sessionToken) {
    return (
      <>
        <ReviewPage
          token={token}
          sessionToken={sessionToken}
          galleryName={info?.name ?? ''}
          customerName={customerName}
          max={max}
          selectedIds={state.selectedIds}
          onRemove={toggle}
          onBack={leaveReview}
          onSubmit={submit}
          pending={submitting}
          error={submitError}
        />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <div className={SHELL}>
      <main className="mx-auto max-w-7xl px-4 pb-36 pt-8 sm:px-6">
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
            <div className="flex items-center gap-2">
              {!viewOnly && (
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-700 dark:text-amber-400">
                  {selectedCount} dipilih
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>

          {viewOnly && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] p-4 text-sm text-amber-900 dark:text-amber-300"
            >
              <Eye className="mt-0.5 size-4 shrink-0" />
              <p>
                Kuota customer untuk galeri ini sudah penuh. Anda hanya bisa melihat foto, tidak
                bisa memilih.
              </p>
            </div>
          )}

          {thanks && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-4 text-sm text-emerald-800 dark:text-emerald-300"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <p>{thanks}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Picking is off for a look-only visitor, so there is nothing to filter by. */}
            {viewOnly ? (
              <span />
            ) : (
              <FilterTabs active={state.activeFilter} counts={counts} onChange={changeFilter} />
            )}
            <TypeFilter
              value={mediaType}
              onChange={setMediaType}
              totalPhotos={total}
              totalVideos={info?.totalVideos ?? 0}
            />
          </div>
        </header>

        <section className="mt-6 space-y-4">
          {browsing && <FolderBreadcrumb path={folderTrail.path} onOpen={goToFolder} />}
          <FolderGrid folders={folders} onOpen={openFolder} />
          {shown.length > 0 ? (
            <PhotoGrid
              photos={shown}
              selectedIds={state.selectedIds}
              disabled={state.isSubmitted || viewOnly}
              lockUnselected={atLimit}
              onToggle={toggle}
              onPreview={setPreviewId}
              hasMore={!!pages.hasMore}
              loadingMore={pages.loadingMore}
              onLoadMore={pages.loadMore}
            />
          ) : pages.isLoading ? (
            <p className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" />
              Memuat foto…
            </p>
          ) : pages.isError ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-zinc-500">
              <TriangleAlert className="size-8 text-amber-500" />
              <p className="text-sm">Foto tidak dapat dimuat: {errorMessage(pages.error)}</p>
              <Button variant="outline" onClick={() => void pages.refetch()}>
                Coba lagi
              </Button>
            </div>
          ) : folders.length > 0 ? null : (
            <div className="flex flex-col items-center gap-3 py-20 text-center text-zinc-500">
              <ImageOff className="size-8" />
              <p className="text-sm">
                {state.activeFilter === 'selected'
                  ? 'Belum ada foto yang dipilih.'
                  : state.activeFilter === 'unselected'
                    ? 'Semua foto sudah dipilih.'
                    : total === 0
                      ? 'Belum ada foto di gallery ini.'
                      : mediaType !== 'all'
                        ? `Tidak ada ${mediaType === 'video' ? 'video' : 'foto'} di sini.`
                        : 'Folder ini kosong.'}
              </p>
            </div>
          )}
        </section>
      </main>

      {sessionToken && (
        <SelectionBar
          selectedCount={selectedCount}
          max={max}
          submitted={state.isSubmitted}
          onSubmit={() => void openReview()}
        />
      )}
      <GalleryEntryModal
        isOpen={!sessionToken && !viewOnly}
        galleryName={info?.name ?? ''}
        error={entryError}
        pending={entryPending}
        onSubmitCustomerData={startSession}
      />
      <PhotoPreview
        photos={shown}
        index={previewIndex >= 0 ? previewIndex : null}
        selectedIds={state.selectedIds}
        disabled={state.isSubmitted || viewOnly}
        hideSelect={viewOnly}
        onToggle={toggle}
        onNavigate={(index) => setPreviewId(shown[index]?.id ?? null)}
        onClose={() => setPreviewId(null)}
        hasMore={!!pages.hasMore}
        onLoadMore={pages.loadMore}
        total={pages.total}
        footer={previewFooter}
      />
      <Toaster position="top-center" />
    </div>
  );
}
