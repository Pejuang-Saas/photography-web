jest.mock('@nestjs/bullmq', () => ({ InjectQueue: () => () => undefined }));

import { QueuesService, jobId } from './queues.service';

describe('queue job ids', () => {
  it('never contain ":" because BullMQ refuses such ids', () => {
    expect(jobId('booking-expiration', 'abc')).toBe('booking-expiration-abc');
    expect(jobId('storage-cleanup', 'PRIVATE', 'payments/2026-10-16/x.png')).not.toContain(':');
  });

  it('are used by every producer, deterministic per piece of work', async () => {
    const add = jest.fn().mockResolvedValue({});
    const queue = { add };
    const service = new QueuesService(
      queue as never,
      queue as never,
      queue as never,
      queue as never,
      queue as never,
    );

    await service.scheduleBookingExpiration('booking-1', new Date(Date.now() + 1000));
    await service.scheduleStorageCleanup('PRIVATE' as never, 'payments/a b.png');
    await service.scheduleOutbox('event-1');
    await service.scheduleOutbox('event-1', { immediate: true });
    await service.scheduleEmail('log-1');

    const ids = add.mock.calls.map((call) => (call[2] as { jobId: string }).jobId);
    expect(ids).toEqual([
      'booking-expiration-booking-1',
      'storage-cleanup-PRIVATE-payments/a b.png',
      'outbox-event-1',
      'outbox-now-event-1',
      'email-log-1',
    ]);
    expect(add.mock.calls[3][2]).toMatchObject({ delay: 1_000 });
    expect(add.mock.calls[2][2]).not.toHaveProperty('delay');
    for (const id of ids) expect(id).not.toContain(':');
  });
});
