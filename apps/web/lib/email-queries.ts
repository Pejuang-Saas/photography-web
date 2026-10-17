'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from './admin-queries';
import {
  emailApi,
  type EmailLogFilter,
  type EmailTemplateContent,
  type UpdateEmailSettingsInput,
} from './email-api';

const fail = (error: unknown) => toast.error(errorMessage(error));

export const emailKeys = {
  settings: ['admin', 'email-settings'] as const,
  templates: ['admin', 'email-templates'] as const,
  variables: ['admin', 'email-variables'] as const,
  logs: ['admin', 'email-logs'] as const,
};

export function useEmailSettings() {
  return useQuery({ queryKey: emailKeys.settings, queryFn: emailApi.getSettings });
}

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateEmailSettingsInput) => emailApi.updateSettings(body),
    onError: fail,
    onSuccess: (saved) => {
      queryClient.setQueryData(emailKeys.settings, saved);
      toast.success('Pengaturan email disimpan');
    },
  });
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: (to: string) => emailApi.sendTest(to),
    onError: fail,
    onSuccess: ({ to }) => toast.success(`Email tes terkirim ke ${to}`),
  });
}

export function useEmailTemplates() {
  return useQuery({ queryKey: emailKeys.templates, queryFn: emailApi.listTemplates });
}

export function useEmailVariables() {
  return useQuery({
    queryKey: emailKeys.variables,
    queryFn: emailApi.variables,
    staleTime: Infinity,
  });
}

export function useSaveEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string | null; content: EmailTemplateContent }) =>
      id ? emailApi.updateTemplate(id, content) : emailApi.createTemplate(content),
    onSuccess: () => {
      toast.success('Template disimpan');
      return queryClient.invalidateQueries({ queryKey: emailKeys.templates });
    },
  });
}

export function useSetEmailTemplateActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      emailApi.setTemplateActive(id, isActive),
    onError: fail,
    onSuccess: (saved) => {
      toast.success(saved.isActive ? 'Template diaktifkan' : 'Template dinonaktifkan');
      return queryClient.invalidateQueries({ queryKey: emailKeys.templates });
    },
  });
}

export function useDuplicateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailApi.duplicateTemplate(id),
    onError: fail,
    onSuccess: () => {
      toast.success('Template diduplikasi');
      return queryClient.invalidateQueries({ queryKey: emailKeys.templates });
    },
  });
}

export function useResetEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailApi.resetTemplate(id),
    onError: fail,
    onSuccess: () => {
      toast.success('Template dikembalikan ke isi bawaan');
      return queryClient.invalidateQueries({ queryKey: emailKeys.templates });
    },
  });
}

export function useDeleteEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailApi.deleteTemplate(id),
    onError: fail,
    onSuccess: () => {
      toast.success('Template dihapus');
      return queryClient.invalidateQueries({ queryKey: emailKeys.templates });
    },
  });
}

export function useEmailLogs(filter: EmailLogFilter) {
  return useQuery({
    queryKey: [...emailKeys.logs, filter],
    queryFn: () => emailApi.listLogs(filter),
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
  });
}

export function useEmailLog(id: string | null) {
  return useQuery({
    queryKey: [...emailKeys.logs, 'detail', id],
    queryFn: () => emailApi.getLog(id!),
    enabled: Boolean(id),
  });
}

export function useResendEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => emailApi.resendLog(id),
    onError: fail,
    onSuccess: () => {
      toast.success('Email dimasukkan kembali ke antrean');
      return queryClient.invalidateQueries({ queryKey: emailKeys.logs });
    },
  });
}
