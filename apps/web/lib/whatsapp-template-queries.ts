'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from './admin-queries';
import { crmKeys } from './crm-queries';
import { whatsappTemplateApi, type WhatsappTemplateContent } from './whatsapp-template-api';

const fail = (error: unknown) => toast.error(errorMessage(error));

export const whatsappTemplateKeys = {
  list: ['admin', 'whatsapp-templates'] as const,
  variables: ['admin', 'whatsapp-template-variables'] as const,
};

/** The Pesan Pelanggan offers the active templates, so it must hear about every change made here. */
function useRefreshTemplates() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: whatsappTemplateKeys.list }),
      queryClient.invalidateQueries({ queryKey: crmKeys.templates }),
    ]);
}

export function useWhatsappTemplates() {
  return useQuery({ queryKey: whatsappTemplateKeys.list, queryFn: whatsappTemplateApi.list });
}

export function useWhatsappTemplateVariables() {
  return useQuery({
    queryKey: whatsappTemplateKeys.variables,
    queryFn: whatsappTemplateApi.variables,
    staleTime: Infinity,
  });
}

export function useSaveWhatsappTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: ({ id, content }: { id: string | null; content: WhatsappTemplateContent }) =>
      id ? whatsappTemplateApi.update(id, content) : whatsappTemplateApi.create(content),
    onSuccess: () => {
      toast.success('Template disimpan');
      return refresh();
    },
  });
}

export function useSetWhatsappTemplateActive() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      whatsappTemplateApi.setActive(id, isActive),
    onError: fail,
    onSuccess: (saved) => {
      toast.success(saved.isActive ? 'Template diaktifkan' : 'Template dinonaktifkan');
      return refresh();
    },
  });
}

export function useDuplicateWhatsappTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: (id: string) => whatsappTemplateApi.duplicate(id),
    onError: fail,
    onSuccess: () => {
      toast.success('Template diduplikasi');
      return refresh();
    },
  });
}

export function useResetWhatsappTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: (id: string) => whatsappTemplateApi.reset(id),
    onError: fail,
    onSuccess: () => {
      toast.success('Template dikembalikan ke isi bawaan');
      return refresh();
    },
  });
}

export function useDeleteWhatsappTemplate() {
  const refresh = useRefreshTemplates();
  return useMutation({
    mutationFn: (id: string) => whatsappTemplateApi.remove(id),
    onError: fail,
    onSuccess: () => {
      toast.success('Template dihapus');
      return refresh();
    },
  });
}

export function useSendTemplateTest() {
  return useMutation({
    mutationFn: ({ body, phone }: { body: string; phone: string }) =>
      whatsappTemplateApi.testSend(body, phone),
    onError: fail,
    onSuccess: ({ to }) => toast.success(`Pesan uji coba terkirim ke ${to}`),
  });
}
