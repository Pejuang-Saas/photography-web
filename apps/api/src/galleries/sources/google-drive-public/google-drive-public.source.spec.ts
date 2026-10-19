import { GoogleDrivePublicSource } from './google-drive-public.source';

const file = (id: string, name: string) => [id, ['f'], name, 'image/jpeg', 0, null];

function page(children: unknown[]) {
  const json = JSON.stringify([children, null, null, null, null, 1]);
  const literal = json.replace(/\\/g, '\\\\').replace(/"/g, '\\x22');
  return `<script>window['_DRIVE_ivd'] = '${literal}';</script>`;
}

function setup() {
  const config = { get: jest.fn(() => 'https://drive.test') };
  const source = new GoogleDrivePublicSource(config as never);
  (source as unknown as { pause: jest.Mock }).pause = jest.fn().mockResolvedValue(undefined);
  const reply = (status: number, body = '', url = 'https://drive.test/drive/folders/f') =>
    ({ status, ok: status >= 200 && status < 300, url, text: async () => body }) as Response;
  return { source, config, reply };
}

describe('GoogleDrivePublicSource', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('reads the folder page at the configured address', async () => {
    const { source, reply } = setup();
    const fetchMock = jest.fn().mockResolvedValue(reply(200, page([file('a', 'a.jpg')])));
    global.fetch = fetchMock as never;

    const result = await source.discover('folder123');

    expect(fetchMock.mock.calls[0][0]).toBe('https://drive.test/drive/folders/folder123');
    expect(result.photos).toHaveLength(1);
    expect(result.warning).toBeUndefined();
  });

  it('warns that the listing may be partial when the page is full', async () => {
    const { source, reply } = setup();
    const many = Array.from({ length: 50 }, (_, index) => file(`id${index}`, `${index}.jpg`));
    global.fetch = jest.fn().mockResolvedValue(reply(200, page(many))) as never;

    const result = await source.discover('folder123');

    expect(result.photos).toHaveLength(50);
    expect(result.warning).toContain('50 file pertama');
  });

  it.each([401, 403, 404])('treats a %s as a folder that is not shared', async (status) => {
    const { source, reply } = setup();
    const fetchMock = jest.fn().mockResolvedValue(reply(status));
    global.fetch = fetchMock as never;

    await expect(source.discover('folder123')).rejects.toMatchObject({
      code: 'DRIVE_FOLDER_PRIVATE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats a redirect to the Google sign-in page as a folder that is not shared', async () => {
    const { source, reply } = setup();
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        reply(200, '<html></html>', 'https://accounts.google.com/ServiceLogin'),
      ) as never;

    await expect(source.discover('folder123')).rejects.toMatchObject({
      code: 'DRIVE_FOLDER_PRIVATE',
    });
  });

  it('retries a server error and then succeeds', async () => {
    const { source, reply } = setup();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(reply(503))
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValue(reply(200, page([file('a', 'a.jpg')])));
    global.fetch = fetchMock as never;

    const result = await source.discover('folder123');

    expect(result.photos).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('gives up after the retries and says Google could not be reached', async () => {
    const { source } = setup();
    const fetchMock = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
    global.fetch = fetchMock as never;

    await expect(source.discover('folder123')).rejects.toMatchObject({
      code: 'DRIVE_PARSE_FAILED',
      message: expect.stringContaining('ETIMEDOUT'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('says so when the folder has no photos', async () => {
    const { source, reply } = setup();
    global.fetch = jest.fn().mockResolvedValue(reply(200, page([]))) as never;

    await expect(source.discover('folder123')).rejects.toMatchObject({
      code: 'DRIVE_FOLDER_EMPTY',
    });
  });
});
