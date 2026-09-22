'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AdminProvider } from '@/lib/admin-context';
import type { AdminUser } from '@/lib/admin-auth';
import { authClient } from '@/lib/auth-client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import AdminSidebar from './components/sidebar';
import AdminTopbar from './components/topbar';
import BookingDetailModal from './components/booking-detail-modal';
import InvoicePreviewModal from './components/invoice-preview-modal';
import NewBookingModal from './components/new-booking-modal';

export default function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AdminUser;
}) {
  const router = useRouter();
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();

    if (!error) {
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <AdminProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased transition-colors duration-150 dark:bg-zinc-950 dark:text-zinc-100">
          <AdminSidebar user={user} />
          <div className="flex min-h-screen flex-col lg:pl-64">
            <AdminTopbar
              onOpenNewBooking={() => setIsNewBookingOpen(true)}
              onSignOut={handleSignOut}
              user={user}
            />
            <main className="flex-1 w-full p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
          <BookingDetailModal />
          <InvoicePreviewModal />
          <NewBookingModal
            open={isNewBookingOpen}
            onOpenChange={setIsNewBookingOpen}
          />
          <Toaster
            position="top-right"
            richColors={false}
            toastOptions={{
              className:
                'border border-zinc-200 bg-white text-zinc-900 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:text-white',
            }}
          />
        </div>
      </TooltipProvider>
    </AdminProvider>
  );
}
