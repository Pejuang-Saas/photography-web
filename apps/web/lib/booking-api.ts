import { apiRequest } from './api-client';
import type {
  BookingStatus,
  GatewayEnvironment,
  GatewayProvider,
  PaymentMode,
  PaymentPlan,
  PaymentStatus,
} from './api-types';

export type ServicePackage = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  price: number;
  durationMinutes: number;
  maxPeople: number;
  features: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ManualPaymentAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  isPrimary: boolean;
};

export type PublicPaymentSettings = {
  activeMode: PaymentMode;
  allowDownPayment: boolean;
  gatewayProvider: GatewayProvider | null;
  gatewayEnvironment: GatewayEnvironment | null;
  manualAccounts: ManualPaymentAccount[];
};

export type CreateBookingInput = {
  packageId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  sessionDate: string;
  timeSlot: string;
  paymentPlan: PaymentPlan;
  notes?: string;
};

export type Booking = {
  id: string;
  bookingCode: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  totalAmount: number;
  requiredAmount: number;
  paymentMode: PaymentMode;
  paymentPlan: PaymentPlan;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  sessionDate: string;
  timeSlot: string;
  expiresAt: string | null;
  createdAt: string;
};

export const bookingApi = {
  listPackages: () => apiRequest<ServicePackage[]>('/public/packages'),

  getPaymentSettings: () => apiRequest<PublicPaymentSettings>('/public/payment-settings'),

  createBooking: (payload: CreateBookingInput, idempotencyKey: string) =>
    apiRequest<Booking>('/public/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    }),
};
