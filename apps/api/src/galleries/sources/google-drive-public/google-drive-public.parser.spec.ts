import { DriveSourceError } from '../photo-source';
import {
  DRIVE_PAGE_LIMIT,
  decodeJsString,
  extractFolderId,
  parseDriveFolderHtml,
} from './google-drive-public.parser';

/** Shaped like a real folder page: the data is a JS string literal full of \xNN escapes. */
function folderPage(children: unknown[] | null) {
  const json = JSON.stringify([children, null, null, null, [[[[1, 2]]]], 1]);
  const literal = json
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\x22')
    .replace(/\[/g, '\\x5b')
    .replace(/\]/g, '\\x5d');
  return `<html><script>window['_DRIVE_ivd'] = '${literal}';</script></html>`;
}

const file = (id: string, name: string, mime = 'image/jpeg') => [
  id,
  ['folder-id'],
  name,
  mime,
  0,
  null,
];

describe('extractFolderId', () => {
  it.each([
    ['https://drive.google.com/drive/folders/1aBcDeFgHiJkL', '1aBcDeFgHiJkL'],
    ['https://drive.google.com/drive/u/0/folders/1aBcDeFgHiJkL', '1aBcDeFgHiJkL'],
    ['https://drive.google.com/drive/folders/1aBcDeFgHiJkL?usp=sharing', '1aBcDeFgHiJkL'],
    ['  https://drive.google.com/drive/folders/1aBcDeFgHiJkL  ', '1aBcDeFgHiJkL'],
    ['https://drive.google.com/open?id=1aBcDeFgHiJkL', '1aBcDeFgHiJkL'],
    ['1aBcDeFgHiJkL', '1aBcDeFgHiJkL'],
  ])('reads %s', (input, expected) => {
    expect(extractFolderId(input)).toBe(expected);
  });

  it.each([
    'https://example.com/drive/folders/1aBcDeFgHiJkL',
    'https://drive.google.com/file/d/1aBcDeFgHiJkL/view',
    'not a url',
    '',
    'short',
  ])('refuses %j', (input) => {
    expect(extractFolderId(input)).toBeNull();
  });
});

describe('decodeJsString', () => {
  it('reads hex and unicode escapes', () => {
    expect(decodeJsString('\\x5b\\x22a\\x22\\x5d \\u00e9')).toBe('["a"] é');
  });

  it('reads an escaped backslash once, so it cannot swallow the next escape', () => {
    expect(decodeJsString('\\\\\\x22')).toBe('\\"');
  });
});

describe('parseDriveFolderHtml', () => {
  it('lists the images, with Drive urls built from the file id', () => {
    const { photos } = parseDriveFolderHtml(
      folderPage([file('id-1', 'DSC_0001.jpg'), file('id-2', 'DSC_0002.png', 'image/png')]),
    );

    expect(photos).toEqual([
      {
        externalId: 'id-1',
        filename: 'DSC_0001.jpg',
        mimeType: 'image/jpeg',
        thumbnailUrl: 'https://drive.google.com/thumbnail?id=id-1&sz=w400',
        viewUrl: 'https://drive.google.com/file/d/id-1/view',
      },
      expect.objectContaining({ externalId: 'id-2', mimeType: 'image/png' }),
    ]);
  });

  it('leaves out folders and files that are not images', () => {
    const { photos } = parseDriveFolderHtml(
      folderPage([
        file('f', 'Subfolder', 'application/vnd.google-apps.folder'),
        file('z', 'all.zip', 'application/zip'),
        file('v', 'clip.mp4', 'video/mp4'),
        file('p', 'a.jpg'),
      ]),
    );

    expect(photos.map((photo) => photo.externalId)).toEqual(['p']);
  });

  it('recognises an image Drive labelled as a generic binary by its extension', () => {
    const { photos } = parseDriveFolderHtml(
      folderPage([
        file('a', 'DSC_1.JPG', 'application/octet-stream'),
        file('b', 'notes.txt', 'application/octet-stream'),
        file('c', 'raw.cr2', 'application/octet-stream'),
      ]),
    );

    expect(photos).toEqual([expect.objectContaining({ externalId: 'a', mimeType: 'image/jpeg' })]);
  });

  it('orders by file name the way people count: IMG_2 before IMG_10', () => {
    const { photos } = parseDriveFolderHtml(
      folderPage([file('a', 'IMG_10.jpg'), file('b', 'IMG_2.jpg'), file('c', 'IMG_1.jpg')]),
    );

    expect(photos.map((photo) => photo.filename)).toEqual(['IMG_1.jpg', 'IMG_2.jpg', 'IMG_10.jpg']);
  });

  it('keeps names with quotes, backslashes and accents intact', () => {
    const { photos } = parseDriveFolderHtml(folderPage([file('a', 'Foto "wisuda" \\ Café.jpg')]));

    expect(photos[0].filename).toBe('Foto "wisuda" \\ Café.jpg');
  });

  it('returns nothing, without failing, for an empty folder', () => {
    expect(parseDriveFolderHtml(folderPage(null)).photos).toEqual([]);
    expect(parseDriveFolderHtml(folderPage([])).photos).toEqual([]);
  });

  it('says when the page listed exactly its limit, since more may be hidden', () => {
    const many = (count: number) =>
      folderPage(Array.from({ length: count }, (_, index) => file(`id-${index}`, `${index}.jpg`)));

    expect(parseDriveFolderHtml(many(DRIVE_PAGE_LIMIT)).possiblyTruncated).toBe(true);
    expect(parseDriveFolderHtml(many(DRIVE_PAGE_LIMIT - 1)).possiblyTruncated).toBe(false);
  });

  it('counts folders toward the limit, because the page counts them too', () => {
    const entries = [
      ...Array.from({ length: 10 }, (_, index) =>
        file(`d-${index}`, `d${index}`, 'application/vnd.google-apps.folder'),
      ),
      ...Array.from({ length: 40 }, (_, index) => file(`i-${index}`, `${index}.jpg`)),
    ];

    expect(parseDriveFolderHtml(folderPage(entries)).possiblyTruncated).toBe(true);
  });

  it('explains a folder that is not shared', () => {
    const page = '<a href="https://accounts.google.com/ServiceLogin?continue=x">Sign in</a>';

    expect(() => parseDriveFolderHtml(page)).toThrow(DriveSourceError);
    expect(() => parseDriveFolderHtml(page)).toThrow(/Anyone with the link/);
  });

  it('reports a page it cannot understand as a parse failure, with a code', () => {
    for (const html of [
      '<html>nothing here</html>',
      "<script>window['_DRIVE_ivd'] = 'not json';</script>",
    ]) {
      try {
        parseDriveFolderHtml(html);
        throw new Error('should have thrown');
      } catch (error) {
        expect(error).toMatchObject({ code: 'DRIVE_PARSE_FAILED' });
      }
    }
  });

  it('ignores entries that are not shaped like files', () => {
    const { photos } = parseDriveFolderHtml(folderPage([['x'], null, 5, file('ok', 'a.jpg')]));

    expect(photos.map((photo) => photo.externalId)).toEqual(['ok']);
  });
});
