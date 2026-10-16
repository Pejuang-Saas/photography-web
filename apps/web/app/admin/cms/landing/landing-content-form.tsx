'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import type { LandingContent, LandingPoint } from '@/lib/landing-content-api';
import { errorMessage, useUpdateLandingContent } from '@/lib/admin-queries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CharCounter, FormField } from '../../components/form-field';
import { PairListEditor, StringListEditor } from '../../components/list-editors';

const clean = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);
const cleanPairs = (items: LandingPoint[]) =>
  items
    .map((item) => ({ title: item.title.trim(), description: item.description.trim() }))
    .filter((item) => item.title || item.description);

/** Trims text and drops blank list rows, so what is compared and saved is the meaningful content. */
function normalize(content: LandingContent): LandingContent {
  const trim = <T extends Record<string, string>>(section: T) =>
    Object.fromEntries(Object.entries(section).map(([key, value]) => [key, value.trim()])) as T;

  return {
    seo: {
      ...trim({ title: content.seo.title, description: content.seo.description }),
      keywords: clean(content.seo.keywords),
    },
    hero: trim(content.hero),
    portfolio: trim(content.portfolio),
    about: {
      ...trim({
        heading: content.about.heading,
        subheading: content.about.subheading,
        body: content.about.body,
      }),
      points: cleanPairs(content.about.points),
    },
    packages: trim(content.packages),
    steps: cleanPairs(content.steps),
  };
}

function problems(content: LandingContent): string[] {
  const found: string[] = [];
  if (!content.seo.title) found.push('Judul SEO');
  if (!content.seo.description) found.push('Deskripsi SEO');
  if (!content.hero.headlineLine1) found.push('Baris judul hero pertama');
  if (!content.hero.primaryCta) found.push('Teks tombol utama hero');
  if (!content.hero.secondaryCta) found.push('Teks tombol kedua hero');
  if (!content.portfolio.heading) found.push('Judul katalog foto');
  if (!content.about.heading) found.push('Judul bagian Tentang');
  if (!content.packages.heading) found.push('Judul bagian paket');
  if (content.about.points.some((point) => !point.title)) found.push('Judul poin Tentang');
  if (content.steps.some((step) => !step.title)) found.push('Judul langkah alur');
  return found;
}

export default function LandingContentForm({ saved }: { saved: LandingContent }) {
  const update = useUpdateLandingContent();
  const [draft, setDraft] = useState<LandingContent>(saved);

  const normalized = normalize(draft);
  const dirty = JSON.stringify(normalized) !== JSON.stringify(saved);
  const missing = problems(normalized);

  const set = <K extends keyof LandingContent>(key: K, value: Partial<LandingContent[K]>) =>
    setDraft((current) => ({
      ...current,
      [key]: Array.isArray(value) ? value : { ...current[key], ...value },
    }));

  return (
    <div className="space-y-5">
      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <CardTitle className="text-sm font-bold">SEO & Hasil Pencarian Google</CardTitle>
          <CardDescription className="text-xs">
            Judul dan deskripsi yang tampil di hasil pencarian dan saat link dibagikan. Judul tampil
            apa adanya, jadi sertakan nama studio di dalamnya.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <FormField
            label="Judul halaman"
            counter={<CharCounter value={draft.seo.title} recommended={60} max={70} />}
            hint="Idealnya maksimal 60 karakter agar tidak terpotong di Google."
          >
            <Input
              maxLength={70}
              value={draft.seo.title}
              onChange={(event) => set('seo', { title: event.target.value })}
            />
          </FormField>
          <FormField
            label="Deskripsi"
            counter={<CharCounter value={draft.seo.description} recommended={160} max={200} />}
            hint="Idealnya maksimal 160 karakter."
          >
            <Textarea
              rows={3}
              maxLength={200}
              value={draft.seo.description}
              onChange={(event) => set('seo', { description: event.target.value })}
            />
          </FormField>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Kata kunci</span>
            <StringListEditor
              items={draft.seo.keywords}
              onChange={(keywords) => set('seo', { keywords })}
              max={30}
              itemLabel="Kata kunci"
              maxLength={80}
              addLabel="Tambah Kata Kunci"
              emptyText="Belum ada kata kunci."
              placeholder="Contoh: jasa foto wisuda semarang"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <CardTitle className="text-sm font-bold">Hero (Bagian Paling Atas)</CardTitle>
          <CardDescription className="text-xs">
            Judul tiga baris: baris kedua berwarna putih dan baris ketiga berwarna aksen.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FormField label="Label kecil di atas judul">
              <Input
                maxLength={120}
                value={draft.hero.badge}
                onChange={(event) => set('hero', { badge: event.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Judul baris 1 *">
            <Input
              maxLength={80}
              value={draft.hero.headlineLine1}
              onChange={(event) => set('hero', { headlineLine1: event.target.value })}
            />
          </FormField>
          <FormField label="Judul baris 2">
            <Input
              maxLength={80}
              value={draft.hero.headlineLine2}
              onChange={(event) => set('hero', { headlineLine2: event.target.value })}
            />
          </FormField>
          <FormField label="Judul baris 3">
            <Input
              maxLength={80}
              value={draft.hero.headlineLine3}
              onChange={(event) => set('hero', { headlineLine3: event.target.value })}
            />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Subjudul">
              <Textarea
                rows={3}
                maxLength={300}
                value={draft.hero.subtitle}
                onChange={(event) => set('hero', { subtitle: event.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Tombol utama *">
            <Input
              maxLength={40}
              value={draft.hero.primaryCta}
              onChange={(event) => set('hero', { primaryCta: event.target.value })}
            />
          </FormField>
          <FormField label="Tombol kedua *">
            <Input
              maxLength={40}
              value={draft.hero.secondaryCta}
              onChange={(event) => set('hero', { secondaryCta: event.target.value })}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <CardTitle className="text-sm font-bold">Judul Bagian Katalog & Paket</CardTitle>
          <CardDescription className="text-xs">
            Kalimat tentang DP ditambahkan otomatis di bawah deskripsi paket sesuai pengaturan
            pembayaran.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
          <FormField label="Judul katalog foto *">
            <Input
              maxLength={120}
              value={draft.portfolio.heading}
              onChange={(event) => set('portfolio', { heading: event.target.value })}
            />
          </FormField>
          <FormField label="Judul pilihan paket *">
            <Input
              maxLength={120}
              value={draft.packages.heading}
              onChange={(event) => set('packages', { heading: event.target.value })}
            />
          </FormField>
          <FormField label="Deskripsi katalog foto">
            <Textarea
              rows={3}
              maxLength={400}
              value={draft.portfolio.description}
              onChange={(event) => set('portfolio', { description: event.target.value })}
            />
          </FormField>
          <FormField label="Deskripsi pilihan paket">
            <Textarea
              rows={3}
              maxLength={400}
              value={draft.packages.description}
              onChange={(event) => set('packages', { description: event.target.value })}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <CardTitle className="text-sm font-bold">Bagian Tentang Studio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <FormField label="Judul *">
            <Input
              maxLength={160}
              value={draft.about.heading}
              onChange={(event) => set('about', { heading: event.target.value })}
            />
          </FormField>
          <FormField label="Anak judul (teks abu-abu di bawah judul)">
            <Input
              maxLength={200}
              value={draft.about.subheading}
              onChange={(event) => set('about', { subheading: event.target.value })}
            />
          </FormField>
          <FormField label="Paragraf pengantar">
            <Textarea
              rows={4}
              maxLength={600}
              value={draft.about.body}
              onChange={(event) => set('about', { body: event.target.value })}
            />
          </FormField>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Poin keunggulan
            </span>
            <PairListEditor
              items={draft.about.points}
              onChange={(points) => set('about', { points })}
              max={6}
              itemLabel="Poin"
              titlePlaceholder="Contoh: Kamu Tidak Perlu Berbakat Pose"
              descriptionPlaceholder="Penjelasan singkat poin ini"
              addLabel="Tambah Poin"
              emptyText="Belum ada poin keunggulan."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
        <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-800/80">
          <CardTitle className="text-sm font-bold">Alur Pemesanan</CardTitle>
          <CardDescription className="text-xs">
            Langkah-langkah di bagian &quot;Alur&quot; landing page, dari atas ke bawah.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <PairListEditor
            items={draft.steps}
            onChange={(steps) => set('steps', steps)}
            max={8}
            itemLabel="Langkah"
            titleMaxLength={60}
            descriptionMaxLength={220}
            titlePlaceholder="Contoh: Pilih Paket"
            descriptionPlaceholder="Penjelasan singkat langkah ini"
            addLabel="Tambah Langkah"
            emptyText="Belum ada langkah."
          />
        </CardContent>
      </Card>

      {(dirty || update.isError) && (
        <div className="sticky bottom-4 z-10 space-y-2 rounded-xl border border-amber-500/40 bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-zinc-950/95">
          {missing.length > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Lengkapi dulu: {missing.join(', ')}.
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
                disabled={update.isPending || missing.length > 0}
                onClick={() => update.mutate(normalized, { onSuccess: setDraft })}
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
