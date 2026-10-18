'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from './admin-queries';
import { whatsappApi, type WhatsappStatus } from './whatsapp-api';

export const whatsappKeys = {
  status: ['admin', 'whatsapp', 'status'] as const,
  qr: ['admin', 'whatsapp', 'qr'] as const,
};

/** Polls quickly while a connection is being made, and slowly once it is settled. */
export function useWhatsappStatus(fast = false) {
  return useQuery({
    queryKey: whatsappKeys.status,
    queryFn: whatsappApi.status,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      if (fast) return 2_000;
      return state === 'STARTING' || state === 'SCAN_QR' ? 3_000 : 15_000;
    },
  });
}

export function useWhatsappQr(enabled: boolean) {
  return useQuery({
    queryKey: whatsappKeys.qr,
    queryFn: whatsappApi.qr,
    enabled,
    // WAHA rotates the code about every 20 seconds, so keep it fresh while it is on screen.
    refetchInterval: 15_000,
    retry: false,
    gcTime: 0,
  });
}

function useStatusMutation(mutationFn: () => Promise<WhatsappStatus>, successMessage?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (status) => {
      queryClient.setQueryData(whatsappKeys.status, status);
      if (successMessage) toast.success(successMessage);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export const useConnectWhatsapp = () => useStatusMutation(whatsappApi.connect);
export const useDisconnectWhatsapp = () =>
  useStatusMutation(whatsappApi.disconnect, 'Koneksi WhatsApp diputus');
