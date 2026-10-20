'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bold,
  Copy,
  Italic,
  RotateCcw,
  Save,
  Send,
  Smile,
  Strikethrough,
  Trash2,
} from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import { ApiError } from '@/lib/api-client';
import {
  whatsappTemplateApi,
  type TemplateCategory,
  type TemplatePreview,
  type WhatsappTemplate,
  type WhatsappTemplateContent,
} from '@/lib/whatsapp-template-api';
import {
  useDeleteWhatsappTemplate,
  useDuplicateWhatsappTemplate,
  useResetWhatsappTemplate,
  useSaveWhatsappTemplate,
  useSendTemplateTest,
  useWhatsappTemplateVariables,
} from '@/lib/whatsapp-template-queries';
import { cn } from '@/lib/utils';
import { CmsDeleteDialog } from '../../../../components/cms-delete-dialog';
import { FormField } from '../../../../components/form-field';
import TemplateHealthCard from './template-health-card';
import VariableChipsBar from './variable-chips-bar';
import { insertAt, toggleMarker, type FormatMarker } from './whatsapp-format';
import WhatsappPhoneSimulator from './whatsapp-phone-simulator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

const CARD =
  'rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60';
const CARD_HEAD = 'border-b border-zinc-100 pb-4 dark:border-zinc-800/80';
const TOOL =
  'inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition-colors hover:border-amber-500/60 hover:bg-amber-500/10 dark:border-zinc-800 dark:text-zinc-300';
const EMOJIS = ['📸', '🎓', '✨', '📅', '📍', '🔔', '✅', '😊', '👋', '⏰', '🙏', '💛', '🎉', '📷'];
const MAX_LENGTH = 4000;

const BLANK: WhatsappTemplateContent = { name: '', category: 'TRANSACTIONAL', body: '' };

const contentOf = (template: WhatsappTemplate): WhatsappTemplateContent => ({
  name: template.name,
  category: template.category,
  body: template.body,
});

/** The server reports every problem at once as a list; show them as a list, not one long line. */
function problemsOf(error: unknown): string[] {
  if (error instanceof ApiError && Array.isArray(error.body?.message)) return error.body.message;
  return [errorMessage(error)];
}

export default function TemplateEditorWorkspace({
  template,
  onClose,
}: {
  /** null starts a new, empty template. */
  template: WhatsappTemplate | null;
  onClose: () => void;
}) {
  const saved = useMemo(() => (template ? contentOf(template) : BLANK), [template]);
  const [draft, setDraft] = useState<WhatsappTemplateContent>(saved);
  const set = (patch: Partial<WhatsappTemplateContent>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const options = useWhatsappTemplateVariables();
  const save = useSaveWhatsappTemplate();
  const duplicate = useDuplicateWhatsappTemplate();
  const reset = useResetWhatsappTemplate();
  const remove = useDeleteWhatsappTemplate();
  const sendTest = useSendTemplateTest();
  const [resetOpen, setResetOpen] = useState(false);
  const [testPhone, setTestPhone] = useState('');

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const bodyEmpty = draft.body.trim() === '';

  // ── Text editing: the toolbar and the chips work on the caret or selection ────────────────────
  const textarea = useRef<HTMLTextAreaElement>(null);

  function edit(change: (text: string, start: number, end: number) => ReturnType<typeof insertAt>) {
    const element = textarea.current;
    const start = element?.selectionStart ?? draft.body.length;
    const end = element?.selectionEnd ?? draft.body.length;
    const next = change(draft.body, start, end);
    set({ body: next.text });
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(next.start, next.end);
    });
  }
  const insert = (token: string) => edit((text, start, end) => insertAt(text, start, end, token));
  const format = (marker: FormatMarker) =>
    edit((text, start, end) => toggleMarker(text, start, end, marker));

  // ── Live preview and health, from the server so it matches what customers receive ────────────
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (bodyEmpty) return;
    let stale = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const result = await whatsappTemplateApi.preview(draft.body);
        if (!stale) setPreview(result);
      } catch {
        // The preview is a convenience; saving reports real problems.
      } finally {
        if (!stale) setPreviewing(false);
      }
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [draft.body, bodyEmpty]);

  const shown = bodyEmpty ? null : preview;
  const blocked = shown?.health.level === 'error';
  const canSave = dirty && draft.name.trim() !== '' && !bodyEmpty && !blocked && !save.isPending;

  function handleBack() {
    if (dirty && !window.confirm('Perubahan belum disimpan. Tetap keluar?')) return;
    onClose();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={handleBack} className="-ml-2 gap-1.5">
          <ArrowLeft className="size-3.5" />
          Kembali ke daftar
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {template && (
            <Button
              variant="outline"
              size="sm"
              disabled={duplicate.isPending}
              onClick={() => duplicate.mutate(template.id, { onSuccess: onClose })}
              className="gap-1.5"
            >
              <Copy className="size-3.5" />
              Duplikat
            </Button>
          )}
          {template?.isSystem && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetOpen(true)}
              className="gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              Kembalikan ke bawaan
            </Button>
          )}
          {template && !template.isSystem && (
            <CmsDeleteDialog
              title={template.name}
              entityLabel="template WhatsApp"
              description={
                <>
                  Template{' '}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    “{template.name}”
                  </span>{' '}
                  akan dihapus permanen. Pesan yang sudah terkirim tidak terpengaruh.
                </>
              }
              isPending={remove.isPending}
              onConfirm={() => remove.mutate(template.id, { onSuccess: onClose })}
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="size-3.5" />
                  Hapus
                </Button>
              }
            />
          )}
          <Button variant="outline" size="sm" onClick={handleBack}>
            Batal
          </Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() =>
              save.mutate({ id: template?.id ?? null, content: draft }, { onSuccess: onClose })
            }
            className="gap-1.5 bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
          >
            <Save className="size-3.5" />
            {save.isPending ? 'Menyimpan…' : 'Simpan Template'}
          </Button>
        </div>
      </div>

      {save.isError && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/30 bg-rose-500/[0.05] p-3.5 text-xs text-rose-700 dark:text-rose-300"
        >
          <p className="font-semibold">Template belum bisa disimpan:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {problemsOf(save.error).map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Identitas</CardTitle>
              <CardDescription className="text-xs">
                {template?.trigger ??
                  'Dikirim lewat tombol template di Pesan Pelanggan, bukan oleh sistem secara otomatis.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <FormField label="Nama template" hint="Hanya terlihat oleh admin.">
                <Input
                  maxLength={120}
                  value={draft.name}
                  onChange={(event) => set({ name: event.target.value })}
                />
              </FormField>
              <div className="space-y-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Kategori pesan
                </span>
                <div role="radiogroup" aria-label="Kategori pesan" className="flex flex-wrap gap-2">
                  {(options.data?.categories ?? []).map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      role="radio"
                      aria-checked={draft.category === category.value}
                      onClick={() => set({ category: category.value as TemplateCategory })}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        draft.category === category.value
                          ? 'border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-white'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400',
                      )}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Isi Pesan</CardTitle>
              <CardDescription className="text-xs">
                Klik variabel di bawah untuk menyisipkannya di posisi kursor. Pratinjau di sebelah
                kanan memakai data contoh.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Tebal"
                  title="Tebal (*teks*)"
                  className={TOOL}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => format('*')}
                >
                  <Bold className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Miring"
                  title="Miring (_teks_)"
                  className={TOOL}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => format('_')}
                >
                  <Italic className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Coret"
                  title="Coret (~teks~)"
                  className={TOOL}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => format('~')}
                >
                  <Strikethrough className="size-3.5" />
                </button>
                <Popover>
                  <PopoverTrigger
                    aria-label="Sisipkan emoji"
                    title="Emoji"
                    className={TOOL}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    <Smile className="size-3.5" />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64">
                    <div className="grid grid-cols-7 gap-1">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          aria-label={`Emoji ${emoji}`}
                          onClick={() => insert(emoji)}
                          className="rounded-md p-1.5 text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <span
                  className={cn(
                    'ml-auto text-[11px] tabular-nums',
                    draft.body.length > MAX_LENGTH ? 'text-rose-600' : 'text-zinc-500',
                  )}
                >
                  {draft.body.length.toLocaleString('id-ID')} / {MAX_LENGTH.toLocaleString('id-ID')}{' '}
                  karakter
                </span>
              </div>
              <Textarea
                ref={textarea}
                aria-label="Isi pesan"
                rows={11}
                value={draft.body}
                onChange={(event) => set({ body: event.target.value })}
                placeholder="Halo {customer_name}! …"
                className="font-sans leading-relaxed"
              />
              <VariableChipsBar variables={options.data?.variables ?? []} onInsert={insert} />
            </CardContent>
          </Card>

          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Kesehatan Pesan</CardTitle>
              <CardDescription className="text-xs">
                Memeriksa variabel yang rusak dan hal-hal yang membuat pesan terkesan spam.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <TemplateHealthCard health={shown?.health ?? null} pending={previewing} />
            </CardContent>
          </Card>

          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Uji Kirim</CardTitle>
              <CardDescription className="text-xs">
                Kirim pesan ini, berisi data contoh, ke satu nomor agar terlihat di ponsel
                sungguhan. Ditandai &ldquo;[UJI COBA TEMPLATE]&rdquo;.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendTest.mutate({ body: draft.body, phone: testPhone });
                }}
              >
                <div className="min-w-48 flex-1">
                  <FormField label="Nomor WhatsApp tujuan">
                    <Input
                      inputMode="tel"
                      placeholder="08123456789"
                      value={testPhone}
                      onChange={(event) => setTestPhone(event.target.value)}
                    />
                  </FormField>
                </div>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={
                    sendTest.isPending ||
                    bodyEmpty ||
                    blocked ||
                    testPhone.replace(/\D/g, '').length < 9
                  }
                  className="gap-1.5"
                >
                  <Send className="size-3.5" />
                  {sendTest.isPending ? 'Mengirim…' : 'Kirim Pesan Uji Coba'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-4">
          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Pratinjau di Ponsel</CardTitle>
              <CardDescription className="text-xs">
                Berubah otomatis saat Anda mengetik.
              </CardDescription>
            </CardHeader>
            <CardContent className="py-6">
              <WhatsappPhoneSimulator text={shown?.text ?? null} loading={previewing} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kembalikan ke isi bawaan?</DialogTitle>
            <DialogDescription>
              Semua perubahan pada template ini akan hilang dan diganti isi aslinya.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={reset.isPending}
              onClick={() =>
                template &&
                reset.mutate(template.id, {
                  onSuccess: () => {
                    setResetOpen(false);
                    onClose();
                  },
                })
              }
            >
              Kembalikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
