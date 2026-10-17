jest.mock('../queues/queues.service', () => ({ QueuesService: class QueuesService {} }));

import { EmailLogsService } from './email-logs.service';

function setup(overrides: { updated?: number; existing?: boolean } = {}) {
  const emailLog = {
    findMany: jest.fn().mockResolvedValue([{ id: 'log-1' }]),
    count: jest.fn().mockResolvedValue(1),
    groupBy: jest.fn().mockResolvedValue([{ status: 'SENT', _count: { _all: 3 } }]),
    findUnique: jest.fn().mockResolvedValue(overrides.existing === false ? null : { id: 'log-1' }),
    updateMany: jest.fn().mockResolvedValue({ count: overrides.updated ?? 1 }),
  };
  const queues = { scheduleEmail: jest.fn().mockResolvedValue({}) };
  return {
    service: new EmailLogsService({ emailLog } as never, queues as never),
    emailLog,
    queues,
  };
}

describe('EmailLogsService', () => {
  it('lists newest first without the message bodies', async () => {
    const { service, emailLog } = setup();

    const result = await service.list({});

    const args = emailLog.findMany.mock.calls[0][0];
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    expect(args.select).not.toHaveProperty('html');
    expect(args.select).not.toHaveProperty('text');
    expect(result).toMatchObject({ total: 1, page: 1, pageSize: 20 });
  });

  it('fills a zero for every status so the filter chips never miss one', async () => {
    const { service } = setup();

    expect((await service.list({})).counts).toEqual({
      QUEUED: 0,
      SENT: 3,
      FAILED: 0,
      SKIPPED: 0,
    });
  });

  it('filters by status and searches recipient or subject, ignoring case', async () => {
    const { service, emailLog } = setup();

    await service.list({ status: 'failed', search: ' anisa ' });

    expect(emailLog.findMany.mock.calls[0][0].where).toEqual({
      status: 'FAILED',
      OR: [
        { to: { contains: 'anisa', mode: 'insensitive' } },
        { subject: { contains: 'anisa', mode: 'insensitive' } },
      ],
    });
  });

  it('ignores an unknown status instead of failing', async () => {
    const { service, emailLog } = setup();

    await service.list({ status: 'DROP TABLE' });

    expect(emailLog.findMany.mock.calls[0][0].where.status).toBeUndefined();
  });

  it('keeps paging within sane bounds', async () => {
    const { service, emailLog } = setup();

    await service.list({ page: -4, pageSize: 100000 });
    expect(emailLog.findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 100 });

    await service.list({ page: 3, pageSize: NaN });
    expect(emailLog.findMany.mock.calls[1][0]).toMatchObject({ skip: 40, take: 20 });
  });

  it('requeues a failed email under a fresh job id', async () => {
    const { service, emailLog, queues } = setup();

    await service.resend('log-1');

    expect(emailLog.updateMany).toHaveBeenCalledWith({
      where: { id: 'log-1', status: 'FAILED' },
      data: { status: 'QUEUED', error: null, attempts: 0 },
    });
    expect(queues.scheduleEmail).toHaveBeenCalledWith('log-1', { resend: true });
  });

  it('refuses to resend anything that is not failed, and does not queue it', async () => {
    const { service, queues } = setup({ updated: 0 });

    await expect(service.resend('log-1')).rejects.toMatchObject({ status: 409 });
    expect(queues.scheduleEmail).not.toHaveBeenCalled();
  });

  it('answers 404 for an unknown log', async () => {
    const { service } = setup({ updated: 0, existing: false });

    await expect(service.resend('nope')).rejects.toMatchObject({ status: 404 });
    await expect(service.get('nope')).rejects.toMatchObject({ status: 404 });
  });
});
