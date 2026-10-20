import { apiRequest } from './api-client';
import type { AddOn, BookingAddOnLine, ServicePackage } from './booking-api';
import type {
  BookingStatus,
  GatewayEnvironment,
  GatewayProvider,
  PaymentMode,
  PaymentPlan,
  PaymentStatus,
} from './api-types';

export type ManualAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isActive: boolean;
  isPrimary: boolean;
};

export type AdminPayment = {
  id: string;
  method: 'GATEWAY' | 'BANK_TRANSFER' | 'E_WALLET';
  provider: GatewayProvider | null;
  plan: PaymentPlan;
  amount: number;
  status: PaymentStatus;
  senderName: string | null;
  rejectionReason: string | null;
  verifiedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  manualAccount: ManualAccount | null;
  /** `url` is a short-lived signed link and is only present on the single-booking endpoint. */
  proof: { id: string; filename: string; mimeType: string; size: number; url?: string } | null;
};

export type AdminInvoice = {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  issuedAt: string;
};

export type AdminBooking = {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string | null;
  packageId: string;
  packageName: string;
  packagePrice: number;
  totalAmount: number;
  requiredAmount: number;
  paymentMode: PaymentMode;
  paymentPlan: PaymentPlan;
  sessionDate: string;
  timeSlot: string;
  /** Session time the add-ons lengthen it by. */
  extraMinutes: number;
  addOns: BookingAddOnLine[];
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  expiresAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  invoice: AdminInvoice | null;
  payments: AdminPayment[];
};

export type NotificationType =
  | 'BOOKING_NEW'
  | 'PAYMENT_PROOF'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REJECTED'
  | 'BOOKING_EXPIRED'
  | 'SYSTEM';

export type AdminNotification = {
  id: string;
  bookingId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type AdminPaymentSettings = {
  activeMode: PaymentMode;
  allowDownPayment: boolean;
  gatewayProvider: GatewayProvider | null;
  gatewayEnvironment: GatewayEnvironment | null;
  merchantId: string | null;
  clientKey: string | null;
  publicKey: string | null;
  serverKeyConfigured: boolean;
  secretKeyConfigured: boolean;
  webhookTokenConfigured: boolean;
  updatedAt: string;
};

export type UpdatePaymentSettingsInput = {
  activeMode: PaymentMode;
  allowDownPayment?: boolean;
  gatewayProvider?: GatewayProvider;
  gatewayEnvironment?: GatewayEnvironment;
  merchantId?: string;
  clientKey?: string;
  serverKey?: string;
  publicKey?: string;
  secretKey?: string;
  webhookToken?: string;
};

export type ManualAccountInput = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isActive?: boolean;
  isPrimary?: boolean;
};

export type ServicePackageInput = {
  name: string;
  slug: string;
  description?: string;
  category?: string;
  price: number;
  durationMinutes?: number;
  maxPeople?: number;
  features?: string[];
  sortOrder?: number;
  /** A number clears the promise when null. */
  editedPhotos?: number | null;
  driveActiveDays?: number | null;
  uploadAllHours?: number | null;
  uploadEditDays?: number | null;
  maxSpots?: number | null;
  bonusPriorityEdits?: number | null;
  lateToleranceMinutes?: number | null;
  terms?: string[];
  isActive?: boolean;
};

export type AddOnInput = {
  name: string;
  slug: string;
  description?: string;
  unitLabel?: string;
  price: number;
  extraMinutes?: number;
  maxQuantity?: number;
  categories?: string[];
  sortOrder?: number;
  isActive?: boolean;
};

const json = (body: unknown) => JSON.stringify(body);

export const adminApi = {
  listBookings: () => apiRequest<AdminBooking[]>('/admin/bookings'),
  getBooking: (id: string) => apiRequest<AdminBooking>(`/admin/bookings/${id}`),
  verifyPayment: (id: string, body: { paymentPlan: PaymentPlan; amount: number }) =>
    apiRequest<unknown>(`/admin/bookings/${id}/verify-payment`, {
      method: 'POST',
      body: json(body),
    }),
  rejectPayment: (id: string, body: { reason: string }) =>
    apiRequest<unknown>(`/admin/bookings/${id}/reject-payment`, {
      method: 'POST',
      body: json(body),
    }),

  listPackages: () => apiRequest<ServicePackage[]>('/admin/packages'),
  createPackage: (body: ServicePackageInput) =>
    apiRequest<ServicePackage>('/admin/packages', { method: 'POST', body: json(body) }),
  updatePackage: (id: string, body: Partial<ServicePackageInput>) =>
    apiRequest<ServicePackage>(`/admin/packages/${id}`, { method: 'PATCH', body: json(body) }),

  listAddOns: () => apiRequest<AddOn[]>('/admin/add-ons'),
  createAddOn: (body: AddOnInput) =>
    apiRequest<AddOn>('/admin/add-ons', { method: 'POST', body: json(body) }),
  updateAddOn: (id: string, body: Partial<AddOnInput>) =>
    apiRequest<AddOn>(`/admin/add-ons/${id}`, { method: 'PATCH', body: json(body) }),
  deleteAddOn: (id: string) => apiRequest<void>(`/admin/add-ons/${id}`, { method: 'DELETE' }),

  listNotifications: () =>
    apiRequest<{ items: AdminNotification[]; unreadCount: number }>('/admin/notifications'),
  markNotificationRead: (id: string) =>
    apiRequest<void>(`/admin/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    apiRequest<void>('/admin/notifications/read-all', { method: 'POST' }),

  getPaymentSettings: () => apiRequest<AdminPaymentSettings>('/admin/payment-settings'),
  updatePaymentSettings: (body: UpdatePaymentSettingsInput) =>
    apiRequest<unknown>('/admin/payment-settings', { method: 'PATCH', body: json(body) }),
  listManualAccounts: () => apiRequest<ManualAccount[]>('/admin/payment-accounts'),
  createManualAccount: (body: ManualAccountInput) =>
    apiRequest<ManualAccount>('/admin/payment-accounts', { method: 'POST', body: json(body) }),
  updateManualAccount: (id: string, body: Partial<ManualAccountInput>) =>
    apiRequest<ManualAccount>(`/admin/payment-accounts/${id}`, {
      method: 'PATCH',
      body: json(body),
    }),
  deleteManualAccount: (id: string) =>
    apiRequest<void>(`/admin/payment-accounts/${id}`, { method: 'DELETE' }),
};
