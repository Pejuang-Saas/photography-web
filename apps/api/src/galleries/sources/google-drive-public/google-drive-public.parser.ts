import { DRIVE_THUMBNAIL_URL, DRIVE_VIEW_URL } from './drive-urls';
import { DriveSourceError, type DiscoveredPhoto } from '../photo-source';

/*
 * Everything that depends on how Google lays out a public folder page lives in this file. If
 * Google changes the markup, this is the only place to fix.
 */

/** How many entries a public folder page lists before it stops. Google gives no way to ask for more. */
export const DRIVE_PAGE_LIMIT = 50;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']);

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
};

/** Drive labels some uploads (often camera exports) as a generic binary; the extension tells. */
function imageTypeOf(name: string, mime: string) {
  if (IMAGE_TYPES.has(mime)) return mime;
  if (mime !== 'application/octet-stream') return null;
  return EXTENSION_TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? null;
}

const FOLDER_ID = /^[A-Za-z0-9_-]{10,}$/;

/** The folder id from any of the shapes Drive hands out, or from the bare id; null when unknown. */
export function extractFolderId(input: string): string | null {
  const value = input.trim();
  if (FOLDER_ID.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname !== 'drive.google.com') return null;
    const fromPath = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/);
    if (fromPath) return fromPath[1];
    const fromQuery = url.searchParams.get('id');
    return fromQuery && FOLDER_ID.test(fromQuery) ? fromQuery : null;
  } catch {
    return null;
  }
}

const SIMPLE_ESCAPES: Record<string, string> = {
  n: '\n',
  r: '\r',
  t: '\t',
  b: '\b',
  f: '\f',
  v: '\v',
  '0': '\0',
};

/**
 * The page embeds its data as a JavaScript string literal. Every escape is read in one pass: a
 * sequence like `\\\x22` is a backslash followed by a quote, which is only right if the escaped
 * backslash is not looked at a second time.
 */
export function decodeJsString(raw: string) {
  return raw.replace(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[\s\S])/g, (_, escape: string) =>
    escape.length > 1
      ? String.fromCharCode(parseInt(escape.slice(1), 16))
      : (SIMPLE_ESCAPES[escape] ?? escape),
  );
}

type Entry = [string, unknown, string, string, ...unknown[]];

const isEntry = (value: unknown): value is Entry =>
  Array.isArray(value) &&
  typeof value[0] === 'string' &&
  value[0].length > 0 &&
  typeof value[2] === 'string' &&
  typeof value[3] === 'string';

export function parseDriveFolderHtml(html: string) {
  if (
    /accounts\.google\.com\/(ServiceLogin|v3\/signin)/.test(html) &&
    !html.includes('_DRIVE_ivd')
  ) {
    throw new DriveSourceError(
      'DRIVE_FOLDER_PRIVATE',
      'Folder belum dibagikan. Ubah akses folder menjadi "Anyone with the link" sebagai Viewer.',
    );
  }

  const embedded = html.match(/window\['_DRIVE_ivd'\]\s*=\s*'((?:[^'\\]|\\[\s\S])*)'/);
  if (!embedded) {
    throw new DriveSourceError(
      'DRIVE_PARSE_FAILED',
      'Halaman folder Google Drive tidak dikenali. Format halaman mungkin berubah.',
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(decodeJsString(embedded[1]));
  } catch {
    throw new DriveSourceError(
      'DRIVE_PARSE_FAILED',
      'Data folder Google Drive tidak bisa dibaca. Format halaman mungkin berubah.',
    );
  }

  // Slot 0 lists the folder's children, or is null for an empty folder.
  const listing = Array.isArray(data) ? data[0] : undefined;
  if (listing !== null && !Array.isArray(listing)) {
    throw new DriveSourceError(
      'DRIVE_PARSE_FAILED',
      'Isi folder Google Drive tidak bisa dikenali. Format halaman mungkin berubah.',
    );
  }
  const entries = (listing ?? []).filter(isEntry);

  const photos: DiscoveredPhoto[] = entries
    .flatMap((entry) => {
      const mimeType = imageTypeOf(entry[2], entry[3]);
      return mimeType
        ? [
            {
              externalId: entry[0],
              filename: entry[2],
              mimeType,
              thumbnailUrl: DRIVE_THUMBNAIL_URL(entry[0]),
              viewUrl: DRIVE_VIEW_URL(entry[0]),
            },
          ]
        : [];
    })
    .sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));

  return {
    photos,
    /** True when the page listed exactly its limit, so more files may exist that it did not show. */
    possiblyTruncated: entries.length >= DRIVE_PAGE_LIMIT,
  };
}
