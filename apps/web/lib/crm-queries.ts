'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from './admin-queries';
import { crmApi, type CrmChat, type CrmChatFilter, type CrmMessage } from './crm-api';

export const crmKeys = {
  all: ['admin', 'crm'] as const,
  chats: ['admin', 'crm', 'chats'] as const,
  chat: (id: string) => ['admin', 'crm', 'chat', id] as const,
  messages: (id: string) => ['admin', 'crm', 'messages', id] as const,
  categories: ['admin', 'crm', 'categories'] as const,
  unread: ['admin', 'crm', 'unread'] as const,
  templates: ['admin', 'crm', 'templates'] as const,
  preview: (chatId: string, templateId: string) =>
    ['admin', 'crm', 'preview', chatId, templateId] as const,
};

const fail = (error: unknown) => toast.error(errorMessage(error));

export function useCrmChats(filter: CrmChatFilter) {
  return useQuery({
    queryKey: [...crmKeys.chats, filter],
    queryFn: () => crmApi.listChats(filter),
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
  });
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
    onSuccess: (_result, chatId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: crmKeys.chats }),
        queryClient.invalidateQueries({ queryKey: crmKeys.chat(chatId) }),
        queryClient.invalidateQueries({ queryKey: crmKeys.unread }),
      ]),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: crmKeys.all }),
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
