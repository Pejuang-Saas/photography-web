'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MessageSquareText, RefreshCw, Tags } from 'lucide-react';
import {
  useCrmCategories,
  useCrmChat,
  useCrmInbox,
  useCrmUnread,
  useMarkRead,
  useSyncCrm,
} from '@/lib/crm-queries';
import { useDebounced } from '@/lib/use-debounced';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import CategoryManagerDialog from './components/category-manager-dialog';
import CrmChatBox from './components/crm-chat-box';
import CrmContactList, {
  type CategoryFilter,
  type StatusFilter,
} from './components/crm-contact-list';
import CrmCustomerDetail from './components/crm-customer-detail';

const PANEL =
  'flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60';

function CrmWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const selectedId = params.get('chat');

  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryFilter>(undefined);
  const [manageOpen, setManageOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const search = useDebounced(searchInput.trim());

  const [status, setStatus] = useState<StatusFilter>(undefined);
  // The open conversation stays in the list even if opening it (reading it) stops it matching.
  const chats = useCrmInbox({ search: search || undefined, categoryId, status }, selectedId);
  const unreadChats = useCrmUnread().data?.chats ?? 0;
  const categories = useCrmCategories();
  const listed = chats.items?.find((item) => item.id === selectedId);
  const chat = useCrmChat(selectedId, listed);
  // A placeholder comes from the list, whose "seconds remaining" were measured when the list loaded.
  const chatReceivedAt = chat.isPlaceholderData ? chats.dataUpdatedAt : chat.dataUpdatedAt;
  const sync = useSyncCrm();

  // Opening a conversation reads it, and so does a message arriving while it is open. The effect
  // runs when the unread number changes, so a failed request cannot make it loop.
  const { mutate: markRead } = useMarkRead();
  const unread = chat.data?.unreadCount ?? 0;
  useEffect(() => {
    if (selectedId && unread > 0) markRead(selectedId);
  }, [selectedId, unread, markRead]);

  const select = (id: string | null) =>
    router.replace(id ? `${pathname}?chat=${id}` : pathname, { scroll: false });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200/80 pb-4 dark:border-zinc-800/80">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
            Mini CRM
          </h1>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
            Percakapan WhatsApp dengan customer, dikelompokkan per kategori dan dicocokkan dengan
            booking.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setManageOpen(true)}
            className="gap-1.5"
          >
            <Tags className="size-3.5" />
            Kelola Kategori
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
            className="gap-1.5"
          >
            <RefreshCw className={cn('size-3.5', sync.isPending && 'animate-spin')} />
            Sinkronkan
          </Button>
        </div>
      </div>

      <div className="grid h-[calc(100dvh-14rem)] min-h-[520px] gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <section className={cn(PANEL, selectedId && 'hidden lg:flex')}>
          <CrmContactList
            chats={chats.items}
            loading={chats.isLoading}
            error={chats.error}
            hasMore={chats.hasMore}
            loadingMore={chats.loadingMore}
            loadMoreError={chats.loadMoreError}
            onLoadMore={chats.loadMore}
            categories={categories.data ?? []}
            selectedId={selectedId}
            onSelect={select}
            search={searchInput}
            onSearch={setSearchInput}
            categoryId={categoryId}
            onCategory={setCategoryId}
            status={status}
            onStatus={setStatus}
            unreadChats={unreadChats}
            onRetry={() => chats.refetch()}
          />
        </section>

        <section className={cn(PANEL, !selectedId && 'hidden lg:flex')}>
          {selectedId && chat.data ? (
            <CrmChatBox
              chat={chat.data}
              chatReceivedAt={chatReceivedAt}
              categories={categories.data ?? []}
              onBack={() => select(null)}
              onOpenInfo={() => setInfoOpen(true)}
              onManageCategories={() => setManageOpen(true)}
            />
          ) : selectedId && chat.isError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                Percakapan tidak ditemukan
              </p>
              <Button variant="outline" size="sm" onClick={() => select(null)}>
                Kembali ke daftar
              </Button>
            </div>
          ) : selectedId ? (
            <p className="m-auto text-xs text-zinc-500">Memuat percakapan…</p>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <MessageSquareText className="size-7" />
              </span>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Pilih percakapan
                </p>
                <p className="mt-1 max-w-xs text-xs text-zinc-500">
                  Pilih kontak di sebelah kiri untuk membaca obrolan, mengganti kategori, dan
                  melihat booking-nya.
                </p>
              </div>
              <Link
                href="/admin/settings/whatsapp"
                className="text-xs font-semibold text-amber-700 underline dark:text-amber-400"
              >
                Atur koneksi WhatsApp
              </Link>
            </div>
          )}
        </section>

        <aside className={cn(PANEL, 'hidden xl:flex')}>
          {chat.data ? (
            <CrmCustomerDetail chat={chat.data} />
          ) : (
            <p className="m-auto px-6 text-center text-xs text-zinc-500">
              Detail pelanggan dan booking tampil di sini.
            </p>
          )}
        </aside>
      </div>

      <Sheet open={infoOpen && Boolean(chat.data)} onOpenChange={setInfoOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Info pelanggan</SheetTitle>
            <SheetDescription>Detail percakapan dan booking.</SheetDescription>
          </SheetHeader>
          {chat.data && <CrmCustomerDetail chat={chat.data} />}
        </SheetContent>
      </Sheet>

      <CategoryManagerDialog open={manageOpen} onClose={() => setManageOpen(false)} />
    </div>
  );
}

export default function CrmPage() {
  // useSearchParams needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <CrmWorkspace />
    </Suspense>
  );
}
