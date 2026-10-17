jest.mock('../queues/queues.service', () => ({ QueuesService: class QueuesService {} }));

import { OutboxService } from './outbox.service';

function setup(scheduleOutbox = jest.fn().mockResolvedValue({})) {
  const service = new OutboxService({} as never, { scheduleOutbox } as never, {} as never);
  const tx = { outboxEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }) } };
  return { service, tx, scheduleOutbox };
}

const input = {
  eventKey: 'payment-verified:1',
  eventType: 'PAYMENT_VERIFIED',
  aggregateType: 'Payment',
  aggregateId: 'payment-1',
  payload: {},
};

describe('OutboxService.createInTransaction', () => {
  it('stores the event and queues its delivery right away', async () => {
    const { service, tx, scheduleOutbox } = setup();

    await expect(service.createInTransaction(tx as never, input)).resolves.toEqual({
      id: 'event-1',
    });

    expect(tx.outboxEvent.create).toHaveBeenCalledWith({ data: input });
    expect(scheduleOutbox).toHaveBeenCalledWith('event-1', { immediate: true });
  });

  it('does not fail the surrounding transaction when queueing fails; the sweep picks it up', async () => {
    const { service, tx } = setup(jest.fn().mockRejectedValue(new Error('redis down')));

    await expect(service.createInTransaction(tx as never, input)).resolves.toEqual({
      id: 'event-1',
    });
  });
});
