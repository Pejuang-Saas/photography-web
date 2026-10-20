'use client';

import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { CreateSessionRequest } from '@/types/gallery';

/** Asks for a name before anything can be chosen; it cannot be dismissed. */
export default function GalleryEntryModal({
  isOpen,
  galleryName,
  error,
  pending,
  onSubmitCustomerData,
}: {
  isOpen: boolean;
  galleryName: string;
  error: string | null;
  pending: boolean;
  onSubmitCustomerData: (data: CreateSessionRequest) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <Dialog open={isOpen} onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false} className="gap-5 p-6 sm:max-w-md">
        {/* The page behind is covered while this is open, so the theme switch has to be here too. */}
        <div className="absolute right-3 top-3">
          <ThemeToggle />
        </div>
        <DialogHeader className="pr-10">
          <DialogTitle>{galleryName}</DialogTitle>
          <DialogDescription>Masukkan nama Anda untuk mulai memilih foto.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || pending) return;
            onSubmitCustomerData({
              customerName: name.trim(),
              customerEmail: email.trim() || undefined,
              customerPhone: phone.trim() || undefined,
            });
          }}
        >
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Nama *</span>
            <Input
              autoFocus
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Email (opsional)
            </span>
            <Input
              type="email"
              maxLength={200}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Nomor WhatsApp (opsional)
            </span>
            <Input
              type="tel"
              maxLength={30}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-rose-600">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={!name.trim() || pending}
            className="w-full bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
          >
            {pending ? 'Memulai…' : 'Mulai Memilih'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
