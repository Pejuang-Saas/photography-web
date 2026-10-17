jest.mock('@nestjs/bullmq', () => ({
  Processor: () => () => undefined,
  OnWorkerEvent: () => () => undefined,
  WorkerHost: class {},
}));

import { EmailProcessor } from './email.processor';

function setup() {
  const sender = { send: jest.fn().mockResolvedValue(undefined), markFailed: jest.fn() };
  return { processor: new EmailProcessor(sender as never), sender };
}

const job = (attemptsMade: number, attempts = 5) =>
  ({
    id: 'email-1',
    name: 'send-email',
    data: { logId: 'log-1' },
    attemptsMade,
    opts: { attempts },
  }) as never;

describe('EmailProcessor', () => {
  it('sends the email referenced by the job', async () => {
    const { processor, sender } = setup();

    await processor.process(job(0));

    expect(sender.send).toHaveBeenCalledWith('log-1');
  });

  it('keeps retrying until the last attempt, and only then marks the email failed', async () => {
    const { processor, sender } = setup();

    await processor.onFailed(job(2), new Error('timeout'));
    expect(sender.markFailed).not.toHaveBeenCalled();

    await processor.onFailed(job(5), new Error('timeout'));
    expect(sender.markFailed).toHaveBeenCalledWith('log-1', 'timeout');
  });
});
