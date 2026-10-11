'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  adminApi,
  type ManualAccountInput,
  type ServicePackageInput,
  type UpdatePaymentSettingsInput,
} from './admin-api';
import { ApiError } from './api-client';

export const adminKeys = {
  bookings: ['admin', 'bookings'] as const,
  booking: (id: string) => ['admin', 'bookings', id] as const,
  packages: ['admin', 'packages'] as const,
  notifications: ['admin', 'notifications'] as const,
  paymentSettings: ['admin', 'payment-settings'] as const,
  manualAccounts: ['admin', 'payment-accounts'] as const,
};

const POLL_MS = 30_000;

export function errorMessage(error: unknown, fallback = 'Permintaan gagal diproses.') {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export function useAdminBookings() {
  return useQuery({
    queryKey: adminKeys.bookings,
    queryFn: adminApi.listBookings,
    refetchInterval: POLL_MS,
  });
}

/** Single booking; its proof image URL is a signed link, so it is never served from a stale cache. */
export function useAdminBooking(id: string | null) {
  return useQuery({
    queryKey: adminKeys.booking(id ?? ''),
    queryFn: () => adminApi.getBooking(id!),
    enabled: Boolean(id),
    staleTime: 0,
    gcTime: 60_000,
  });
}

export function useAdminPackages() {
  return useQuery({ queryKey: adminKeys.packages, queryFn: adminApi.listPackages });
}

export function useAdminNotifications() {
  return useQuery({
    queryKey: adminKeys.notifications,
    queryFn: adminApi.listNotifications,
    refetchInterval: POLL_MS,
  });
}

function useInvalidateBookingData() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.bookings }),
      queryClient.invalidateQueries({ queryKey: adminKeys.notifications }),
    ]);
}

export function useVerifyPayment() {
  const invalidate = useInvalidateBookingData();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      paymentPlan: 'DP_50' | 'FULL';
      amount: number;
    }) => adminApi.verifyPayment(id, body),
    onSuccess: () => {
      toast.success('Pembayaran dikonfirmasi', {
        description: 'Invoice diterbitkan. Notifikasi ke customer dikirim lewat antrean.',
      });
      return invalidate();
    },
  });
}

export function useRejectPayment() {
  const invalidate = useInvalidateBookingData();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectPayment(id, { reason }),
    onSuccess: () => {
      toast.error('Pembayaran ditolak', { description: 'Slot jadwal dilepas kembali.' });
      return invalidate();
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.notifications }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminKeys.notifications }),
  });
}

export function useSavePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: ServicePackageInput }) =>
      id ? adminApi.updatePackage(id, body) : adminApi.createPackage(body),
    onSuccess: (_data, { id }) => {
      toast.success(id ? 'Paket diperbarui' : 'Paket ditambahkan');
      return queryClient.invalidateQueries({ queryKey: adminKeys.packages });
    },
  });
}

export function usePaymentSettings() {
  return useQuery({ queryKey: adminKeys.paymentSettings, queryFn: adminApi.getPaymentSettings });
}

export function useManualAccounts() {
  return useQuery({ queryKey: adminKeys.manualAccounts, queryFn: adminApi.listManualAccounts });
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdatePaymentSettingsInput) => adminApi.updatePaymentSettings(body),
    onSuccess: () => {
      toast.success('Pengaturan pembayaran disimpan');
      // The public booking dialog reads the same settings, so refresh them everywhere.
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.paymentSettings }),
        queryClient.invalidateQueries({ queryKey: ['public', 'payment-settings'] }),
      ]);
    },
  });
}

export function useSaveManualAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Partial<ManualAccountInput> }) =>
      id
        ? adminApi.updateManualAccount(id, body)
        : adminApi.createManualAccount(body as ManualAccountInput),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.manualAccounts }),
        queryClient.invalidateQueries({ queryKey: ['public', 'payment-settings'] }),
      ]),
  });
}

export function useDeleteManualAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteManualAccount,
    onSuccess: () => {
      toast.success('Rekening dihapus');
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.manualAccounts }),
        queryClient.invalidateQueries({ queryKey: ['public', 'payment-settings'] }),
      ]);
    },
  });
}
