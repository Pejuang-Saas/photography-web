'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Copy, RotateCcw, Save, Trash2 } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import { ApiError } from '@/lib/api-client';
import {
  CTA_COLORS,
  emailApi,
  type EmailPreview as EmailPreviewData,
  type EmailTemplate,
  type EmailTemplateContent,
  type EmailVariable,
} from '@/lib/email-api';
import {
  useDeleteEmailTemplate,
  useDuplicateEmailTemplate,
  useEmailVariables,
  useResetEmailTemplate,
  useSaveEmailTemplate,
} from '@/lib/email-queries';
import { FormField } from '../../../components/form-field';
import { CmsDeleteDialog } from '../../../components/cms-delete-dialog';
import EmailPreview from './email-preview';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

type TextField = 'subject' | 'heading' | 'bodyText' | 'ctaText' | 'ctaUrl' | 'footerText';

const FIELD_LABEL: Record<TextField, string> = {
  subject: 'Subjek',
  heading: 'Judul',
  bodyText: 'Isi email',
  ctaText: 'Teks tombol',
  ctaUrl: 'Tautan tombol',
  footerText: 'Footer',
};

const COLOR_LABEL: Record<string, string> = {
  '#d9a521': 'Emas',
  '#18181b': 'Hitam',
  '#059669': 'Hijau',
};

const CARD =
  'rounded-xl border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60';
const CARD_HEAD = 'border-b border-zinc-100 pb-4 dark:border-zinc-800/80';

export const BLANK_TEMPLATE: EmailTemplateContent = {
  name: '',
  description: '',
  subject: '',
  heading: '',
  bodyText: '',
  includeBookingTable: false,
  ctaText: '',
  ctaUrl: '',
  ctaColor: CTA_COLORS[0],
  footerText: '',
};

export function contentOf(template: EmailTemplate): EmailTemplateContent {
  return {
    name: template.name,
    description: template.description ?? '',
    subject: template.subject,
    heading: template.heading,
    bodyText: template.bodyText,
    includeBookingTable: template.includeBookingTable,
    ctaText: template.ctaText ?? '',
    ctaUrl: template.ctaUrl ?? '',
    ctaColor: template.ctaColor,
    footerText: template.footerText ?? '',
  };
}

/** The server reports every problem at once as a list; show them as a list, not one long line. */
function problemsOf(error: unknown): string[] {
  if (error instanceof ApiError && Array.isArray(error.body?.message)) return error.body.message;
  return [errorMessage(error)];
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TemplateEditor({
  template,
  onClose,
}: {
  /** null starts a new, empty template. */
  template: EmailTemplate | null;
  onClose: () => void;
}) {
  const saved = useMemo(() => (template ? contentOf(template) : BLANK_TEMPLATE), [template]);
  const [draft, setDraft] = useState<EmailTemplateContent>(saved);
  const set = (patch: Partial<EmailTemplateContent>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const save = useSaveEmailTemplate();
  const duplicate = useDuplicateEmailTemplate();
  const reset = useResetEmailTemplate();
  const remove = useDeleteEmailTemplate();
  const variables = useEmailVariables();
  const [resetOpen, setResetOpen] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const complete = [draft.name, draft.subject, draft.heading, draft.bodyText].every(
    (value) => value.trim() !== '',
  );
  const ctaMismatch = Boolean(draft.ctaText.trim()) !== Boolean(draft.ctaUrl.trim());

  // ── Variable insertion: the field that last had focus keeps its cursor position ─────────────
  const activeElement = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [lastField, setLastField] = useState<TextField>('bodyText');

  function handleFocus(event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    activeElement.current = event.currentTarget;
    setLastField(event.currentTarget.dataset.field as TextField);
  }

  function insertVariable(key: string) {
    const token = `{${key}}`;
    const element = activeElement.current;
    const current = draft[lastField];
    const start = element?.selectionStart ?? current.length;
    const end = element?.selectionEnd ?? current.length;
    set({ [lastField]: current.slice(0, start) + token + current.slice(end) });
    const caret = start + token.length;
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(caret, caret);
    });
  }

  // ── Live preview, rendered by the server so it matches what customers receive ────────────────
  const [preview, setPreview] = useState<EmailPreviewData | null>(null);
  const [previewNotice, setPreviewNotice] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const previewReady = [draft.subject, draft.heading, draft.bodyText].every(
    (value) => value.trim() !== '',
  );

  useEffect(() => {
    if (!previewReady) return;
    let stale = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const result = await emailApi.preview({ ...draft, name: draft.name || 'Pratinjau' });
        if (stale) return;
        setPreview(result);
        setPreviewNotice(null);
      } catch (error) {
        if (!stale) setPreviewNotice(problemsOf(error).join(' · '));
      } finally {
        if (!stale) setPreviewing(false);
      }
    }, 450);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [draft, previewReady]);

  function handleBack() {
    if (dirty && !window.confirm('Perubahan belum disimpan. Tetap keluar?')) return;
    onClose();
  }

  function handleSave() {
    save.mutate({ id: template?.id ?? null, content: draft }, { onSuccess: onClose });
  }

  const variableList = variables.data;
  const grouped = useMemo(() => {
    const groups = new Map<string, EmailVariable[]>();
    for (const variable of variableList ?? []) {
      groups.set(variable.group, [...(groups.get(variable.group) ?? []), variable]);
    }
    return [...groups.entries()];
  }, [variableList]);

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
              entityLabel="template email"
              description={
                <>
                  Template{' '}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    “{template.name}”
                  </span>{' '}
                  akan dihapus permanen. Email yang sudah terkirim tidak terpengaruh.
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
          <Button
            size="sm"
            disabled={!dirty || !complete || ctaMismatch || save.isPending}
            onClick={handleSave}
            className="gap-1.5 bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
          >
            <Save className="size-3.5" />
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
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

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Identitas</CardTitle>
              {template?.trigger ? (
                <CardDescription className="text-xs">{template.trigger}</CardDescription>
              ) : (
                <CardDescription className="text-xs">
                  Belum dipakai oleh pengiriman otomatis mana pun.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <FormField label="Nama template" hint="Hanya terlihat oleh admin.">
                <Input
                  maxLength={120}
                  value={draft.name}
                  onChange={(event) => set({ name: event.target.value })}
                />
              </FormField>
              <FormField label="Deskripsi (opsional)">
                <Input
                  maxLength={300}
                  value={draft.description}
                  onChange={(event) => set({ description: event.target.value })}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Isi Email</CardTitle>
              <CardDescription className="text-xs">
                Gunakan variabel seperti <code className="font-mono">{'{customer_name}'}</code> agar
                terisi otomatis dengan data reservasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <FormField label="Subjek">
                <Input
                  maxLength={200}
                  value={draft.subject}
                  onChange={(e) => set({ subject: e.target.value })}
                  data-field="subject"
                  onFocus={handleFocus}
                />
              </FormField>
              <FormField label="Judul">
                <Input
                  maxLength={160}
                  value={draft.heading}
                  onChange={(e) => set({ heading: e.target.value })}
                  data-field="heading"
                  onFocus={handleFocus}
                />
              </FormField>
              <FormField label="Isi email" hint="Enter membuat paragraf baru.">
                <Textarea
                  rows={8}
                  maxLength={4000}
                  value={draft.bodyText}
                  onChange={(e) => set({ bodyText: e.target.value })}
                  data-field="bodyText"
                  onFocus={handleFocus}
                />
              </FormField>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <div>
                  <h3
                    id="tpl-table"
                    className="text-sm font-semibold text-zinc-900 dark:text-white"
                  >
                    Tampilkan rincian reservasi
                  </h3>
                  <p className="text-xs text-zinc-500">Tabel kode, paket, jadwal, dan biaya.</p>
                </div>
                <Switch
                  checked={draft.includeBookingTable}
                  onCheckedChange={(includeBookingTable) => set({ includeBookingTable })}
                  aria-labelledby="tpl-table"
                />
              </div>
            </CardContent>
          </Card>

          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Tombol & Footer</CardTitle>
              <CardDescription className="text-xs">
                Tombol hanya muncul jika teks dan tautannya terisi, dan tautannya berisi alamat yang
                valid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Teks tombol">
                  <Input
                    maxLength={60}
                    value={draft.ctaText}
                    onChange={(e) => set({ ctaText: e.target.value })}
                    data-field="ctaText"
                    onFocus={handleFocus}
                  />
                </FormField>
                <FormField
                  label="Tautan tombol"
                  hint="https://… atau variabel seperti {invoice_url}"
                  error={ctaMismatch ? 'Isi teks dan tautan tombol bersama-sama' : undefined}
                >
                  <Input
                    maxLength={500}
                    value={draft.ctaUrl}
                    onChange={(e) => set({ ctaUrl: e.target.value })}
                    data-field="ctaUrl"
                    onFocus={handleFocus}
                  />
                </FormField>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Warna tombol
                </span>
                <div role="radiogroup" aria-label="Warna tombol" className="flex gap-2">
                  {CTA_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      role="radio"
                      aria-checked={draft.ctaColor === color}
                      aria-label={COLOR_LABEL[color]}
                      onClick={() => set({ ctaColor: color })}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        draft.ctaColor === color
                          ? 'border-amber-500 bg-amber-500/10 text-zinc-900 dark:text-white'
                          : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400'
                      }`}
                    >
                      <span
                        className="size-3.5 rounded-full border border-black/10"
                        style={{ background: color }}
                      />
                      {COLOR_LABEL[color]}
                    </button>
                  ))}
                </div>
              </div>
              <FormField label="Footer (opsional)">
                <Textarea
                  rows={3}
                  maxLength={1000}
                  value={draft.footerText}
                  onChange={(e) => set({ footerText: e.target.value })}
                  data-field="footerText"
                  onFocus={handleFocus}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Variabel</CardTitle>
              <CardDescription className="text-xs">
                Klik untuk menyisipkan ke kolom{' '}
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {FIELD_LABEL[lastField]}
                </span>{' '}
                di posisi kursor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {grouped.map(([group, items]) => (
                <div key={group}>
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    {group}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((variable) => (
                      <button
                        key={variable.key}
                        type="button"
                        title={`${variable.label}, contoh: ${variable.sample}`}
                        // Keep the caret in the field while clicking.
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertVariable(variable.key)}
                        className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[11px] text-zinc-700 transition-colors hover:border-amber-500/60 hover:bg-amber-500/10 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        {`{${variable.key}}`}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-4">
          <Card className={CARD}>
            <CardHeader className={CARD_HEAD}>
              <CardTitle className="text-sm font-bold">Pratinjau</CardTitle>
              <CardDescription className="text-xs">
                Memakai data contoh dan profil studio asli. Berubah otomatis saat Anda mengetik.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <EmailPreview
                subject={preview?.subject}
                html={previewReady ? (preview?.html ?? null) : null}
                loading={previewing}
                notice={
                  previewReady
                    ? previewNotice
                    : 'Isi subjek, judul, dan isi email untuk melihat pratinjau.'
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Kembalikan ke isi bawaan?"
        description="Semua perubahan pada template ini akan hilang dan diganti isi aslinya. Template juga akan diaktifkan kembali."
        confirmLabel="Kembalikan"
        pending={reset.isPending}
        onConfirm={() =>
          template &&
          reset.mutate(template.id, { onSuccess: () => (setResetOpen(false), onClose()) })
        }
      />
    </div>
  );
}
