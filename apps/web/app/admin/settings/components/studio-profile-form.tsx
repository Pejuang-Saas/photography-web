'use client';

import { useState } from 'react';
import { ExternalLink, Save } from 'lucide-react';
import type { AdminStudioSettings } from '@/lib/studio-api';
import { normalizeWhatsapp } from '@/lib/format';
import { isIdMobile, PHONE_ERROR, sanitizePhoneInput } from '@/lib/phone';
import { errorMessage, useUpdateStudioSettings } from '@/lib/admin-queries';
import { FormField } from '../../components/form-field';
import { StringListEditor } from '../../components/list-editors';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function draftFrom(settings: AdminStudioSettings) {
  return {
    studioName: settings.studioName,
    whatsappNumber: settings.whatsappNumber ?? '',
    address: settings.address ?? '',
    mapsUrl: settings.mapsUrl ?? '',
    instagramHandle: settings.instagramHandle ?? '',
    city: settings.city ?? '',
    region: settings.region ?? '',
    openTime: settings.openTime ?? '',
    closeTime: settings.closeTime ?? '',
    guarantees: settings.guarantees,
    reservationTerms: settings.reservationTerms,
    reservationsOpen: settings.reservationsOpen,
  };
}

const MAX_GUARANTEES = 6;
const MAX_TERMS = 20;

const cleaned = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

export default function StudioProfileForm({ settings }: { settings: AdminStudioSettings }) {
  const update = useUpdateStudioSettings();
  const saved = draftFrom(settings);
  const [draft, setDraft] = useState(saved);
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));

  // Blank rows are ignored on save, so they should not count as an unsaved change either.
  const dirty =
    (Object.keys(saved) as Array<keyof typeof saved>).some(
      (key) => key !== 'guarantees' && key !== 'reservationTerms' && draft[key] !== saved[key],
    ) ||
    JSON.stringify(cleaned(draft.guarantees)) !== JSON.stringify(saved.guarantees) ||
    JSON.stringify(cleaned(draft.reservationTerms)) !== JSON.stringify(saved.reservationTerms);

  const phoneInvalid = draft.whatsappNumber !== '' && !isIdMobile(draft.whatsappNumber);
  const waDigits = phoneInvalid ? '' : normalizeWhatsapp(draft.whatsappNumber);

  function handleSave() {
    update.mutate({
      studioName: draft.studioName,
      whatsappNumber: draft.whatsappNumber,
      address: draft.address,
      mapsUrl: draft.mapsUrl,
      instagramHandle: draft.instagramHandle,
      city: draft.city,
      region: draft.region,
      openTime: draft.openTime,
      closeTime: draft.closeTime,
      guarantees: cleaned(draft.guarantees),
      reservationTerms: cleaned(draft.reservationTerms),
      reservationsOpen: draft.reservationsOpen,
    });
  }

  return (
    <div className="space-y-5">
      <Card
        className={`rounded-xl shadow-sm ${
          draft.reservationsOpen
            ? 'border-zinc-200/80 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/60'
            : 'border-amber-500/40 bg-amber-500/[0.05]'
        }`}
      >
        <CardContent className="flex items-start justify-between gap-4 p-5">
          <div>
            <h3 className="text-sm font-bold">Reservasi Online</h3>
            <p className="mt-1 max-w-xl text-xs text-zinc-500 dark:text-zinc-400">
              {draft.reservationsOpen
                ? 'Aktif: customer bisa memilih paket dan memesan lewat website.'
                : 'Ditutup: website hanya menampilkan katalog. Tombol pesan disembunyikan dan reservasi baru ditolak. Customer yang sudah memesan tetap bisa melanjutkan pembayaran.'}
            </p>
          </div>
          <Switch
            checked={draft.reservationsOpen}
            onCheckedChange={(reservationsOpen) => set({ reservationsOpen })}
            aria-label="Reservasi online"
          />
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <CardTitle className="text-sm font-bold">Kontak & Lokasi</CardTitle>
          <CardDescription className="text-xs">
            Ditampilkan di landing page, langkah checkout, invoice, dan data SEO (Google).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <FormField label="Nama studio">
            <Input
              maxLength={120}
              value={draft.studioName}
              onChange={(event) => set({ studioName: event.target.value })}
            />
          </FormField>

          <FormField
            label="Nomor WhatsApp CS"
            error={phoneInvalid ? PHONE_ERROR : undefined}
            hint={
              waDigits
                ? `Tersimpan sebagai ${waDigits}`
                : 'Hanya angka, contoh 081234567890. Kosong = customer memilih kontak sendiri.'
            }
          >
            <div className="flex gap-2">
              <Input
                type="tel"
                inputMode="tel"
                aria-invalid={phoneInvalid}
                className="font-mono"
                value={draft.whatsappNumber}
                onChange={(event) =>
                  set({ whatsappNumber: sanitizePhoneInput(event.target.value) })
                }
              />
              {waDigits.length >= 9 && (
                <a
                  href={`https://wa.me/${waDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Tes nomor di WhatsApp"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Alamat studio">
              <Textarea
                rows={2}
                maxLength={300}
                value={draft.address}
                onChange={(event) => set({ address: event.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Jam buka" hint="Berlaku setiap hari. Kosongkan untuk menyembunyikan.">
            <Input
              type="time"
              value={draft.openTime}
              onChange={(event) => set({ openTime: event.target.value })}
            />
          </FormField>
          <FormField label="Jam tutup">
            <Input
              type="time"
              value={draft.closeTime}
              onChange={(event) => set({ closeTime: event.target.value })}
            />
          </FormField>

          <FormField label="Kota" hint="Dipakai di data SEO (Google).">
            <Input
              maxLength={80}
              value={draft.city}
              onChange={(event) => set({ city: event.target.value })}
            />
          </FormField>
          <FormField label="Provinsi / wilayah">
            <Input
              maxLength={80}
              value={draft.region}
              onChange={(event) => set({ region: event.target.value })}
            />
          </FormField>

          <FormField label="Link Google Maps (opsional)">
            <Input
              type="url"
              maxLength={500}
              placeholder="https://maps.app.goo.gl/..."
              value={draft.mapsUrl}
              onChange={(event) => set({ mapsUrl: event.target.value })}
            />
          </FormField>

          <FormField
            label="Instagram"
            hint={
              draft.instagramHandle
                ? `Link: instagram.com/${draft.instagramHandle.replace(/^@/, '')}`
                : undefined
            }
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                @
              </span>
              <Input
                maxLength={60}
                className="pl-6"
                placeholder="kayastory.id"
                value={draft.instagramHandle}
                onChange={(event) => set({ instagramHandle: event.target.value })}
              />
            </div>
          </FormField>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold">Jaminan Studio</CardTitle>
              <CardDescription className="text-xs">
                Tampil sebagai badge kepercayaan sebelum customer membayar. Pastikan semuanya
                benar-benar bisa dipenuhi studio.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <StringListEditor
            items={draft.guarantees}
            onChange={(guarantees) => set({ guarantees })}
            max={MAX_GUARANTEES}
            itemLabel="Jaminan"
            addLabel="Tambah Jaminan"
            emptyText="Belum ada jaminan. Tambahkan poin pertama."
            placeholder="Contoh: Garansi uang kembali jika sesi dibatalkan studio"
          />
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <CardTitle className="text-sm font-bold">Ketentuan Umum Reservasi</CardTitle>
          <CardDescription className="text-xs">
            Berlaku untuk semua paket. Tampil di katalog dan harus disetujui customer sebelum
            membayar. Ketentuan khusus tiap paket diatur di halaman Paket.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <StringListEditor
            items={draft.reservationTerms}
            onChange={(reservationTerms) => set({ reservationTerms })}
            max={MAX_TERMS}
            itemLabel="Ketentuan"
            addLabel="Tambah Ketentuan"
            emptyText="Belum ada ketentuan umum. Tambahkan poin pertama."
            placeholder="Contoh: Revisi minor maksimal 1 kali untuk setiap foto edit"
          />
        </CardContent>
      </Card>

      {(dirty || update.isError) && (
        <div className="sticky bottom-4 z-10 space-y-2 rounded-xl border border-amber-500/40 bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-zinc-950/95">
          {phoneInvalid && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Perbaiki nomor WhatsApp dulu sebelum menyimpan.
            </p>
          )}
          {update.isError && (
            <p className="text-xs text-rose-700 dark:text-rose-300">{errorMessage(update.error)}</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Ada perubahan yang belum disimpan
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={update.isPending}
                onClick={() => {
                  setDraft(saved);
                  update.reset();
                }}
                className="h-9 text-xs"
              >
                Batalkan
              </Button>
              <Button
                onClick={handleSave}
                disabled={update.isPending || phoneInvalid}
                className="h-9 gap-1.5 bg-amber-500 text-xs font-bold text-zinc-950 hover:bg-amber-600"
              >
                <Save className="size-3.5" />
                {update.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
