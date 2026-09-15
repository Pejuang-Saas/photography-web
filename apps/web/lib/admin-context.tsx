'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Booking, PackageItem, AdminNotification, BookingStatus } from '@/types/admin';
import { INITIAL_BOOKINGS, INITIAL_PACKAGES, INITIAL_NOTIFICATIONS } from '@/lib/mock-data';
import { toast } from 'sonner';

interface AdminContextType {
  bookings: Booking[];
  packages: PackageItem[];
  notifications: AdminNotification[];
  selectedBooking: Booking | null;
  selectedInvoice: Booking | null;
  setSelectedBooking: (booking: Booking | null) => void;
  setSelectedInvoice: (booking: Booking | null) => void;
  verifyPayment: (bookingId: string, verifiedAmount: number, isFull: boolean) => void;
  rejectPayment: (bookingId: string, reason: string) => void;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: number;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [packages] = useState<PackageItem[]>(INITIAL_PACKAGES);
  const [notifications, setNotifications] = useState<AdminNotification[]>(INITIAL_NOTIFICATIONS);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Booking | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const verifyPayment = (bookingId: string, verifiedAmount: number, isFull: boolean) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const generatedInvoiceNumber = booking.invoiceNumber || `INV-KYA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    setBookings((prev) =>
      prev.map((item) => {
        if (item.id === bookingId) {
          return {
            ...item,
            status: 'CONFIRMED',
            paymentStatus: isFull ? 'PAID_FULL' : 'PAID_DP',
            paymentAmount: verifiedAmount,
            invoiceNumber: generatedInvoiceNumber,
          };
        }
        return item;
      })
    );

    // Update notification
    const newNotif: AdminNotification = {
      id: `notif-${Date.now()}`,
      title: 'Pembayaran Dikonfirmasi & Invoice Terkirim',
      message: `Invoice ${generatedInvoiceNumber} telah otomatis dikirim via WhatsApp ke ${booking.customerName} (${booking.customerPhone}).`,
      type: 'SYSTEM',
      timestamp: 'Baru saja',
      read: false,
      bookingId: booking.id,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Close modal
    setSelectedBooking(null);

    // Sonner toast with detailed action feedback
    toast.success('Pembayaran Berhasil Dikonfirmasi!', {
      description: `Invoice ${generatedInvoiceNumber} dan bukti pemesanan otomatis dikirimkan ke WhatsApp ${booking.customerName} (${booking.customerPhone}).`,
      duration: 5000,
    });
  };

  const rejectPayment = (bookingId: string, reason: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    setBookings((prev) =>
      prev.map((item) => {
        if (item.id === bookingId) {
          return {
            ...item,
            paymentStatus: 'REJECTED',
            notes: `${item.notes ? item.notes + ' | ' : ''}Catatan Penolakan: ${reason}`,
          };
        }
        return item;
      })
    );

    setSelectedBooking(null);

    toast.error('Bukti Pembayaran Ditolak', {
      description: `Notifikasi permintaan upload ulang bukti transfer telah dikirim ke WhatsApp ${booking.customerName}.`,
    });
  };

  const updateBookingStatus = (bookingId: string, status: BookingStatus) => {
    setBookings((prev) =>
      prev.map((item) => (item.id === bookingId ? { ...item, status } : item))
    );
    toast.info('Status Reservasi Diperbarui', {
      description: `Status telah diubah menjadi ${status}.`,
    });
  };

  const addBooking = (newBookingData: Omit<Booking, 'id' | 'createdAt'>) => {
    const id = `bk-${Date.now()}`;
    const newBooking: Booking = {
      ...newBookingData,
      id,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    setBookings((prev) => [newBooking, ...prev]);
    toast.success('Booking Manual Berhasil Dibuat!', {
      description: `Kode Reservasi: ${newBooking.bookingCode} untuk ${newBooking.customerName}`,
    });
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('Semua notifikasi ditandai telah dibaca');
  };

  return (
    <AdminContext.Provider
      value={{
        bookings,
        packages,
        notifications,
        selectedBooking,
        selectedInvoice,
        setSelectedBooking,
        setSelectedInvoice,
        verifyPayment,
        rejectPayment,
        updateBookingStatus,
        addBooking,
        markNotificationRead,
        markAllNotificationsRead,
        unreadCount,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
