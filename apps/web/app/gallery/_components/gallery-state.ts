import type { Photo } from '@/types/gallery';

export type GalleryFilter = 'all' | 'selected' | 'unselected';

export type GalleryState = {
  selectedIds: Set<string>;
  activeFilter: GalleryFilter;
  isSubmitted: boolean;
};

export type GalleryAction =
  | { type: 'toggle'; photoId: string }
  | { type: 'restore'; photoIds: string[]; submitted: boolean }
  | { type: 'filter'; filter: GalleryFilter }
  | { type: 'submitted' };

export const initialState: GalleryState = {
  selectedIds: new Set(),
  activeFilter: 'all',
  isSubmitted: false,
};

export function galleryReducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case 'toggle': {
      // Locked after submitting: the choice is final.
      if (state.isSubmitted) return state;
      const selectedIds = new Set(state.selectedIds);
      if (selectedIds.has(action.photoId)) selectedIds.delete(action.photoId);
      else selectedIds.add(action.photoId);
      return { ...state, selectedIds };
    }
    case 'restore':
      return { ...state, selectedIds: new Set(action.photoIds), isSubmitted: action.submitted };
    case 'filter':
      return { ...state, activeFilter: action.filter };
    case 'submitted':
      return { ...state, isSubmitted: true };
  }
}

/** The photos a tab shows, worked out from memory: switching tabs never asks the server. */
export function photosFor(photos: Photo[], selectedIds: Set<string>, filter: GalleryFilter) {
  if (filter === 'all') return photos;
  return photos.filter((photo) => selectedIds.has(photo.id) === (filter === 'selected'));
}

/** Order-independent fingerprint of a selection, to tell whether it changed since the last save. */
export const selectionKey = (ids: Iterable<string>) => [...ids].sort().join('|');

export const sessionStorageKey = (token: string) => `gallery_session_${token}`;

/** Close enough to the limit that the customer should notice. */
export const nearLimit = (count: number, max: number | null) => max !== null && count >= max * 0.9;
