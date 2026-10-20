import { DRIVE_THUMBNAIL_URL, DRIVE_VIEW_URL } from './drive-urls';
import { DriveSourceError, type DiscoveredPhoto } from '../photo-source';

/*
 * Everything that depends on how Google lays out a public folder page lives in this file. If
 * Google changes the markup, this is the only place to fix.
 */

/** How many entries a public folder page lists before it stops. Google gives no way to ask for more. */
export const DRIVE_PAGE_LIMIT = 50;

const MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
]);

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
};

/** Photos and videos are kept. Drive labels some uploads (often camera exports) as a generic binary; the extension tells. */
function mediaTypeOf(name: string, mime: string) {
  if (MEDIA_TYPES.has(mime)) return mime;
  if (mime !== 'application/octet-stream') return null;
  return EXTENSION_TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? null;
}

const FOLDER_MIME = 'application/vnd.google-apps.folder';

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

  const photos: Omit<DiscoveredPhoto, 'folderPath'>[] = entries
    .flatMap((entry) => {
      const mimeType = mediaTypeOf(entry[2], entry[3]);
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

  const folders = entries
    .filter((entry) => entry[3] === FOLDER_MIME)
    .map((entry) => ({ id: entry[0], name: entry[2] }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return {
    photos,
    /** Subfolders listed here, so the caller can read what is inside them. */
    folders,
    /** True when the page listed exactly its limit, so more files may exist that it did not show. */
    possiblyTruncated: entries.length >= DRIVE_PAGE_LIMIT,
  };
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function decodeHtml(text: string) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (whole, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (entity.startsWith('#')) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return HTML_ENTITIES[entity] ?? whole;
  });
}

/**
 * The embeddable folder view (`/embeddedfolderview`) lists every entry of a folder in plain HTML,
 * where the regular folder page stops at 50. Each entry is a `flip-entry` block with its id, a link
 * (to `/folders/` for a folder, `/file/d/` for a file), its title, and an icon named after its type.
 */
export function parseDriveEmbedHtml(html: string) {
  const blocks = html.split('<div class="flip-entry" id="entry-').slice(1);
  const photos: Omit<DiscoveredPhoto, 'folderPath'>[] = [];
  const folders: { id: string; name: string }[] = [];

  for (const block of blocks) {
    const id = block.match(/^([A-Za-z0-9_-]+)"/)?.[1];
    const title = block.match(/<div class="flip-entry-title">([\s\S]*?)<\/div>/)?.[1];
    if (!id || title === undefined) continue;
    const name = decodeHtml(title);

    if (block.includes('/drive/folders/')) {
      folders.push({ id, name });
      continue;
    }
    const iconType = block.match(
      /drive-thirdparty\.googleusercontent\.com\/\d+\/type\/([^"]+)"/,
    )?.[1];
    const mimeType = mediaTypeOf(name, iconType ?? 'application/octet-stream');
    if (!mimeType) continue;
    photos.push({
      externalId: id,
      filename: name,
      mimeType,
      thumbnailUrl: DRIVE_THUMBNAIL_URL(id),
      viewUrl: DRIVE_VIEW_URL(id),
    });
  }

  photos.sort((a, b) => a.filename.localeCompare(b.filename, undefined, { numeric: true }));
  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  return { photos, folders, entryCount: blocks.length };
}
