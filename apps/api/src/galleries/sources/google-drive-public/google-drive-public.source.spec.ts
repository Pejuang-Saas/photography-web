import { GoogleDrivePublicSource } from './google-drive-public.source';

const folder = (id: string, name: string) => [
  id,
  ['f'],
  name,
  'application/vnd.google-apps.folder',
  0,
  null,
];
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
  // These tests are about the folder page; the embed view answers empty so the page is used.
  const install = (mock: (url: string, init?: unknown) => unknown) => {
    global.fetch = ((url: string, init?: unknown) =>
      url.includes('/embeddedfolderview')
        ? Promise.resolve(reply(200, '<html></html>'))
        : mock(url, init)) as never;
  };
  return { source, config, reply, install };
}

describe('GoogleDrivePublicSource', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('reads the folder page at the configured address', async () => {
    const { install, source, reply } = setup();
    const fetchMock = jest.fn().mockResolvedValue(reply(200, page([file('a', 'a.jpg')])));
    install(fetchMock);

    const result = await source.discover('folder123');

    expect(fetchMock.mock.calls[0][0]).toBe('https://drive.test/drive/folders/folder123');
    expect(result.photos).toHaveLength(1);
    expect(result.warning).toBeUndefined();
  });

  it('warns that the listing may be partial when the page is full', async () => {
    const { install, source, reply } = setup();
    const many = Array.from({ length: 50 }, (_, index) => file(`id${index}`, `${index}.jpg`));
    install(jest.fn().mockResolvedValue(reply(200, page(many))));

    const result = await source.discover('folder123');

    expect(result.photos).toHaveLength(50);
    expect(result.warning).toContain('50 file pertama');
  });

  it.each([401, 403, 404])('treats a %s as a folder that is not shared', async (status) => {
    const { install, source, reply } = setup();
    const fetchMock = jest.fn().mockResolvedValue(reply(status));
    install(fetchMock);

    await expect(source.discover('folder123')).rejects.toMatchObject({
      code: 'DRIVE_FOLDER_PRIVATE',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats a redirect to the Google sign-in page as a folder that is not shared', async () => {
    const { install, source, reply } = setup();
    install(
      jest
        .fn()
        .mockResolvedValue(reply(200, '<html></html>', 'https://accounts.google.com/ServiceLogin')),
    );

    await expect(source.discover('folder123')).rejects.toMatchObject({
      code: 'DRIVE_FOLDER_PRIVATE',
    });
  });

  it('retries a server error and then succeeds', async () => {
    const { install, source, reply } = setup();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(reply(503))
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValue(reply(200, page([file('a', 'a.jpg')])));
    install(fetchMock);

    const result = await source.discover('folder123');

    expect(result.photos).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('gives up after the retries and says Google could not be reached', async () => {
    const { install, source } = setup();
    const fetchMock = jest.fn().mockRejectedValue(new Error('ETIMEDOUT'));
    install(fetchMock);

    await expect(source.discover('folder123')).rejects.toMatchObject({
      code: 'DRIVE_PARSE_FAILED',
      message: expect.stringContaining('ETIMEDOUT'),
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('asks again when Google answers with a page that has no folder data, then succeeds', async () => {
    const { install, source, reply } = setup();
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(reply(200, '<html>no data</html>'))
      .mockResolvedValue(reply(200, page([file('a', 'a.jpg')])));
    install(fetchMock);

    const result = await source.discover('folder123');

    expect(result.photos).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('reports an unreadable page after three tries, so a real format change is not hidden', async () => {
    const { install, source, reply } = setup();
    const fetchMock = jest.fn().mockResolvedValue(reply(200, '<html>no data</html>'));
    install(fetchMock);

    await expect(source.discover('folder123')).rejects.toMatchObject({
      code: 'DRIVE_PARSE_FAILED',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('says so when the folder has no photos', async () => {
    const { install, source, reply } = setup();
    install(jest.fn().mockResolvedValue(reply(200, page([]))));

    await expect(source.discover('folder123')).rejects.toMatchObject({
      code: 'DRIVE_FOLDER_EMPTY',
    });
  });

  it('reads photos inside subfolders, root first', async () => {
    const { install, source, reply } = setup();
    install(
      jest.fn(async (url: string) => {
        if (url.endsWith('/root'))
          return reply(200, page([file('r1', 'b.jpg'), folder('sub', 'Sesi 2')]));
        if (url.endsWith('/sub'))
          return reply(200, page([file('s1', 'a.jpg'), folder('deep', 'Edit')]));
        return reply(200, page([file('d1', 'c.jpg'), file('r1', 'b.jpg')]));
      }),
    );

    const result = await source.discover('root');

    expect(result.photos.map((photo) => photo.externalId)).toEqual(['r1', 's1', 'd1']);
    expect(result.photos.map((photo) => photo.folderPath)).toEqual(['', 'Sesi 2', 'Sesi 2/Edit']);
    expect(result.warning).toBeUndefined();
  });

  it('finds photos when the shared folder holds only subfolders', async () => {
    const { install, source, reply } = setup();
    install(
      jest.fn(async (url: string) =>
        url.endsWith('/root')
          ? reply(200, page([folder('sub', 'A')]))
          : reply(200, page([file('s1', 'a.jpg')])),
      ),
    );

    const result = await source.discover('root');

    expect(result.photos).toHaveLength(1);
  });

  it('skips a subfolder that cannot be read and says so', async () => {
    const { install, source, reply } = setup();
    install(
      jest.fn(async (url: string) =>
        url.endsWith('/root')
          ? reply(200, page([file('r1', 'a.jpg'), folder('sub', 'Rusak')]))
          : reply(404),
      ),
    );

    const result = await source.discover('root');

    expect(result.photos).toHaveLength(1);
    expect(result.warning).toContain('"Rusak"');
  });

  it('stops going deeper than the depth limit and warns', async () => {
    const { install, source, reply } = setup();
    install(
      jest.fn(async (url: string) => {
        const level = Number(url.split('/').pop()!.replace('f', '') || 0);
        return reply(200, page([file(`p${level}`, 'a.jpg'), folder(`f${level + 1}`, 'next')]));
      }),
    );

    const result = await source.discover('f0');

    expect(result.photos).toHaveLength(4);
    expect(result.warning).toContain('terlalu dalam');
  });

  describe('embed view', () => {
    const entry = (id: string, title: string, type = 'image/jpeg') =>
      `<div class="flip-entry" id="entry-${id}"><div class="flip-entry-info"><a href="https://drive.google.com/file/d/${id}/view"><div class="flip-entry-list-icon"><img src="https://drive-thirdparty.googleusercontent.com/16/type/${type}"/></div><div class="flip-entry-title">${title}</div></a></div></div>`;
    const dir = (id: string, title: string) =>
      `<div class="flip-entry" id="entry-${id}"><div class="flip-entry-info"><a href="https://drive.google.com/drive/folders/${id}"><div class="flip-entry-title">${title}</div></a></div></div>`;
    const embed = (...entries: string[]) => `<html><body>${entries.join('')}</body></html>`;

    it('reads more than 50 entries from the embed view and does not warn', async () => {
      const { source, reply } = setup();
      const many = Array.from({ length: 120 }, (_, index) => entry(`id${index}`, `${index}.jpg`));
      const fetchMock = jest.fn().mockResolvedValue(reply(200, embed(...many)));
      global.fetch = fetchMock as never;

      const result = await source.discover('folder123');

      expect(fetchMock.mock.calls[0][0]).toBe('https://drive.test/embeddedfolderview?id=folder123');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.photos).toHaveLength(120);
      expect(result.warning).toBeUndefined();
    });

    it('follows folders, skips files that are not photos, and decodes names', async () => {
      const { source, reply } = setup();
      global.fetch = jest.fn(async (url: string) =>
        reply(
          200,
          url.includes('id=root')
            ? embed(
                entry('r1', 'A &amp; B.jpg'),
                entry('raw', 'x.ARW', 'image/arw'),
                dir('sub', 'Sesi'),
              )
            : embed(entry('s1', 'c.png', 'image/png')),
        ),
      ) as never;

      const result = await source.discover('root');

      expect(result.photos.map((photo) => [photo.filename, photo.folderPath])).toEqual([
        ['A & B.jpg', ''],
        ['c.png', 'Sesi'],
      ]);
    });

    it('reads iPhone photos (HEIC and HEIF) and videos (MOV and MP4), but not RAW', async () => {
      const { source, reply } = setup();
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          reply(
            200,
            embed(
              entry('a', 'IMG_1.HEIC', 'image/heic'),
              entry('b', 'IMG_2.HEIC', 'image/heif'),
              entry('c', 'IMG_3.MOV', 'video/quicktime'),
              entry('d', 'clip.mp4', 'video/mp4'),
              entry('e', 'x.ARW', 'image/arw'),
            ),
          ),
        ) as never;

      const result = await source.discover('folder123');

      expect(result.photos.map((photo) => photo.externalId)).toEqual(['d', 'a', 'b', 'c']);
      expect(result.photos.find((photo) => photo.externalId === 'c')?.mimeType).toBe(
        'video/quicktime',
      );
    });

    it('treats a 404 from the embed view as a folder that is not shared', async () => {
      const { source, reply } = setup();
      const fetchMock = jest.fn().mockResolvedValue(reply(404));
      global.fetch = fetchMock as never;

      await expect(source.discover('folder123')).rejects.toMatchObject({
        code: 'DRIVE_FOLDER_PRIVATE',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to the folder page when the embed view fails', async () => {
      const { source, reply } = setup();
      global.fetch = jest.fn(async (url: string) =>
        url.includes('/embeddedfolderview') ? reply(500) : reply(200, page([file('a', 'a.jpg')])),
      ) as never;

      const result = await source.discover('folder123');

      expect(result.photos).toHaveLength(1);
    });
  });
});
