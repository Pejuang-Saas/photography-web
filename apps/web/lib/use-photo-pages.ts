'use client';

import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Photo, PhotoPage } from '@/types/gallery';

/**
 * A gallery's photos one page at a time, for infinite scroll. Nothing is kept once the list is
 * left, so coming back to a folder or tab asks again and shows what is saved by then.
 */
export function usePhotoPages({
  queryKey,
  fetchPage,
  enabled = true,
}: {
  /** Everything that changes which photos are listed: folder, tab, gallery. */
  queryKey: readonly unknown[];
  fetchPage: (page: number) => Promise<PhotoPage>;
  enabled?: boolean;
}) {
  const query = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    gcTime: 0,
  });

  // A sync can shift photos between pages while someone scrolls, so a photo is listed once.
  const photos = useMemo(() => {
    const seen = new Set<string>();
    const list: Photo[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const photo of page.items) {
        if (!seen.has(photo.id)) {
          seen.add(photo.id);
          list.push(photo);
        }
      }
    }
    return list;
  }, [query.data]);

  const first = query.data?.pages[0];
  return {
    photos,
    folders: first?.folders ?? [],
    total: first?.total ?? 0,
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
