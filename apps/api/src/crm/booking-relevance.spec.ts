import { pickRelevantBooking } from './booking-relevance';

const b = (code: string, status: string) => ({ code, status });

describe('pickRelevantBooking', () => {
  it('prefers a live booking over a newer one that has expired', () => {
    const picked = pickRelevantBooking([
      b('new', 'EXPIRED'),
      b('mid', 'CONFIRMED'),
      b('old', 'PENDING_PAYMENT'),
    ]);

    expect(picked?.code).toBe('mid');
  });

  it.each(['PENDING_PAYMENT', 'PENDING_VERIFICATION', 'CONFIRMED', 'COMPLETED'])(
    'counts %s as live',
    (status) => {
      expect(pickRelevantBooking([b('x', 'CANCELLED'), b('y', status)])?.code).toBe('y');
    },
  );

  it('falls back to the newest when none is live', () => {
    expect(pickRelevantBooking([b('new', 'EXPIRED'), b('old', 'REJECTED')])?.code).toBe('new');
  });

  it('returns undefined when there is nothing', () => {
    expect(pickRelevantBooking([])).toBeUndefined();
  });
});
