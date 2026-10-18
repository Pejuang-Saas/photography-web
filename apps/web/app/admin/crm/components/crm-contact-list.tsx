'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { errorMessage } from '@/lib/admin-queries';
import type { CrmCategory, CrmChat } from '@/lib/crm-api';
import { crmColor } from '@/lib/crm-colors';
import { formatListTime, initialsOf } from '@/lib/crm-format';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import CategoryBadge from './category-badge';

export type CategoryFilter = string | undefined;

function CategoryFilterMenu({
  categories,
  value,
  onChange,
}: {
  categories: CrmCategory[];
  value: CategoryFilter;
  onChange: (value: CategoryFilter) => void;
}) {
  const current = categories.find((category) => category.id === value);
  const label = value === 'none' ? 'Tanpa kategori' : (current?.name ?? 'Semua kategori');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Filter kategori"
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition-colors hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <span className="flex min-w-0 items-center gap-2">
          {current && (
            <span className={cn('size-2.5 shrink-0 rounded-full', crmColor(current.color).dot)} />
          )}
          <span className="truncate">{label}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-zinc-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <DropdownMenuItem onClick={() => onChange(undefined)}>
          Semua kategori
          {value === undefined && <Check className="ml-auto size-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {categories.map((category) => (
          <DropdownMenuItem key={category.id} onClick={() => onChange(category.id)}>
            <span className={cn('size-2.5 rounded-full', crmColor(category.color).dot)} />
            {category.name}
            <span className="ml-auto flex items-center gap-2">
              <span className="font-mono text-[11px] text-zinc-500">{category.chatCount}</span>
              {value === category.id && <Check className="size-3.5" />}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onChange('none')}>
          Tanpa kategori
          {value === 'none' && <Check className="ml-auto size-3.5" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContactItem({
  chat,
  selected,
  onSelect,
}: {
  chat: CrmChat;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3.5 text-left transition-colors last:border-b-0 dark:border-zinc-800/70',
        selected ? 'bg-amber-500/[0.08]' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {initialsOf(chat.displayName)}
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              'truncate text-sm text-zinc-900 dark:text-white',
              chat.unreadCount > 0 ? 'font-bold' : 'font-semibold',
            )}
          >
            {chat.displayName}
          </span>
          <span
            className={cn(
              'shrink-0 text-[11px]',
              chat.unreadCount > 0
                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                : 'text-zinc-500',
            )}
          >
            {formatListTime(chat.lastMessageAt)}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-xs',
              chat.unreadCount > 0
                ? 'font-medium text-zinc-800 dark:text-zinc-200'
                : 'text-zinc-500',
            )}
          >
            {chat.lastMessageFromMe && <span className="text-zinc-400">Anda: </span>}
            {chat.lastMessagePreview || 'Belum ada pesan'}
          </span>
          {chat.unreadCount > 0 && (
            <span
              aria-label={`${chat.unreadCount} pesan belum dibaca`}
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white"
            >
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {chat.category ? (
            <CategoryBadge name={chat.category.name} color={chat.category.color} />
          ) : (
            <span className="text-[10px] text-zinc-400">Tanpa kategori</span>
          )}
          <span
            title={chat.window.open ? 'Jendela 24 jam aktif' : 'Jendela 24 jam berakhir'}
            className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500"
          >
            <span
              className={cn(
                'size-2 rounded-full',
                chat.window.open ? 'bg-emerald-500' : 'bg-rose-400',
              )}
            />
            24j
          </span>
        </span>
      </span>
    </button>
  );
}

export default function CrmContactList({
  chats,
  total,
  loading,
  error,
  categories,
  selectedId,
  onSelect,
  search,
  onSearch,
  categoryId,
  onCategory,
  onRetry,
}: {
  chats: CrmChat[] | undefined;
  total: number;
  loading: boolean;
  error: unknown;
  categories: CrmCategory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
  categoryId: CategoryFilter;
  onCategory: (value: CategoryFilter) => void;
  onRetry: () => void;
}) {
  const filtered = Boolean(search.trim() || categoryId);

  return (
    <>
      <div className="space-y-3 border-b border-zinc-100 p-4 dark:border-zinc-800/70">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-zinc-400" />
          <Input
            aria-label="Cari kontak"
            placeholder="Cari nama atau nomor"
            className="h-10 border-zinc-300 bg-white pl-9 dark:border-zinc-700 dark:bg-zinc-900"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>
        <CategoryFilterMenu categories={categories} value={categoryId} onChange={onCategory} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-px p-1">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-[76px] animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800/60"
              />
            ))}
          </div>
        )}
        {!loading && Boolean(error) && !chats && (
          <div className="p-6 text-center text-xs">
            <p className="text-rose-600">{errorMessage(error)}</p>
            <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">
              Coba lagi
            </button>
          </div>
        )}
        {chats && chats.length === 0 && (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {filtered ? 'Tidak ada percakapan yang cocok' : 'Belum ada percakapan'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {filtered
                ? 'Coba kata kunci atau kategori lain.'
                : 'Hubungkan WhatsApp lalu klik Sinkronkan. Pesan baru muncul otomatis.'}
            </p>
          </div>
        )}
        {chats?.map((chat) => (
          <ContactItem
            key={chat.id}
            chat={chat}
            selected={chat.id === selectedId}
            onSelect={() => onSelect(chat.id)}
          />
        ))}
        {chats && total > chats.length && (
          <p className="px-4 py-3 text-center text-[11px] text-zinc-500">
            Menampilkan {chats.length} dari {total} percakapan. Gunakan pencarian untuk
            mempersempit.
          </p>
        )}
      </div>
    </>
  );
}
