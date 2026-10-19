jest.mock('@nestjs-redis/client', () => ({ RedisToken: () => 'REDIS' }));
jest.mock('@thallesp/nestjs-better-auth', () => ({
  Roles: () => () => undefined,
  AllowAnonymous: () => () => undefined,
}));
jest.mock('../storage/storage.module', () => ({ StorageModule: class StorageModule {} }));

import { Readable } from 'stream';
import { CrmController } from './crm.controller';

function setup(file: Record<string, unknown>) {
  const media = {
    open: jest.fn().mockResolvedValue({ stream: Readable.from(['x']), length: 1, ...file }),
  };
  const controller = new CrmController(
    {} as never, // chats
    {} as never, // categories
    {} as never, // sender
    media as never,
    {} as never, // templates
    {} as never, // sync
    {} as never, // events
  );
  const headers: Record<string, string> = {};
  const response = { setHeader: (name: string, value: string) => (headers[name] = value) };
  return { controller, media, headers, response };
}

describe('CrmController.attachment', () => {
  it('shows a photo inline and tells the browser not to guess its type', async () => {
    const { controller, headers, response } = setup({
      contentType: 'image/jpeg',
      inline: true,
      filename: 'bukti transfer.jpg',
    });

    const file = await controller.attachment('msg-1', response as never);

    expect(file.getHeaders()).toMatchObject({
      type: 'image/jpeg',
      length: 1,
      disposition: "inline; filename*=UTF-8''bukti%20transfer.jpg",
    });
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Cache-Control']).toBe('private, max-age=86400');
  });

  it('forces a download for a type that must not be shown in the page', async () => {
    const { controller, response } = setup({
      contentType: 'application/octet-stream',
      inline: false,
      filename: 'laporan.html',
    });

    const file = await controller.attachment('msg-1', response as never);

    expect(file.getHeaders().disposition).toBe("attachment; filename*=UTF-8''laporan.html");
    expect(file.getHeaders().type).toBe('application/octet-stream');
  });

  it('cannot be tricked by quotes or line breaks in a file name', async () => {
    const { controller, response } = setup({
      contentType: 'application/pdf',
      inline: true,
      filename: 'a"b\r\nSet-Cookie: x=1.pdf',
    });

    const { disposition } = (await controller.attachment('msg-1', response as never)).getHeaders();

    expect(disposition).not.toMatch(/[\r\n"]/);
    expect(disposition).toContain('%0D%0A');
  });
});
