'use client';

import React, { useState } from 'react';
import { AdminProvider } from '@/lib/admin-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import AdminSidebar from './components/sidebar';
import AdminTopbar from './components/topbar';
import BookingDetailModal from './components/booking-detail-modal';
import InvoicePreviewModal from './components/invoice-preview-modal';
import NewBookingModal from './components/new-booking-modal';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

  return (
    <AdminProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased transition-colors duration-150">
          {/* Desktop Fixed Sidebar */}
          <AdminSidebar />

          {/* Main Content Area (Full Width) */}
          <div className="flex flex-col lg:pl-64 min-h-screen">
            {/* Topbar */}
            <AdminTopbar onOpenNewBooking={() => setIsNewBookingOpen(true)} />

            {/* Page Content - Full Width */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
              {children}
            </main>
          </div>

          {/* Global Admin Modals */}
          <BookingDetailModal />
          <InvoicePreviewModal />
          <NewBookingModal
            open={isNewBookingOpen}
            onOpenChange={setIsNewBookingOpen}
          />

          {/* Sonner Toast */}
          <Toaster
            position="top-right"
            richColors={false}
            toastOptions={{
              className: 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-lg',
            }}
          />
        </div>
      </TooltipProvider>
    </AdminProvider>
  );
}
