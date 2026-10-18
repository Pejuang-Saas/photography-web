import { messagingWindow, WINDOW_HOURS } from './messaging-window';

const now = new Date('2026-10-17T12:00:00.000Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

describe('messagingWindow', () => {
  it('is 24 hours', () => {
    expect(WINDOW_HOURS).toBe(24);
  });

  it('is open, with the time left, shortly after the customer wrote', () => {
    const window = messagingWindow(hoursAgo(1), now);

    expect(window.open).toBe(true);
    expect(window.remainingSeconds).toBe(23 * 3600);
    expect(window.expiresAt?.toISOString()).toBe('2026-10-18T11:00:00.000Z');
  });

  it('is still open just inside the limit and closed from the exact moment it ends', () => {
    expect(messagingWindow(new Date(hoursAgo(24).getTime() + 1000), now).open).toBe(true);
    expect(messagingWindow(hoursAgo(24), now)).toMatchObject({ open: false, remainingSeconds: 0 });
  });

  it('is closed long after the customer last wrote, and never negative', () => {
    expect(messagingWindow(hoursAgo(80), now)).toMatchObject({ open: false, remainingSeconds: 0 });
  });

  it('is closed when the customer never wrote, because the studio spoke first', () => {
    expect(messagingWindow(null, now)).toEqual({
      open: false,
      remainingSeconds: 0,
      expiresAt: null,
    });
    expect(messagingWindow(undefined, now).open).toBe(false);
  });
});
