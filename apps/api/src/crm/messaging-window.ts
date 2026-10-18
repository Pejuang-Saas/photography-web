export const WINDOW_HOURS = 24;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

export type MessagingWindow = {
  /** True while free-form replies are allowed. */
  open: boolean;
  remainingSeconds: number;
  expiresAt: Date | null;
};

/**
 * The studio may answer freely for 24 hours after the customer last wrote. After that only
 * approved template messages go out, until the customer writes again. The server enforces this
 * (the UI merely reflects it), which is why it lives in one place.
 */
export function messagingWindow(
  lastInboundAt: Date | null | undefined,
  now: Date = new Date(),
): MessagingWindow {
  if (!lastInboundAt) return { open: false, remainingSeconds: 0, expiresAt: null };
  const expiresAt = new Date(lastInboundAt.getTime() + WINDOW_MS);
  const remainingMs = expiresAt.getTime() - now.getTime();
  return {
    open: remainingMs > 0,
    remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
    expiresAt,
  };
}
