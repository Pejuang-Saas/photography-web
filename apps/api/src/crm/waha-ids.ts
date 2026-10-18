/** WAHA message shape, trimmed to what the CRM reads. `_data` is engine-specific and optional. */
export type WahaMessage = {
  id: string;
  /** Unix seconds (WAHA) – milliseconds are tolerated too. */
  timestamp: number;
  from?: string;
  to?: string;
  fromMe?: boolean;
  body?: string | null;
  hasMedia?: boolean;
  ack?: number;
  _data?: Record<string, unknown> | null;
};

/** Only one-to-one chats are stored; groups, broadcasts, status updates and channels are not. */
export function isUserChat(chatId: string | undefined | null): chatId is string {
  return typeof chatId === 'string' && /^[^@\s]+@(c\.us|lid)$/.test(chatId);
}

/** The conversation a message belongs to: the other party, whichever way it went. */
export function messageChatId(message: Pick<WahaMessage, 'from' | 'to' | 'fromMe'>) {
  return message.fromMe ? message.to : message.from;
}

/**
 * An Indonesian number as digits starting with 62, whatever way it was written (0812…, +62 812…,
 * 62812…). Null when it does not look like a phone number at all.
 */
export function canonicalPhone(value: string | null | undefined) {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const international = digits.startsWith('62')
    ? digits
    : digits.startsWith('0')
      ? `62${digits.slice(1)}`
      : digits.startsWith('8')
        ? `62${digits}`
        : digits;
  return international.length >= 9 && international.length <= 15 ? international : null;
}

/** The number a `...@c.us` chat id carries. A LID is not a number, so it yields null. */
export function phoneFromChatId(chatId: string) {
  return chatId.endsWith('@c.us') ? canonicalPhone(chatId.split('@')[0]) : null;
}

/** Every way a stored booking phone might be written for a canonical number (62812… or 0812…). */
export function phoneVariants(canonical: string) {
  return canonical.startsWith('62') ? [canonical, `0${canonical.slice(2)}`] : [canonical];
}

/** WAHA timestamps are seconds; anything already in milliseconds is left alone. */
export function toDate(timestamp: number) {
  return new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
}

/** One line for the conversation list. */
export function previewOf(body: string | null | undefined, hasMedia: boolean) {
  const text = (body ?? '').replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 140);
  return hasMedia ? '[Media]' : '';
}

/** The sender's display name when the engine includes one, or undefined. */
export function pushNameOf(message: WahaMessage) {
  const data = message._data ?? {};
  const info = (data.Info ?? data.info) as Record<string, unknown> | undefined;
  const candidates = [info?.PushName, info?.pushName, data.pushName, data.notifyName];
  const name = candidates.find((value) => typeof value === 'string' && value.trim());
  return typeof name === 'string' ? name.trim().slice(0, 120) : undefined;
}
