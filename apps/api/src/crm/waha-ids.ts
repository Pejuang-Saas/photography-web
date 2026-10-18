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
  /** Attachment details. `url` only appears once WAHA has downloaded the file. */
  media?: {
    url?: string | null;
    mimetype?: string | null;
    filename?: string | null;
    /** Set when WhatsApp no longer has the file; WAHA gives this instead of a URL. */
    error?: unknown;
  } | null;
  _data?: Record<string, unknown> | null;
};

/** Only one-to-one chats are stored; groups, broadcasts, status updates and channels are not. */
export function isUserChat(chatId: string | undefined | null): chatId is string {
  return typeof chatId === 'string' && /^[^@\s]+@(c\.us|lid)$/.test(chatId);
}

/**
 * The chat id WAHA embeds in a message id: "<fromMe>_<chatId>_<messageId>[_<participant>]". For a
 * group message the chat is the group and the trailing part is who wrote in it, so this is the one
 * place that tells a group message from a private one, whatever its from/to say.
 */
export function chatIdFromMessageId(id: string | undefined | null) {
  return /^(?:true|false)_([^_@\s]+@[A-Za-z.]+)_/.exec(id ?? '')?.[1];
}

/**
 * The conversation a message belongs to. The id is trusted first. In a group, the engine puts the
 * sender's own id in from/to, which would otherwise make a group message look like a private chat
 * with the studio's own number. Without a readable id, the other party is used.
 */
export function messageChatId(
  message: Pick<WahaMessage, 'from' | 'to' | 'fromMe'> & { id?: string },
) {
  return chatIdFromMessageId(message.id) ?? (message.fromMe ? message.to : message.from);
}

/** Group addresses, wherever they show up on a message. */
export function isGroupJid(jid: string | undefined | null) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
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

/**
 * A name as people see it. WhatsApp names often start with invisible direction marks or contain
 * zero-width characters, which break initials, sorting and searching without being visible.
 */
export function cleanDisplayName(value: string | null | undefined) {
  const cleaned = (value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u00AD\u180E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
  return cleaned || undefined;
}

/** The sender's display name when the engine includes one, or undefined. */
export function pushNameOf(message: WahaMessage) {
  const data = message._data ?? {};
  const info = (data.Info ?? data.info) as Record<string, unknown> | undefined;
  const candidates = [info?.PushName, info?.pushName, data.pushName, data.notifyName];
  const name = candidates.find((value) => typeof value === 'string' && cleanDisplayName(value));
  return typeof name === 'string' ? cleanDisplayName(name) : undefined;
}

/** "audio/ogg; codecs=opus" -> "audio/ogg". */
export function baseMime(mime: string | null | undefined) {
  return (mime ?? '').split(';')[0].trim().toLowerCase();
}

const INLINE_MEDIA = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/webm',
  'audio/wav',
  'application/pdf',
]);

/**
 * Whether the browser may show this file in the page. Anything else is served as a download, and
 * never as HTML or SVG, so a file from a customer cannot run code in the admin panel.
 */
export function isInlineMedia(mime: string | null | undefined) {
  return INLINE_MEDIA.has(baseMime(mime));
}

/** A file extension for a stored attachment, from its type (or its original name). */
export function mediaExtension(mime: string | null | undefined, filename?: string | null) {
  const fromName = /\.([A-Za-z0-9]{1,8})$/.exec(filename ?? '')?.[1]?.toLowerCase();
  if (fromName) return fromName;
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'application/pdf': 'pdf',
  };
  return map[baseMime(mime)] ?? 'bin';
}
