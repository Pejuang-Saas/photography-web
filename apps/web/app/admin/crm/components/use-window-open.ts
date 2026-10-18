'use client';

import type { CrmWindow } from '@/lib/crm-api';
import { useDeadline } from '@/lib/use-deadline';

/**
 * Whether free-form replies are still allowed, counting down from the server's "seconds remaining"
 * at the moment the data arrived, so a wrong clock on this device cannot keep a closed window open.
 * The server enforces the rule anyway; this only keeps the screen honest.
 */
export function useWindowOpen(window: CrmWindow, receivedAt: number) {
  const msLeft = useDeadline(window.open ? receivedAt + window.remainingSeconds * 1000 : null);
  return { open: window.open && (msLeft ?? 0) > 0, msLeft: msLeft ?? 0 };
}
