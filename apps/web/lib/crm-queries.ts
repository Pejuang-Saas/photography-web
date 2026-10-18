'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from './admin-queries';
import { crmApi, type CrmChat, type CrmChatFilter } from './crm-api';

export const crmKeys = {
  all: ['admin', 'crm'] as const,
  chats: ['admin', 'crm', 'chats'] as const,
  chat: (id: string) => ['admin', 'crm', 'chat', id] as const,
  messages: (id: string) => ['admin', 'crm', 'messages', id] as const,
  categories: ['admin', 'crm', 'categories'] as const,
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

export function useCrmMessages(id: string | null) {
  return useQuery({
    queryKey: crmKeys.messages(id ?? ''),
    queryFn: () => crmApi.messages(id!),
    enabled: Boolean(id),
    refetchInterval: 5_000,
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
