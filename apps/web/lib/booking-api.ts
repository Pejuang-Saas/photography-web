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
  /** Order within its group; lower comes first. */
  sortOrder: number;
  /** What the package promises, as numbers; null when it makes no such promise. */
  editedPhotos: number | null;
  driveActiveDays: number | null;
  uploadAllHours: number | null;
  uploadEditDays: number | null;
  maxSpots: number | null;
  bonusPriorityEdits: number | null;
  lateToleranceMinutes: number | null;
  /** This package's own conditions, one sentence each. */
  terms: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Something added to a package at checkout, priced per unit. */
export type AddOn = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  /** What one unit is: "30 menit", "5 foto", "orang". */
  unitLabel: string;
  price: number;
  /** Session time one unit adds. */
  extraMinutes: number;
  maxQuantity: number;
  /** Package categories it applies to; empty means every package. */
  categories: string[];
  sortOrder: number;
  isActive: boolean;
};

/** An add-on as it was when the booking was made. */
export type BookingAddOnLine = {
  name: string;
  unitLabel: string;
  unitPrice: number;
  quantity: number;
  extraMinutes: number;
  subtotal: number;
};

export type SlotAvailability = {
  date: string;
  durationMinutes: number;
  slots: Array<{ slot: string; minutes: number; available: boolean }>;
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
  /** How long a booking holds its slot while waiting for payment, for the active mode. */
  paymentWindowMinutes: number;
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
  /** Only ids and quantities: the server prices them. */
  addOns?: Array<{ addOnId: string; quantity: number }>;
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
  /** Session time the add-ons lengthen it by. */
  extraMinutes?: number;
  addOns?: BookingAddOnLine[];
  expiresAt: string | null;
  createdAt: string;
};

export type PublicBooking = {
  bookingCode: string;
  customerName: string;
  packageName: string;
  totalAmount: number;
  requiredAmount: number;
  paymentMode: PaymentMode;
  paymentPlan: PaymentPlan;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  sessionDate: string;
  timeSlot: string;
  extraMinutes?: number;
  addOns?: BookingAddOnLine[];
  invoice: { invoiceNumber: string; amount: number; status: string; issuedAt: string } | null;
};

/** What the API returns to redraw the checkout after a refresh (no contact details). */
export type ResumedBooking = Booking & {
  customerName: string;
  /** Server clock at response time; the countdown is measured against it, not the visitor's clock. */
  serverTime: string;
  /** Open gateway pay page, so a refresh does not create a second transaction. */
  gatewayRedirectUrl: string | null;
};

export type GatewayIntent = {
  paymentId: string;
  orderId: string | null;
  provider: GatewayProvider | null;
  token?: string;
  redirectUrl?: string;
  invoiceId?: string;
};

export const bookingApi = {
  listPackages: () => apiRequest<ServicePackage[]>('/public/packages'),

  listAddOns: () => apiRequest<AddOn[]>('/public/add-ons'),

  /** Free times on a date for a package; `extraMinutes` counts add-on time in. */
  getAvailability: (date: string, packageId: string, extraMinutes = 0) =>
    apiRequest<SlotAvailability>(
      `/public/availability?date=${date}&packageId=${packageId}&extraMinutes=${extraMinutes}`,
    ),

  getPaymentSettings: () => apiRequest<PublicPaymentSettings>('/public/payment-settings'),

  createBooking: (payload: CreateBookingInput, idempotencyKey: string) =>
    apiRequest<Booking>('/public/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    }),

  getResume: (bookingId: string) =>
    apiRequest<ResumedBooking>(`/public/bookings/${bookingId}/resume`),

  getPublicBooking: (bookingCode: string) =>
    apiRequest<PublicBooking>(`/public/bookings/${encodeURIComponent(bookingCode)}`),

  createGatewayIntent: (bookingId: string, idempotencyKey: string) =>
    apiRequest<GatewayIntent>(`/public/bookings/${bookingId}/gateway/intent`, {
      method: 'POST',
      idempotencyKey,
    }),

  /** Development only: the API refuses this outside the MOCK provider and in production. */
  confirmMockGatewayPayment: (bookingId: string, idempotencyKey: string) =>
    apiRequest<{ bookingId: string; status: string }>(
      `/public/bookings/${bookingId}/gateway/confirm`,
      { method: 'POST', body: JSON.stringify({}), idempotencyKey },
    ),

  submitManualPayment: (bookingId: string, body: FormData, idempotencyKey: string) =>
    apiRequest<{ bookingId: string; status: string }>(
      `/public/bookings/${bookingId}/manual-payment`,
      { method: 'POST', body, idempotencyKey },
    ),
};
