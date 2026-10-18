import { WhatsappSyncService } from './whatsapp-sync.service';

function setup(options: { status?: string; chats?: any[]; messages?: Record<string, any[]> } = {}) {
  const waha = {
    getSession: jest.fn().mockResolvedValue({ status: options.status ?? 'WORKING' }),
    listChats: jest.fn().mockResolvedValue(options.chats ?? []),
    listMessages: jest.fn(async (id: string) => options.messages?.[id] ?? []),
  };
  const inbox = { ingestMessage: jest.fn().mockResolvedValue('stored') };
  return {
    waha,
    inbox,
    service: new WhatsappSyncService(waha as never, inbox as never),
  };
}

describe('WhatsappSyncService', () => {
  it('refuses to run while WhatsApp is not connected', async () => {
    const { service, waha } = setup({ status: 'SCAN_QR_CODE' });

    await expect(service.sync()).rejects.toMatchObject({ status: 409 });
    expect(waha.listChats).not.toHaveBeenCalled();
  });

  it('refuses when WAHA cannot be reached', async () => {
    const { service, waha } = setup();
    waha.getSession.mockRejectedValue(new Error('down'));

    await expect(service.sync()).rejects.toMatchObject({ status: 409 });
  });

  it('stores each conversation oldest message first, so the summary ends on the newest', async () => {
    const { service, inbox } = setup({
      chats: [{ id: 'a@c.us', name: 'Anisa' }],
      messages: { 'a@c.us': [{ id: 'new' }, { id: 'mid' }, { id: 'old' }] },
    });

    await service.sync();

    expect(inbox.ingestMessage.mock.calls.map(([message]) => message.id)).toEqual([
      'old',
      'mid',
      'new',
    ]);
    expect(inbox.ingestMessage.mock.calls[0][1]).toBe('Anisa');
  });

  it('skips groups and broadcasts without fetching their messages', async () => {
    const { service, waha } = setup({
      chats: [{ id: '120363@g.us' }, { id: 'status@broadcast' }, { id: 'a@c.us' }],
    });

    const result = await service.sync();

    expect(waha.listMessages).toHaveBeenCalledTimes(1);
    expect(result.chats).toBe(1);
  });

  it('counts what was stored and what it already had', async () => {
    const { service, inbox } = setup({
      chats: [{ id: 'a@c.us' }],
      messages: { 'a@c.us': [{ id: '1' }, { id: '2' }, { id: '3' }] },
    });
    inbox.ingestMessage
      .mockResolvedValueOnce('duplicate')
      .mockResolvedValueOnce('stored')
      .mockResolvedValueOnce('ignored');

    expect(await service.sync()).toEqual({ chats: 1, stored: 1, duplicates: 1, failedChats: 0 });
  });

  it('carries on past a conversation that fails', async () => {
    const { service, waha } = setup({ chats: [{ id: 'bad@c.us' }, { id: 'good@c.us' }] });
    waha.listMessages.mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce([]);

    expect(await service.sync()).toMatchObject({ chats: 1, failedChats: 1 });
  });

  it('keeps the requested sizes within bounds', async () => {
    const { service, waha } = setup({ chats: [{ id: 'a@c.us' }] });

    await service.sync({ chats: 100000, messages: -5 });

    expect(waha.listChats).toHaveBeenCalledWith(100);
    expect(waha.listMessages).toHaveBeenCalledWith('a@c.us', 1);
  });
});
