import { WahaError } from '../waha/waha.client';
import { EXPIRED_MARKER, MAX_MEDIA_BYTES, WhatsappMediaService } from './whatsapp-media.service';

type Row = Record<string, any>;

function setup(options: { message?: Row | null; download?: jest.Mock; stored?: Row } = {}) {
  const message =
    options.message === undefined
      ? {
          id: 'msg-1',
          chatId: 'chat-1',
          wahaId: 'false_186316436332790@lid_3A51',
          hasMedia: true,
          mediaKey: null,
          mediaMime: 'image/jpeg',
          mediaFilename: null,
          chat: { chatId: '186316436332790@lid' },
        }
      : options.message;
  const prisma = {
    whatsappMessage: {
      findUnique: jest.fn().mockResolvedValue(message),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ mediaMime: 'image/jpeg', mediaFilename: null, ...options.stored }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const waha = {
    downloadMessageMedia:
      options.download ??
      jest.fn().mockResolvedValue({
        buffer: Buffer.from('JPEGDATA'),
        mimetype: 'image/jpeg',
        filename: undefined,
      }),
  };
  const storage = {
    putPrivateObject: jest.fn().mockResolvedValue(undefined),
    getPrivateObject: jest
      .fn()
      .mockResolvedValue({ body: 'STREAM', contentType: 'image/jpeg', length: 8 }),
  };
  return {
    prisma,
    waha,
    storage,
    service: new WhatsappMediaService(prisma as never, waha as never, storage as never),
  };
}

describe('WhatsappMediaService.ensureStored', () => {
  it('downloads the file once and keeps it in private storage under the message', async () => {
    const { service, waha, storage, prisma } = setup();

    const key = await service.ensureStored('msg-1');

    expect(key).toBe('crm-media/chat-1/msg-1.jpg');
    expect(waha.downloadMessageMedia).toHaveBeenCalledWith(
      '186316436332790@lid',
      'false_186316436332790@lid_3A51',
      MAX_MEDIA_BYTES,
    );
    expect(storage.putPrivateObject).toHaveBeenCalledWith(
      key,
      Buffer.from('JPEGDATA'),
      'image/jpeg',
    );
    expect(prisma.whatsappMessage.update.mock.calls[0][0].data).toMatchObject({
      mediaKey: key,
      mediaMime: 'image/jpeg',
      mediaError: null,
    });
  });

  it('does not download again once the file is stored', async () => {
    const { service, waha } = setup({
      message: { id: 'msg-1', hasMedia: true, mediaKey: 'crm-media/x.jpg', chat: { chatId: 'c' } },
    });

    expect(await service.ensureStored('msg-1')).toBe('crm-media/x.jpg');
    expect(waha.downloadMessageMedia).not.toHaveBeenCalled();
  });

  it('downloads only once when two people ask at the same moment', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const download = jest.fn(() => new Promise((resolve) => (finish = resolve)));
    const { service } = setup({ download: download as never });

    const first = service.ensureStored('msg-1');
    const second = service.ensureStored('msg-1');
    await new Promise((resolve) => setImmediate(resolve)); // let the download start
    finish({ buffer: Buffer.from('x'), mimetype: 'image/png' });

    expect(await first).toBe(await second);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('answers 404 for a message that has no attachment, or does not exist', async () => {
    await expect(setup({ message: null }).service.ensureStored('x')).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      setup({ message: { id: 'm', hasMedia: false, chat: { chatId: 'c' } } }).service.ensureStored(
        'm',
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('names the file after its original name when WAHA knows it', async () => {
    const { service } = setup({
      download: jest.fn().mockResolvedValue({
        buffer: Buffer.from('x'),
        mimetype: 'application/pdf',
        filename: 'invoice.PDF',
      }),
    });

    expect(await service.ensureStored('msg-1')).toBe('crm-media/chat-1/msg-1.pdf');
  });

  it('refuses an oversized file with 413, and records why', async () => {
    const { service, prisma } = setup({
      download: jest.fn().mockRejectedValue(new WahaError(413, 'File terlalu besar')),
    });

    await expect(service.ensureStored('msg-1')).rejects.toMatchObject({ status: 413 });
    expect(prisma.whatsappMessage.update.mock.calls[0][0].data.mediaError).toContain(
      'terlalu besar',
    );
  });

  it('reports any other failure as 502 and remembers it, without storing anything', async () => {
    const { service, storage, prisma } = setup({
      download: jest.fn().mockRejectedValue(new WahaError(0, 'WAHA tidak dapat dijangkau')),
    });

    await expect(service.ensureStored('msg-1')).rejects.toMatchObject({ status: 502 });
    expect(storage.putPrivateObject).not.toHaveBeenCalled();
    expect(prisma.whatsappMessage.update.mock.calls[0][0].data.mediaError).toContain('dijangkau');
  });

  it('says the file is gone (410) when WhatsApp no longer has it, and remembers that permanently', async () => {
    const { service, prisma } = setup({
      download: jest
        .fn()
        .mockRejectedValue(
          new WahaError(410, 'File sudah tidak tersedia di WhatsApp (kedaluwarsa)'),
        ),
    });

    await expect(service.ensureStored('msg-1')).rejects.toMatchObject({ status: 410 });
    expect(prisma.whatsappMessage.update.mock.calls[0][0].data.mediaError).toBe(EXPIRED_MARKER);
  });

  it('does not ask WAHA again for a file already known to be gone', async () => {
    const { service, waha } = setup({
      message: {
        id: 'm',
        hasMedia: true,
        mediaKey: null,
        mediaError: EXPIRED_MARKER,
        chat: { chatId: 'c' },
      },
    });

    await expect(service.ensureStored('m')).rejects.toMatchObject({ status: 410 });
    expect(waha.downloadMessageMedia).not.toHaveBeenCalled();
  });

  it('can try again after a failure', async () => {
    const download = jest
      .fn()
      .mockRejectedValueOnce(new WahaError(500, 'boom'))
      .mockResolvedValueOnce({ buffer: Buffer.from('x'), mimetype: 'image/png' });
    const { service } = setup({ download });

    await expect(service.ensureStored('msg-1')).rejects.toBeDefined();
    expect(await service.ensureStored('msg-1')).toBe('crm-media/chat-1/msg-1.png');
  });
});

describe('WhatsappMediaService.open', () => {
  it('serves a safe type inline, under the stored name', async () => {
    const { service } = setup({ stored: { mediaMime: 'image/jpeg', mediaFilename: 'bukti.jpg' } });

    expect(await service.open('msg-1')).toMatchObject({
      contentType: 'image/jpeg',
      inline: true,
      filename: 'bukti.jpg',
      length: 8,
    });
  });

  it.each(['text/html', 'image/svg+xml', 'application/javascript'])(
    'never serves %s inline: it becomes a plain download',
    async (mime) => {
      const { service } = setup({ stored: { mediaMime: mime, mediaFilename: null } });

      expect(await service.open('msg-1')).toMatchObject({
        contentType: 'application/octet-stream',
        inline: false,
      });
    },
  );

  it('gives a nameless file a sensible name', async () => {
    const { service } = setup({ stored: { mediaMime: 'application/pdf', mediaFilename: null } });

    expect((await service.open('msg-1')).filename).toBe('lampiran.pdf');
  });
});

describe('WhatsappMediaService.prefetch', () => {
  it('never throws, even when the copy fails', async () => {
    const { service } = setup({ download: jest.fn().mockRejectedValue(new Error('down')) });

    expect(() => service.prefetch('msg-1')).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });
});
