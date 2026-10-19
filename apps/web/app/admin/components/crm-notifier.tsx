'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCrmLive, useCrmUnread } from '@/lib/crm-queries';

const COUNT_PREFIX = /^\(\d+\)\s/;

/**
 * Tells the admin about new WhatsApp messages wherever they are in the panel: a toast with a
 * shortcut, an "(n)" in the tab title, and a desktop notification when the tab is in the
 * background and the browser has already been given permission. Renders nothing itself.
 */
export default function CrmNotifier() {
  const router = useRouter();
  useCrmLive();
  const unread = useCrmUnread();
  const total = unread.data?.total ?? 0;
  const latest = unread.data?.latest ?? null;
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (!unread.data) return;
    const before = previous.current;
    previous.current = unread.data.total;
    // The first reading is only a baseline; only an increase after that is "new".
    if (before === null || unread.data.total <= before || !unread.data.latest) return;

    const { chatId, displayName, preview } = unread.data.latest;
    const looking =
      window.location.pathname === '/admin/crm' &&
      new URLSearchParams(window.location.search).get('chat') === chatId &&
      document.visibilityState === 'visible';
    if (looking) return;

    toast(displayName, {
      description: preview || 'Pesan baru',
      action: { label: 'Buka', onClick: () => router.push(`/admin/crm?chat=${chatId}`) },
    });
    if (
      document.visibilityState === 'hidden' &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      const notification = new Notification(displayName, { body: preview || 'Pesan baru' });
      notification.onclick = () => {
        window.focus();
        router.push(`/admin/crm?chat=${chatId}`);
      };
    }
  }, [unread.data, router]);

  // The title is rewritten by the router on every page change, so it is re-prefixed when it does.
  useEffect(() => {
    const prefix = total > 0 ? `(${total}) ` : '';
    const apply = () => {
      const next = prefix + document.title.replace(COUNT_PREFIX, '');
      if (document.title !== next) document.title = next;
    };
    apply();
    const titleElement = document.querySelector('title');
    const observer = titleElement ? new MutationObserver(apply) : null;
    if (titleElement) {
      observer?.observe(titleElement, { childList: true, characterData: true, subtree: true });
    }
    return () => {
      observer?.disconnect();
      document.title = document.title.replace(COUNT_PREFIX, '');
    };
  }, [total, latest?.at]);

  return null;
}
