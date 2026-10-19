'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from './admin-queries';
import {
  crmApi,
  type CrmCategory,
  type CrmChat,
  type CrmChatFilter,
  type CrmMessage,
} from './crm-api';

export const crmKeys = {
  all: ['admin', 'crm'] as const,
  chats: ['admin', 'crm', 'chats'] as const,
  inbox: ['admin', 'crm', 'inbox'] as const,
  chat: (id: string) => ['admin', 'crm', 'chat', id] as const,
  messages: (id: string) => ['admin', 'crm', 'messages', id] as const,
  categories: ['admin', 'crm', 'categories'] as const,
  unread: ['admin', 'crm', 'unread'] as const,
  templates: ['admin', 'crm', 'templates'] as const,
  preview: (chatId: string, templateId: string) =>
    ['admin', 'crm', 'preview', chatId, templateId] as const,
};

const fail = (error: unknown) => toast.error(errorMessage(error));

/** Everything loaded so far for one search and filter, newest activity first. */
type Inbox = {
  items: CrmChat[];
  hasMore: boolean;
  nextCursor: string | null;
  /** True once the admin has scrolled past the first page. */
  loadedMore: boolean;
};

const byActivity = (a: CrmChat, b: CrmChat) =>
  b.lastActivityAt.localeCompare(a.lastActivityAt) || b.id.localeCompare(a.id);

/** Each conversation once, the later list winning, in inbox order. */
function mergeChats(...lists: CrmChat[][]) {
  const byId = new Map<string, CrmChat>();
  for (const list of lists) for (const chat of list) byId.set(chat.id, chat);
  return [...byId.values()].sort(byActivity);
}

/** Changes one conversation in every loaded inbox at once, without waiting for a refetch. */
function patchInbox(
  queryClient: ReturnType<typeof useQueryClient>,
  chatId: string,
  patch: (chat: CrmChat) => CrmChat,
) {
  queryClient.setQueriesData<Inbox>(
    { queryKey: crmKeys.inbox },
    (inbox) =>
      inbox && {
        ...inbox,
        items: inbox.items.map((chat) => (chat.id === chatId ? patch(chat) : chat)),
      },
  );
}

/**
 * The inbox with infinite scroll. The first page refreshes every few seconds and is merged into
 * what is already loaded, so a conversation that moves to the top as a message arrives never
 * leaves a gap or shows twice further down. More pages are fetched by cursor as the admin scrolls.
 */
export function useCrmInbox(filter: CrmChatFilter) {
  const queryClient = useQueryClient();
  const filterKey = JSON.stringify(filter);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the key only changes with the filter's content
  const queryKey = useMemo(() => [...crmKeys.inbox, filter] as const, [filterKey]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Inbox> => {
      const page = await crmApi.listChats(filter);
      const previous = queryClient.getQueryData<Inbox>(queryKey);
      if (!previous) {
        return {
          items: page.items,
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
          loadedMore: false,
        };
      }
      // What was loaded stays; the fresh first page updates the conversations it contains. Until
      // the admin scrolls past the first page, that page's own cursor is the right one.
      return {
        items: mergeChats(previous.items, page.items),
        hasMore: previous.loadedMore ? previous.hasMore : page.hasMore,
        nextCursor: previous.loadedMore ? previous.nextCursor : page.nextCursor,
        loadedMore: previous.loadedMore,
      };
    },
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
  });

  const loading = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    const inbox = queryClient.getQueryData<Inbox>(queryKey);
    if (loading.current || !inbox?.hasMore || !inbox.nextCursor) return;
    loading.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await crmApi.listChats(filter, inbox.nextCursor);
      queryClient.setQueryData<Inbox>(
        queryKey,
        (current) =>
          current && {
            items: mergeChats(current.items, page.items),
            hasMore: page.hasMore,
            nextCursor: page.nextCursor,
            loadedMore: true,
          },
      );
    } catch (error) {
      setLoadMoreError(errorMessage(error));
    } finally {
      loading.current = false;
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `filter` is represented by queryKey
  }, [queryClient, queryKey]);

  // A conversation recoloured into another category must leave a filtered view at once, even
  // though the merge keeps everything that was loaded.
  const items = useMemo(() => {
    const all = query.data?.items;
    if (!all || !filter.categoryId) return all;
    return all.filter((chat) =>
      filter.categoryId === 'none' ? !chat.category : chat.category?.id === filter.categoryId,
    );
  }, [query.data?.items, filter.categoryId]);

  return {
    items,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    dataUpdatedAt: query.dataUpdatedAt,
    hasMore: query.data?.hasMore ?? false,
    loadMore,
    loadingMore,
    loadMoreError,
  };
}

/** `placeholder` (the same conversation from the list) is shown while the full record loads. */
export function useCrmChat(id: string | null, placeholder?: CrmChat) {
  return useQuery({
    queryKey: crmKeys.chat(id ?? ''),
    queryFn: () => crmApi.getChat(id!),
    enabled: Boolean(id),
    placeholderData: placeholder,
    refetchInterval: 10_000,
  });
}

/** Oldest first, each message once, ordered by time and then id (the same order the API uses). */
function mergeMessages(...lists: CrmMessage[][]) {
  const byId = new Map<string, CrmMessage>();
  for (const list of lists) for (const message of list) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id),
  );
}

type OlderPages = { chatId: string | null; items: CrmMessage[]; hasMore: boolean | null };

/**
 * A conversation's messages: the newest page refreshes every few seconds, and older ones are
 * loaded on demand and kept, so polling never throws away what the admin scrolled back to read.
 */
export function useCrmMessages(id: string | null) {
  const latest = useQuery({
    queryKey: crmKeys.messages(id ?? ''),
    queryFn: () => crmApi.messages(id!),
    enabled: Boolean(id),
    refetchInterval: 5_000,
  });

  const [older, setOlder] = useState<OlderPages>({ chatId: null, items: [], hasMore: null });
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);

  // Older pages belong to one conversation; opening another starts clean.
  const mine =
    older.chatId === id ? older : { chatId: id, items: [] as CrmMessage[], hasMore: null };
  const latestItems = latest.data?.items;
  const items = useMemo(
    () => mergeMessages(mine.items, latestItems ?? []),
    [mine.items, latestItems],
  );
  const hasMoreOlder = mine.hasMore ?? latest.data?.hasMore ?? false;
  const oldest = items[0];

  const loadOlder = useCallback(async () => {
    if (!id || !oldest) return;
    setLoadingOlder(true);
    setOlderError(null);
    try {
      const page = await crmApi.messages(id, { before: oldest.timestamp, beforeId: oldest.id }, 50);
      setOlder((current) => ({
        chatId: id,
        items: mergeMessages(current.chatId === id ? current.items : [], page.items),
        hasMore: page.hasMore,
      }));
    } catch (error) {
      setOlderError(errorMessage(error));
    } finally {
      setLoadingOlder(false);
    }
  }, [id, oldest]);

  return {
    items,
    isLoading: latest.isLoading,
    isError: latest.isError,
    error: latest.error,
    hasMoreOlder,
    loadOlder,
    loadingOlder,
    olderError,
  };
}

/** How many messages are waiting, and who wrote last. Polled for the badge and the toast. */
export function useCrmUnread() {
  return useQuery({
    queryKey: crmKeys.unread,
    queryFn: crmApi.unread,
    refetchInterval: 8_000,
  });
}

/** The admin has opened a conversation: its unread count goes back to zero. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId: string) => crmApi.markRead(chatId),
    onSuccess: (_result, chatId) => {
      patchInbox(queryClient, chatId, (chat) => ({ ...chat, unreadCount: 0 }));
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: crmKeys.inbox }),
        queryClient.invalidateQueries({ queryKey: crmKeys.chat(chatId) }),
        queryClient.invalidateQueries({ queryKey: crmKeys.unread }),
      ]);
    },
  });
}

export function useCrmCategories() {
  return useQuery({ queryKey: crmKeys.categories, queryFn: crmApi.listCategories });
}

export function useAssignCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, categoryId }: { chatId: string; categoryId: string | null }) =>
      crmApi.assignCategory(chatId, categoryId),
    onError: fail,
    onSuccess: (_result, { chatId, categoryId }) => {
      // Show the new category in every loaded page now; the refetch below confirms it.
      const category = queryClient
        .getQueryData<CrmCategory[]>(crmKeys.categories)
        ?.find((candidate) => candidate.id === categoryId);
      patchInbox(queryClient, chatId, (chat) => ({
        ...chat,
        category: category ? { id: category.id, name: category.name, color: category.color } : null,
      }));
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: crmKeys.inbox }),
        queryClient.invalidateQueries({ queryKey: crmKeys.chat(chatId) }),
        queryClient.invalidateQueries({ queryKey: crmKeys.categories }),
      ]);
    },
  });
}

export function useSyncCrm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: crmApi.sync,
    onError: fail,
    onSuccess: (result) => {
      toast.success(
        result.stored
          ? `${result.stored} pesan baru dari ${result.chats} percakapan`
          : `Sudah terbaru (${result.chats} percakapan diperiksa)`,
      );
      return queryClient.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name, color }: { id: string | null; name?: string; color?: string }) =>
      id
        ? crmApi.updateCategory(id, { name, color })
        : crmApi.createCategory({ name: name ?? '', color: color ?? 'zinc' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: crmKeys.all }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmApi.deleteCategory(id),
    onError: fail,
    onSuccess: () => {
      toast.success('Kategori dihapus');
      return queryClient.invalidateQueries({ queryKey: crmKeys.all });
    },
  });
}

export function useCrmTemplates(enabled = true) {
  return useQuery({ queryKey: crmKeys.templates, queryFn: crmApi.listTemplates, enabled });
}

/** The finished text of a template for this conversation, or the reason it cannot be filled in. */
export function useTemplatePreview(chatId: string, templateId: string | null) {
  return useQuery({
    queryKey: crmKeys.preview(chatId, templateId ?? ''),
    queryFn: () => crmApi.previewTemplate(chatId, templateId!),
    enabled: Boolean(templateId),
    retry: false,
    staleTime: 0,
  });
}

/** After a send, the new message and the conversation summary must refresh right away. */
function useAfterSend() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: crmKeys.all });
}

export function useSendMessage() {
  const afterSend = useAfterSend();
  return useMutation({
    mutationFn: ({ chatId, text }: { chatId: string; text: string }) =>
      crmApi.sendMessage(chatId, text),
    onSuccess: afterSend,
  });
}

export function useSendTemplate() {
  const afterSend = useAfterSend();
  return useMutation({
    mutationFn: ({ chatId, templateId }: { chatId: string; templateId: string }) =>
      crmApi.sendTemplate(chatId, templateId),
    onSuccess: afterSend,
  });
}

export function useOpenCrmChat() {
  return useMutation({
    mutationFn: (bookingId: string) => crmApi.openChat(bookingId),
    onError: fail,
  });
}
