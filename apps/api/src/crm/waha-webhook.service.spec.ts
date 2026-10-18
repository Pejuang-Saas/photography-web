import { WahaWebhookService } from './waha-webhook.service';

function setup() {
  const inbox = {
    ingestMessage: jest.fn().mockResolvedValue('stored'),
    ingestAck: jest.fn().mockResolvedValue(undefined),
  };
  const waha = { sessionName: jest.fn().mockReturnValue('default') };
  return { inbox, service: new WahaWebhookService(waha as never, inbox as never) };
}

describe('WahaWebhookService', () => {
  it.each(['message', 'message.any'])('stores the message of a %s event', async (event) => {
    const { service, inbox } = setup();

    const outcome = await service.handle({ event, session: 'default', payload: { id: 'm1' } });

    expect(outcome).toBe('message:stored');
    expect(inbox.ingestMessage).toHaveBeenCalledWith({ id: 'm1' });
  });

  it('reports a duplicate without treating it as a failure', async () => {
    const { service, inbox } = setup();
    inbox.ingestMessage.mockResolvedValue('duplicate');

    expect(
      await service.handle({ event: 'message.any', session: 'default', payload: { id: 'm1' } }),
    ).toBe('message:duplicate');
  });

  it('updates delivery state from a message.ack event', async () => {
    const { service, inbox } = setup();

    expect(
      await service.handle({
        event: 'message.ack',
        session: 'default',
        payload: { id: 'm1', ack: 3 },
      }),
    ).toBe('ack');
    expect(inbox.ingestAck).toHaveBeenCalledWith('m1', 3);
  });

  it('ignores events from another session on a shared WAHA', async () => {
    const { service, inbox } = setup();

    const outcome = await service.handle({
      event: 'message',
      session: 'kirimchat',
      payload: { id: 'x' },
    });

    expect(outcome).toBe('ignored');
    expect(inbox.ingestMessage).not.toHaveBeenCalled();
  });

  it.each([
    [{ event: 'session.status', session: 'default', payload: { status: 'WORKING' } }],
    [{ event: 'message', session: 'default', payload: null }],
    [{}],
  ])('ignores events it has no use for (%j)', async (envelope) => {
    const { service, inbox } = setup();

    expect(await service.handle(envelope as never)).toBe('ignored');
    expect(inbox.ingestMessage).not.toHaveBeenCalled();
  });
});
