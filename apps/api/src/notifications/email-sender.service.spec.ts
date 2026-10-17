import { EmailLogStatus } from '@prisma/client';
import { EmailSenderService } from './email-sender.service';

const log = {
  id: 'log-1',
  to: 'customer@example.test',
  subject: 'Subjek',
  text: 'Isi',
  html: null,
  dedupeKey: 'event-1:email',
  attachments: null as unknown,
  status: EmailLogStatus.QUEUED as EmailLogStatus,
};

function setup(row: typeof log | null = log) {
  const emailLog = {
    findUnique: jest.fn().mockResolvedValue(row),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const email = { deliver: jest.fn().mockResolvedValue(undefined) };
  const invoicePdf = {
    render: jest
      .fn()
      .mockResolvedValue({ filename: 'INV-1.pdf', buffer: Buffer.from('%PDF-1.7 test') }),
  };
  return {
    service: new EmailSenderService({ emailLog } as never, email as never, invoicePdf as never),
    emailLog,
    email,
    invoicePdf,
  };
}

describe('EmailSenderService', () => {
  it('sends the stored message and marks it SENT', async () => {
    const { service, emailLog, email } = setup();

    await service.send('log-1');

    expect(email.deliver).toHaveBeenCalledWith({
      to: 'customer@example.test',
      subject: 'Subjek',
      text: 'Isi',
      html: undefined,
      attachments: undefined,
      messageKey: 'event-1:email',
    });
    expect(emailLog.update).toHaveBeenCalledWith({
      where: { id: 'log-1' },
      data: expect.objectContaining({ status: EmailLogStatus.SENT, error: null }),
    });
  });

  it('keeps the email QUEUED with the error and rethrows so the queue retries it', async () => {
    const { service, emailLog, email } = setup();
    email.deliver.mockRejectedValue(new Error('connect ECONNREFUSED'));

    await expect(service.send('log-1')).rejects.toThrow('connect ECONNREFUSED');

    const data = emailLog.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ error: 'connect ECONNREFUSED', attempts: { increment: 1 } });
    expect(data).not.toHaveProperty('status');
  });

  it.each([EmailLogStatus.SENT, EmailLogStatus.FAILED])(
    'never sends a %s email again',
    async (status) => {
      const { service, email } = setup({ ...log, status });

      await service.send('log-1');

      expect(email.deliver).not.toHaveBeenCalled();
    },
  );

  it('ignores a job whose log row is gone', async () => {
    const { service, email } = setup(null);

    await expect(service.send('missing')).resolves.toBeUndefined();
    expect(email.deliver).not.toHaveBeenCalled();
  });

  it('only fails emails that are still waiting', async () => {
    const { service, emailLog } = setup();

    await service.markFailed('log-1', 'x'.repeat(900));

    expect(emailLog.updateMany).toHaveBeenCalledWith({
      where: { id: 'log-1', status: EmailLogStatus.QUEUED },
      data: { status: EmailLogStatus.FAILED, error: 'x'.repeat(500) },
    });
  });

  describe('attachments', () => {
    it('builds the invoice PDF and the inline logo only now, at send time', async () => {
      const { service, email, invoicePdf } = setup({
        ...log,
        attachments: [{ type: 'logo' }, { type: 'invoice-pdf', invoiceId: 'inv-1' }],
      });

      await service.send('log-1');

      expect(invoicePdf.render).toHaveBeenCalledWith('inv-1');
      const { attachments } = email.deliver.mock.calls[0][0];
      expect(attachments).toEqual([
        expect.objectContaining({
          filename: 'logo.png',
          cid: 'studio-logo',
          contentType: 'image/png',
        }),
        expect.objectContaining({ filename: 'INV-1.pdf', contentType: 'application/pdf' }),
      ]);
      expect(attachments[1].content.toString()).toContain('%PDF-');
    });

    it('rebuilds the PDF on every retry instead of reusing a stale copy', async () => {
      const { service, email, invoicePdf } = setup({
        ...log,
        attachments: [{ type: 'invoice-pdf', invoiceId: 'inv-1' }],
      });
      email.deliver.mockRejectedValueOnce(new Error('timeout'));

      await expect(service.send('log-1')).rejects.toThrow('timeout');
      await service.send('log-1');

      expect(invoicePdf.render).toHaveBeenCalledTimes(2);
    });

    it('treats a missing invoice as a failed attempt, not a silently incomplete email', async () => {
      const { service, emailLog, email, invoicePdf } = setup({
        ...log,
        attachments: [{ type: 'invoice-pdf', invoiceId: 'gone' }],
      });
      invoicePdf.render.mockRejectedValue(new Error('Invoice not found'));

      await expect(service.send('log-1')).rejects.toThrow('Invoice not found');

      expect(email.deliver).not.toHaveBeenCalled();
      expect(emailLog.update.mock.calls[0][0].data).toMatchObject({ error: 'Invoice not found' });
    });

    it('ignores malformed attachment data instead of crashing the send', async () => {
      const { service, email } = setup({
        ...log,
        attachments: [null, 5, { type: 'nope' }, { type: 'invoice-pdf' }],
      });

      await service.send('log-1');

      expect(email.deliver.mock.calls[0][0].attachments).toBeUndefined();
    });
  });
});
