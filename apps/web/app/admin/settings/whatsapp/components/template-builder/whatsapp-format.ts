/**
 * WhatsApp's own text formatting, so the simulator shows what the customer will see:
 * *bold*, _italic_ and ~strikethrough~ when the marker touches the text on both sides, and links.
 */
export type FormatMarker = '*' | '_' | '~';

export type Piece =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string }
  | { type: 'format'; marker: FormatMarker; children: Piece[] };

const LINK = /https?:\/\/[^\s]+/g;
const MARKERS: Record<string, FormatMarker> = { '*': '*', _: '_', '~': '~' };

/** A marker opens only before a word character or another marker, and the span has no padding. */
function findSpan(text: string, from: number) {
  for (let start = from; start < text.length; start += 1) {
    const marker = MARKERS[text[start]];
    if (!marker) continue;
    const before = start === 0 ? ' ' : text[start - 1];
    if (/[\p{L}\p{N}]/u.test(before)) continue;
    const end = text.indexOf(marker, start + 1);
    if (end === -1) continue;
    const inner = text.slice(start + 1, end);
    if (!inner || /^\s|\s$/.test(inner) || inner.includes('\n')) continue;
    return { start, end, marker, inner };
  }
  return null;
}

function parseInline(text: string): Piece[] {
  const pieces: Piece[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const span = findSpan(text, cursor);
    if (!span) break;
    if (span.start > cursor) pieces.push({ type: 'text', text: text.slice(cursor, span.start) });
    pieces.push({ type: 'format', marker: span.marker, children: parseInline(span.inner) });
    cursor = span.end + 1;
  }
  if (cursor < text.length) pieces.push({ type: 'text', text: text.slice(cursor) });
  return pieces;
}

/** Splits links out first (they may contain underscores), then formats what is between them. */
export function parseWhatsapp(text: string): Piece[] {
  const pieces: Piece[] = [];
  let cursor = 0;
  for (const match of text.matchAll(LINK)) {
    const start = match.index ?? 0;
    pieces.push(...parseInline(text.slice(cursor, start)));
    pieces.push({ type: 'link', text: match[0] });
    cursor = start + match[0].length;
  }
  pieces.push(...parseInline(text.slice(cursor)));
  return pieces;
}

/**
 * Wraps the selection in a marker, or unwraps it when it is already wrapped. With nothing
 * selected it inserts an empty pair and leaves the caret between them.
 */
export function toggleMarker(text: string, start: number, end: number, marker: FormatMarker) {
  const selected = text.slice(start, end);
  const wrapped = selected.length >= 2 && selected.startsWith(marker) && selected.endsWith(marker);
  if (wrapped) {
    const inner = selected.slice(1, -1);
    return {
      text: text.slice(0, start) + inner + text.slice(end),
      start,
      end: start + inner.length,
    };
  }
  const around = text[start - 1] === marker && text[end] === marker;
  if (around && start !== end) {
    return {
      text: text.slice(0, start - 1) + selected + text.slice(end + 1),
      start: start - 1,
      end: end - 1,
    };
  }
  return {
    text: text.slice(0, start) + marker + selected + marker + text.slice(end),
    start: start + 1,
    end: start + 1 + selected.length,
  };
}

/** Inserts at the caret (or over the selection) and puts the caret after it. */
export function insertAt(text: string, start: number, end: number, token: string) {
  const caret = start + token.length;
  return { text: text.slice(0, start) + token + text.slice(end), start: caret, end: caret };
}

/** Split into lines the way WhatsApp breaks them; blank lines are kept. */
export const linesOf = (text: string) => text.split('\n');
