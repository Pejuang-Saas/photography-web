import { BOOKING_BOUND_VARIABLES } from './whatsapp-template-variables';

export const WINDOW_CLOSED_MESSAGE =
  'Jendela percakapan 24 jam sudah berakhir. Kirim template resmi, atau tunggu customer membalas.';

/** How long to show "typing…" before a message goes out: longer text takes longer, within limits. */
export function typingDelayMs(text: string) {
  return Math.min(2500, Math.max(600, 400 + text.length * 15));
}

/** Names used in a template body, in order of appearance, without repeats. */
export function placeholdersIn(body: string) {
  return [...new Set([...body.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]))];
}

/** The booking-bound placeholders a template uses, which a conversation with no booking cannot fill. */
export function bookingPlaceholdersIn(body: string) {
  return placeholdersIn(body).filter((name) => BOOKING_BOUND_VARIABLES.has(name));
}
