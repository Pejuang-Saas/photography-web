export type BookingStatus = 'PENDING_VERIFICATION' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'WAITING_CONFIRMATION' | 'PAID_DP' | 'PAID_FULL' | 'REJECTED';
export type PaymentMethod = 'BCA_TRANSFER' | 'MANDIRI_TRANSFER' | 'BRI_TRANSFER' | 'QRIS' | 'CASH';

export interface BookingAddon {
  id: string;
  name: string;
  price: number;
}

export interface Booking {
  id: string;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  university: string;
  faculty?: string;
  packageName: string;
  packagePrice: number;
  addons: BookingAddon[];
  totalPrice: number;
  sessionDate: string; // ISO date string (YYYY-MM-DD)
  timeSlot: string; // e.g. "09:00 - 10:30"
  location: string; // e.g. "Studio Kayastory Tembalang" or "Outdoor Undip Widya Puraya"
  photographer: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentProofUrl?: string;
  paymentAmount?: number;
  paymentBank?: string;
  paymentDate?: string;
  notes?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export interface PackageItem {
  id: string;
  name: string;
  slug: string;
  category: 'Solo' | 'Squad' | 'Family' | 'Cinematic';
  price: number;
  durationMinutes: number;
  maxPeople: number;
  editedPhotos: number;
  allRawIncluded: boolean;
  isActive: boolean;
  totalBookings: number;
}

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: 'BOOKING_NEW' | 'PAYMENT_PROOF' | 'RESCHEDULE' | 'SYSTEM';
  timestamp: string;
  read: boolean;
  bookingId?: string;
}
