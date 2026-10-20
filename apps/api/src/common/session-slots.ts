/**
 * The windows a session can be booked in, as clock minutes from midnight. The labels are what is
 * stored on a booking, so they must not change once bookings exist.
 */
export type SessionSlot = { label: string; start: number; end: number; minutes: number };

const slot = (label: string): SessionSlot => {
  const range = parseSlotLabel(label)!;
  return { label, ...range, minutes: range.end - range.start };
};

const LABEL = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

/** The clock range inside a label such as "13:00 - 14:30"; null when it is not one. */
export function parseSlotLabel(label: string) {
  const match = LABEL.exec(label.trim());
  if (!match) return null;
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  return end > start ? { start, end } : null;
}

export const SESSION_SLOTS: SessionSlot[] = [
  slot('08:30 - 09:30'),
  slot('09:30 - 10:30'),
  slot('10:30 - 11:30'),
  slot('13:00 - 14:30'),
  slot('15:00 - 16:30'),
];

/**
 * The slots a package of this length can take: those of exactly its length. A length no slot has
 * falls back to the slots that are long enough, and failing that to all of them, so a package the
 * admin made with an unusual length can still be booked.
 */
export function slotsForDuration(minutes: number): SessionSlot[] {
  const exact = SESSION_SLOTS.filter((candidate) => candidate.minutes === minutes);
  if (exact.length > 0) return exact;
  const longEnough = SESSION_SLOTS.filter((candidate) => candidate.minutes >= minutes);
  return longEnough.length > 0 ? longEnough : SESSION_SLOTS;
}

export function findSlot(label: string) {
  const wanted = parseSlotLabel(label);
  return wanted
    ? SESSION_SLOTS.find((item) => item.start === wanted.start && item.end === wanted.end)
    : undefined;
}

/** The time a booking occupies: its window, stretched by whatever add-ons lengthened it. */
export function occupied(label: string, extraMinutes: number) {
  const range = parseSlotLabel(label);
  return range ? { start: range.start, end: range.end + extraMinutes } : null;
}

export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  a.start < b.end && b.start < a.end;
