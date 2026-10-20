'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  CreateGalleryInput,
  GalleryStatus,
  SelectionStatus,
  UpdateGalleryInput,
} from '@/types/gallery';
import { errorMessage } from './admin-queries';
import { ApiError } from './api-client';
import { galleryApi } from './gallery-api';

const fail = (error: unknown) => toast.error(errorMessage(error));

export const galleryKeys = {
  all: ['admin', 'galleries'] as const,
  list: (filter: object) => ['admin', 'galleries', 'list', filter] as const,
  detail: (id: string) => ['admin', 'galleries', 'detail', id] as const,
  sync: (id: string) => ['admin', 'galleries', 'sync', id] as const,
  photos: (id: string) => ['admin', 'galleries', 'photos', id] as const,
  selections: (id: string, filter: object) =>
    ['admin', 'galleries', 'selections', id, filter] as const,
  selection: (id: string, selectionId: string) =>
    ['admin', 'galleries', 'selection', id, selectionId] as const,
};

export function useGalleries(filter: { page: number; status?: GalleryStatus }) {
  return useQuery({
    queryKey: galleryKeys.list(filter),
    queryFn: () => galleryApi.list({ ...filter, limit: 10 }),
    // A sync started elsewhere should show up without a reload.
    refetchInterval: 15_000,
  });
}

export function useGallery(id: string) {
  return useQuery({ queryKey: galleryKeys.detail(id), queryFn: () => galleryApi.get(id) });
}

/**
 * The latest sync run. While one is going, it is asked again every 2 seconds; once it ends the
 * polling stops. A gallery that was never synced answers 404, which just means "no run yet".
 */
export function useLatestSync(id: string) {
  return useQuery({
    queryKey: galleryKeys.sync(id),
    queryFn: async () => {
      try {
        return await galleryApi.latestSync(id);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'PENDING' || status === 'RUNNING' ? 2_000 : false;
    },
  });
}

/** Starts a sync and makes every view of the gallery pick up its progress and result. */
export function useTriggerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => galleryApi.triggerSync(id),
    onError: fail,
    onSuccess: (_result, id) => {
      void queryClient.invalidateQueries({ queryKey: galleryKeys.sync(id) });
      return queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
  });
}

export function useCreateGallery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGalleryInput) => galleryApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: galleryKeys.all }),
  });
}

export function useUpdateGallery(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGalleryInput) => galleryApi.update(id, input),
    onError: fail,
    onSuccess: () => {
      toast.success('Gallery diperbarui');
      return queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
  });
}

export function useDeleteGallery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => galleryApi.remove(id),
    onError: fail,
    onSuccess: () => {
      toast.success('Gallery dihapus');
      return queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
  });
}

export function useGallerySelections(
  id: string,
  filter: { page: number; status?: SelectionStatus },
) {
  return useQuery({
    queryKey: galleryKeys.selections(id, filter),
    queryFn: () => galleryApi.selections(id, { ...filter, limit: 10 }),
    refetchInterval: 20_000,
  });
}

/** Lets a customer go: their picks are deleted and their place in the quota is free again. */
export function useRemoveSelection(galleryId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (selectionId: string) => galleryApi.removeSelection(galleryId, selectionId),
    onError: fail,
    onSuccess: () => {
      toast.success('Customer dilepas');
      // The gallery's own counts (customers, picks) change with it.
      return queryClient.invalidateQueries({ queryKey: galleryKeys.all });
    },
  });
}

export function useGallerySelection(id: string, selectionId: string | null) {
  return useQuery({
    queryKey: galleryKeys.selection(id, selectionId ?? ''),
    queryFn: () => galleryApi.selection(id, selectionId!),
    enabled: Boolean(selectionId),
  });
}
