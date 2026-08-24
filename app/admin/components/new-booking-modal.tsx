'use client';

import React, { useState } from 'react';
import { useAdmin } from '@/lib/admin-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewBookingModal({ open, onOpenChange }: NewBookingModalProps) {
  const { packages, addBooking } = useAdmin();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [university, setUniversity] = useState('Universitas Diponegoro (Undip)');
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.id || '');
  const [sessionDate, setSessionDate] = useState('2026-08-27');
  const [timeSlot, setTimeSlot] = useState('10:00 - 11:00');
  const [location, setLocation] = useState('Studio Kayastory (Tembalang)');
  const [photographer, setPhotographer] = useState('Bima Satria (Lead)');
  const [notes, setNotes] = useState('');

  const selectedPkg = packages.find((p) => p.id === selectedPackageId) || packages[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;

    const bookingCode = `KYA-2026-${Math.floor(100 + Math.random() * 900)}`;

    addBooking({
      bookingCode,
      customerName,
      customerPhone,
      customerEmail: customerEmail || `${customerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
      university,
      packageName: selectedPkg.name,
      packagePrice: selectedPkg.price,
      addons: [],
      totalPrice: selectedPkg.price,
      sessionDate,
      timeSlot,
      location,
      photographer,
      status: 'CONFIRMED',
      paymentStatus: 'PAID_FULL',
      paymentAmount: selectedPkg.price,
      paymentBank: 'Cash / Manual',
      notes,
      invoiceNumber: `INV-${bookingCode}`,
    });

    onOpenChange(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-lg sm:max-w-lg border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-zinc-900 dark:text-white">
            Tambah Reservasi Manual
          </DialogTitle>
          <p className="text-xs text-zinc-500">
            Input booking klien offline atau reservasi via chat langsung.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-600 dark:text-zinc-400 font-medium">Nama Klien *</label>
              <Input
                required
                placeholder="Nama lengkap"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="h-8.5 bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-600 dark:text-zinc-400 font-medium">No. WhatsApp *</label>
              <Input
                required
                placeholder="08xxxxxxxx"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-8.5 bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium">Universitas</label>
            <Select value={university} onValueChange={(val) => val && setUniversity(val)}>
              <SelectTrigger className="h-8.5 w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white">
                <SelectValue placeholder="Pilih Kampus" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs">
                <SelectItem value="Universitas Diponegoro (Undip)">Undip</SelectItem>
                <SelectItem value="Universitas Negeri Semarang (Unnes)">Unnes</SelectItem>
                <SelectItem value="Universitas Dian Nuswantoro (Udinus)">Udinus</SelectItem>
                <SelectItem value="Politeknik Negeri Semarang (Polines)">Polines</SelectItem>
                <SelectItem value="SCU (Unika Soegijapranata)">Unika</SelectItem>
                <SelectItem value="UIN Walisongo Semarang">UIN</SelectItem>
                <SelectItem value="Umum / Lainnya">Umum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium">Paket Foto</label>
            <Select value={selectedPackageId} onValueChange={(val) => val && setSelectedPackageId(val)}>
              <SelectTrigger className="h-8.5 w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white">
                <SelectValue placeholder="Pilih Paket" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs">
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} — Rp {pkg.price.toLocaleString('id-ID')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-600 dark:text-zinc-400 font-medium">Tanggal</label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="h-8.5 bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-600 dark:text-zinc-400 font-medium">Slot Jam</label>
              <Select value={timeSlot} onValueChange={(val) => val && setTimeSlot(val)}>
                <SelectTrigger className="h-8.5 w-full bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white">
                  <SelectValue placeholder="Pilih Jam" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs">
                  <SelectItem value="08:30 - 09:30">08:30 - 09:30</SelectItem>
                  <SelectItem value="09:30 - 10:30">09:30 - 10:30</SelectItem>
                  <SelectItem value="10:30 - 11:30">10:30 - 11:30</SelectItem>
                  <SelectItem value="13:00 - 14:30">13:00 - 14:30</SelectItem>
                  <SelectItem value="15:00 - 16:30">15:00 - 16:30</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-zinc-600 dark:text-zinc-400 font-medium">Catatan</label>
            <Textarea
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs bg-zinc-50 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white min-h-[50px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm"
            >
              Simpan Booking
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
