'use client';

import { useState } from 'react';
import { FileText, Loader2, Send } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import type { CrmChat } from '@/lib/crm-api';
import {
  useCrmTemplates,
  useSendMessage,
  useSendTemplate,
  useTemplatePreview,
} from '@/lib/crm-queries';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

function FreeTextComposer({ chat }: { chat: CrmChat }) {
  const send = useSendMessage();
  const [text, setText] = useState('');
  const ready = text.trim().length > 0 && !send.isPending;

  function submit() {
    if (!ready) return;
    send.mutate({ chatId: chat.id, text: text.trim() }, { onSuccess: () => setText('') });
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          aria-label="Tulis pesan"
          placeholder="Tulis pesan… (Enter untuk kirim, Shift+Enter untuk baris baru)"
          maxLength={4000}
          value={text}
          disabled={send.isPending}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
          className="min-h-0 resize-none"
        />
        <Button
          size="icon"
          aria-label="Kirim pesan"
          disabled={!ready}
          onClick={submit}
          className="size-10 shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {send.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </div>
      {send.isError && (
        <p role="alert" className="text-xs text-rose-600">
          {errorMessage(send.error)}
        </p>
      )}
    </div>
  );
}

function TemplateComposer({ chat }: { chat: CrmChat }) {
  const templates = useCrmTemplates();
  const [selected, setSelected] = useState<string | null>(null);
  const preview = useTemplatePreview(chat.id, selected);
  const send = useSendTemplate();

  function submit() {
    if (!selected) return;
    send.mutate({ chatId: chat.id, templateId: selected }, { onSuccess: () => setSelected(null) });
  }

  return (
    <div className="space-y-3 p-3">
      <div>
        <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Pilih template pesan resmi
        </p>
        {templates.isLoading && <p className="text-xs text-zinc-500">Memuat template…</p>}
        {templates.data?.length === 0 && (
          <p className="text-xs text-zinc-500">Belum ada template yang aktif.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {templates.data?.map((template) => (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected === template.id}
              onClick={() => {
                send.reset();
                setSelected(selected === template.id ? null : template.id);
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                selected === template.id
                  ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  : 'border-zinc-300 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300',
              )}
            >
              <FileText className="size-3.5" />
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          {preview.isLoading && <p className="text-xs text-zinc-500">Menyiapkan pesan…</p>}
          {preview.isError && (
            <p role="alert" className="text-xs text-rose-600">
              {errorMessage(preview.error)}
            </p>
          )}
          {preview.data && (
            <>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Pesan yang akan dikirim
              </p>
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm text-zinc-900 dark:text-zinc-100">
                {preview.data.text}
              </p>
            </>
          )}
          {send.isError && (
            <p role="alert" className="text-xs text-rose-600">
              {errorMessage(send.error)}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
              disabled={send.isPending}
            >
              Batal
            </Button>
            <Button
              size="sm"
              disabled={!preview.data || send.isPending}
              onClick={submit}
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {send.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Kirim template
            </Button>
          </div>
        </div>
      )}

      <Textarea
        rows={1}
        disabled
        aria-label="Tulis pesan (terkunci)"
        placeholder="Pesan bebas dikunci sampai customer membalas"
        className="min-h-0 resize-none"
      />
    </div>
  );
}

/**
 * Free text while the 24-hour window is open; otherwise only the studio's approved templates, with
 * the finished text shown before it goes out. The server applies the same rule on every send.
 */
export default function CrmComposer({ chat, open }: { chat: CrmChat; open: boolean }) {
  return (
    <div className="border-t border-zinc-100 dark:border-zinc-800/70">
      {open ? <FreeTextComposer chat={chat} /> : <TemplateComposer chat={chat} />}
    </div>
  );
}
