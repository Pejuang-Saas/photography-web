'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';

/**
 * UI-only state for the admin area. All data (bookings, packages, notifications) comes from the
 * API through react-query hooks in `admin-queries.ts`; the modals read it by id.
 */
interface AdminContextType {
  selectedBookingId: string | null;
  selectedInvoiceBookingId: string | null;
  setSelectedBooking: (booking: { id: string } | null) => void;
  setSelectedInvoice: (booking: { id: string } | null) => void;
  openBookingById: (id: string | null) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedInvoiceBookingId, setSelectedInvoiceBookingId] = useState<string | null>(null);

  const setSelectedBooking = useCallback(
    (booking: { id: string } | null) => setSelectedBookingId(booking?.id ?? null),
    [],
  );
  const setSelectedInvoice = useCallback(
    (booking: { id: string } | null) => setSelectedInvoiceBookingId(booking?.id ?? null),
    [],
  );

  return (
    <AdminContext.Provider
      value={{
        selectedBookingId,
        selectedInvoiceBookingId,
        setSelectedBooking,
        setSelectedInvoice,
        openBookingById: setSelectedBookingId,
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
