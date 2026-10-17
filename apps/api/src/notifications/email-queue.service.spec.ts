import { EmailLogStatus, Prisma } from '@prisma/client';

jest.mock('../queues/queues.service', () => ({ QueuesService: class QueuesService {} }));

import { EmailQueueService } from './email-queue.service';

const request = {
  dedupeKey: 'event-1:email',
  to: 'customer@example.test',
  subject: 'Subjek',
  text: 'Isi',
  bookingId: 'booking-1',
};

function setup(existing?: { id: string; status: EmailLogStatus }) {
  const emailLog = {
    create: jest.fn(),
    findUniqueOrThrow: jest.fn().mockResolvedValue(existing),
  };
  if (existing) {
    emailLog.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
  } else {
    emailLog.create.mockImplementation(async ({ data }) => ({ id: 'log-1', ...data }));
  }
  const queues = { scheduleEmail: jest.fn().mockResolvedValue({}) };
  return {
    service: new EmailQueueService({ emailLog } as never, queues as never),
    emailLog,
    queues,
  };
}

describe('EmailQueueService', () => {
  it('stores the message as QUEUED and schedules exactly one job for it', async () => {
    const { service, emailLog, queues } = setup();

    await expect(service.enqueue(request)).resolves.toEqual({ logId: 'log-1', duplicate: false });

    expect(emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ dedupeKey: 'event-1:email', status: EmailLogStatus.QUEUED }),
    });
    expect(queues.scheduleEmail).toHaveBeenCalledWith('log-1');
  });

  it('does not create a second email when the same event is delivered again', async () => {
    const { service, queues } = setup({ id: 'log-9', status: EmailLogStatus.QUEUED });

    await expect(service.enqueue(request)).resolves.toEqual({ logId: 'log-9', duplicate: true });

    // Re-adding the job is safe (its id is the log id) and heals a crash between row and job.
    expect(queues.scheduleEmail).toHaveBeenCalledWith('log-9');
  });

  it.each([EmailLogStatus.SENT, EmailLogStatus.FAILED, EmailLogStatus.SKIPPED])(
    'leaves a %s email alone on a duplicate',
    async (status) => {
      const { service, queues } = setup({ id: 'log-9', status });

      await service.enqueue(request);

      expect(queues.scheduleEmail).not.toHaveBeenCalled();
    },
  );

  it('stores which files to attach, as plain data, for the worker to build later', async () => {
    const { service, emailLog } = setup();

    await service.enqueue({
      ...request,
      attachments: [{ type: 'logo' }, { type: 'invoice-pdf', invoiceId: 'inv-1' }],
    });

    expect(emailLog.create.mock.calls[0][0].data.attachments).toEqual([
      { type: 'logo' },
      { type: 'invoice-pdf', invoiceId: 'inv-1' },
    ]);
  });

  it('stores nothing instead of an empty list when there are no attachments', async () => {
    const { service, emailLog } = setup();

    await service.enqueue({ ...request, attachments: [] });

    expect(emailLog.create.mock.calls[0][0].data.attachments).toBeUndefined();
  });

  it('records a skipped email with its reason and never queues it', async () => {
    const { service, emailLog, queues } = setup();

    await service.skip(request, 'SMTP dinonaktifkan di pengaturan');

    expect(emailLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: EmailLogStatus.SKIPPED,
        error: 'SMTP dinonaktifkan di pengaturan',
      }),
    });
    expect(queues.scheduleEmail).not.toHaveBeenCalled();
  });
});
