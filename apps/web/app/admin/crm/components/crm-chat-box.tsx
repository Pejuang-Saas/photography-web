'use client';

import { useEffect, useRef } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Info,
  Send,
} from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import type { CrmCategory, CrmChat, CrmMessage } from '@/lib/crm-api';
import { crmColor } from '@/lib/crm-colors';
import { formatClockWib, formatDayHeading, initialsOf, isNewDay } from '@/lib/crm-format';
import { useAssignCategory, useCrmMessages } from '@/lib/crm-queries';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import CategoryBadge from './category-badge';
import CrmWindowBanner from './crm-window-banner';

function Ticks({ ack }: { ack: number }) {
  if (ack < 0)
    return <AlertCircle aria-label="Gagal terkirim" className="size-3.5 text-rose-500" />;
  if (ack === 0) return <Clock aria-label="Menunggu" className="size-3 text-zinc-400" />;
  if (ack === 1) return <Check aria-label="Terkirim" className="size-3.5 text-zinc-400" />;
  return (
    <CheckCheck
      aria-label={ack >= 3 ? 'Dibaca' : 'Diterima'}
      className={cn('size-3.5', ack >= 3 ? 'text-sky-500' : 'text-zinc-400')}
    />
  );
}

function Bubble({ message }: { message: CrmMessage }) {
  const mediaOnly = message.hasMedia && !message.body;
  return (
    <div className={cn('flex', message.fromMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm',
          message.fromMe
            ? 'rounded-br-md bg-emerald-100 text-emerald-950 dark:bg-emerald-900/50 dark:text-emerald-50'
            : 'rounded-bl-md bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
        )}
      >
        {mediaOnly ? (
          <p className="italic text-zinc-500">Pesan berisi media (belum ditampilkan di CRM)</p>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        )}
        {message.hasMedia && !mediaOnly && (
          <p className="mt-1 text-[11px] italic text-zinc-500">+ lampiran media</p>
        )}
        <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-500">
          {formatClockWib(message.timestamp)}
          {message.fromMe && <Ticks ack={message.ack} />}
        </p>
      </div>
    </div>
  );
}

function CategorySwitcher({
  chat,
  categories,
  onManage,
}: {
  chat: CrmChat;
  categories: CrmCategory[];
  onManage: () => void;
}) {
  const assign = useAssignCategory();
  const choose = (categoryId: string | null) => assign.mutate({ chatId: chat.id, categoryId });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={assign.isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 outline-none transition-colors hover:border-zinc-300 focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-zinc-700 dark:text-zinc-300"
      >
        {chat.category ? (
          <CategoryBadge name={chat.category.name} color={chat.category.color} />
        ) : (
          'Tanpa kategori'
        )}
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        {categories.map((category) => (
          <DropdownMenuItem key={category.id} onClick={() => choose(category.id)}>
            <span className={cn('size-2.5 rounded-full', crmColor(category.color).dot)} />
            {category.name}
            {chat.category?.id === category.id && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
        {chat.category && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => choose(null)}>Lepas kategori</DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onManage}>Kelola kategori…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function CrmChatBox({
  chat,
  chatReceivedAt,
  categories,
  onBack,
  onOpenInfo,
  onManageCategories,
}: {
  chat: CrmChat;
  chatReceivedAt: number;
  categories: CrmCategory[];
  onBack: () => void;
  onOpenInfo: () => void;
  onManageCategories: () => void;
}) {
  const messages = useCrmMessages(chat.id);
  const items = messages.data?.items;

  // Follow new messages only while the admin is already at the bottom, and jump to the end when
  // a different conversation opens.
  const scroller = useRef<HTMLDivElement>(null);
  const stuckToBottom = useRef(true);
  const shownChat = useRef<string | null>(null);
  useEffect(() => {
    const element = scroller.current;
    if (!element || !items) return;
    if (shownChat.current !== chat.id) {
      shownChat.current = chat.id;
      stuckToBottom.current = true;
    }
    if (stuckToBottom.current) element.scrollTop = element.scrollHeight;
  }, [items, chat.id]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800/70">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Kembali ke daftar"
          onClick={onBack}
          className="-ml-1 lg:hidden"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {initialsOf(chat.displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-bold text-zinc-900 dark:text-white">
            {chat.displayName}
          </h2>
          <p className="truncate font-mono text-[11px] text-zinc-500">
            {chat.phone ? `+${chat.phone}` : 'Nomor belum diketahui'}
          </p>
        </div>
        <CategorySwitcher chat={chat} categories={categories} onManage={onManageCategories} />
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Info pelanggan"
          onClick={onOpenInfo}
          className="xl:hidden"
        >
          <Info className="size-4" />
        </Button>
      </header>

      <div
        ref={scroller}
        onScroll={(event) => {
          const el = event.currentTarget;
          stuckToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-zinc-100/80 px-4 py-4 dark:bg-zinc-950/60"
      >
        {messages.isLoading && (
          <p className="py-10 text-center text-xs text-zinc-500">Memuat pesan…</p>
        )}
        {messages.isError && !items && (
          <p className="py-10 text-center text-xs text-rose-600">{errorMessage(messages.error)}</p>
        )}
        {items && items.length === 0 && (
          <p className="py-10 text-center text-xs text-zinc-500">Belum ada pesan tersimpan.</p>
        )}
        {messages.data?.hasMore && (
          <p className="pb-2 text-center text-[11px] text-zinc-500">
            Menampilkan 100 pesan terakhir.
          </p>
        )}
        {items?.map((message, index) => (
          <div key={message.id} className="space-y-2">
            {isNewDay(items[index - 1]?.timestamp, message.timestamp) && (
              <p className="flex justify-center py-1">
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-zinc-500 shadow-sm dark:bg-zinc-800">
                  {formatDayHeading(message.timestamp)}
                </span>
              </p>
            )}
            <Bubble message={message} />
          </div>
        ))}
      </div>

      <CrmWindowBanner window={chat.window} receivedAt={chatReceivedAt} />

      <div className="flex items-end gap-2 border-t border-zinc-100 p-3 dark:border-zinc-800/70">
        <Textarea
          rows={2}
          disabled
          aria-label="Tulis pesan"
          placeholder="Mengirim pesan dari CRM menyusul di tahap berikutnya"
          className="min-h-0 resize-none"
        />
        <Button disabled size="icon" aria-label="Kirim pesan" className="size-10 shrink-0">
          <Send className="size-4" />
        </Button>
      </div>
    </>
  );
}
