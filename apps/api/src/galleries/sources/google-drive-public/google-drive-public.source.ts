import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseDriveEmbedHtml, parseDriveFolderHtml } from './google-drive-public.parser';
import {
  DriveSourceError,
  type DiscoveredPhoto,
  type DiscoveryResult,
  type PhotoSource,
} from '../photo-source';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const PAGE_ATTEMPTS = 3;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const PARTIAL_WARNING =
  'Google hanya menampilkan 50 file pertama per folder publik, jadi foto lainnya mungkin belum ikut. ' +
  'Bagi foto ke beberapa subfolder berisi maksimal 50 file, atau hubungi developer untuk memakai Google Drive API.';

/** How deep below the shared folder photos are looked for, and how many folders in all. */
const MAX_DEPTH = 3;
const MAX_FOLDERS = 40;

/** Reads a public Drive folder by its web page: no account, no key, no cost. */
@Injectable()
export class GoogleDrivePublicSource implements PhotoSource {
  private readonly logger = new Logger(GoogleDrivePublicSource.name);

  constructor(private readonly config: ConfigService) {}

  async discover(rootId: string): Promise<DiscoveryResult> {
    const photos: DiscoveredPhoto[] = [];
    const seenPhotos = new Set<string>();
    const seenFolders = new Set<string>([rootId]);
    const warnings: string[] = [];
    let queue = [{ id: rootId, name: '', path: '', depth: 0 }];
    let truncated = false;
    let skipped = 0;

    // Folder by folder, level by level: the root's photos come first, then each subfolder's.
    while (queue.length > 0) {
      const next: typeof queue = [];
      for (const folder of queue) {
        let listing: Awaited<ReturnType<GoogleDrivePublicSource['readFolder']>>;
        try {
          listing = await this.readFolder(folder.id);
        } catch (error) {
          // The shared folder itself must be readable; a subfolder that is not is only reported.
          if (folder.depth === 0) throw error;
          warnings.push(`Subfolder "${folder.name}" tidak bisa dibaca dan dilewati.`);
          continue;
        }
        for (const photo of listing.photos) {
          if (seenPhotos.has(photo.externalId)) continue;
          seenPhotos.add(photo.externalId);
          photos.push({ ...photo, folderPath: folder.path });
        }
        if (listing.possiblyTruncated) {
          truncated = true;
          this.logger.warn(`Folder ${folder.id} reached the 50-entry page limit`);
        }
        for (const child of listing.folders) {
          if (seenFolders.has(child.id)) continue;
          if (folder.depth + 1 > MAX_DEPTH || seenFolders.size >= MAX_FOLDERS) {
            skipped += 1;
            continue;
          }
          seenFolders.add(child.id);
          // A "/" in a name would be read as another level.
          const name = child.name.replace(/\//g, '-');
          next.push({
            id: child.id,
            name,
            path: folder.path ? `${folder.path}/${name}` : name,
            depth: folder.depth + 1,
          });
        }
      }
      queue = next;
    }

    if (photos.length === 0) {
      throw new DriveSourceError(
        'DRIVE_FOLDER_EMPTY',
        'Folder tidak berisi foto atau video (JPG, PNG, WEBP, GIF, HEIC, MP4, atau MOV), termasuk di dalam subfolder.',
      );
    }
    if (skipped > 0) {
      warnings.push(
        `${skipped} subfolder tidak dibaca karena terlalu dalam (maks ${MAX_DEPTH} tingkat) atau terlalu banyak (maks ${MAX_FOLDERS} folder).`,
      );
    }
    if (truncated) warnings.push(PARTIAL_WARNING);
    return { photos, warning: warnings.length > 0 ? warnings.join(' ') : undefined };
  }

  /**
   * The embed view lists the whole folder; the regular page stops at 50 entries. The embed is
   * tried first, and when it cannot be read or comes back empty the regular page decides, so a
   * change on Google's side to one view does not stop syncing.
   */
  private async readFolder(folderId: string) {
    try {
      // One try: the folder page below is the fallback, so retrying here would only slow it down.
      const html = await this.fetchPage(`/embeddedfolderview?id=${folderId}`, 0);
      const listing = parseDriveEmbedHtml(html);
      if (listing.entryCount > 0) return { ...listing, possiblyTruncated: false };
    } catch (error) {
      if (error instanceof DriveSourceError && error.code === 'DRIVE_FOLDER_PRIVATE') throw error;
      this.logger.warn(
        `Embed view of folder ${folderId} failed, using the folder page: ${(error as Error).message}`,
      );
    }
    return this.readFolderPage(folderId);
  }

  /**
   * Google now and then answers with a page that has no folder data in it, and the same request
   * works a moment later. A page that cannot be read is asked for again a few times; a folder
   * that is not shared is not, because asking again cannot change that.
   */
  private async readFolderPage(folderId: string) {
    for (let attempt = 1; ; attempt += 1) {
      // A page that could not even be fetched has already been retried by fetchPage.
      const html = await this.fetchPage(`/drive/folders/${folderId}`);
      try {
        return parseDriveFolderHtml(html);
      } catch (error) {
        const unreadable = error instanceof DriveSourceError && error.code === 'DRIVE_PARSE_FAILED';
        if (!unreadable || attempt >= PAGE_ATTEMPTS) throw error;
        await this.pause(1000 * attempt);
      }
    }
  }

  private baseUrl() {
    return (this.config.get<string>('DRIVE_BASE_URL') ?? 'https://drive.google.com').replace(
      /\/$/,
      '',
    );
  }

  /** Retries network trouble and server errors with a growing pause, never a refusal. */
  private async fetchPage(path: string, retries = MAX_RETRIES) {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (attempt > 0) await this.pause(1000 * 2 ** (attempt - 1));
      try {
        const response = await fetch(`${this.baseUrl()}${path}`, {
          headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          throw new DriveSourceError(
            'DRIVE_FOLDER_PRIVATE',
            'Folder tidak ditemukan atau belum dibagikan. Ubah akses folder menjadi "Anyone with the link" sebagai Viewer.',
          );
        }
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`Google Drive membalas ${response.status}`);
          continue;
        }
        if (!response.ok) throw new Error(`Google Drive membalas ${response.status}`);
        if (response.url.includes('accounts.google.com')) {
          throw new DriveSourceError(
            'DRIVE_FOLDER_PRIVATE',
            'Folder belum dibagikan. Ubah akses folder menjadi "Anyone with the link" sebagai Viewer.',
          );
        }
        return await response.text();
      } catch (error) {
        if (error instanceof DriveSourceError) throw error;
        lastError = error;
      }
    }
    throw new DriveSourceError(
      'DRIVE_PARSE_FAILED',
      `Google Drive tidak bisa dihubungi: ${(lastError as Error)?.message ?? 'tidak diketahui'}`,
    );
  }

  /** Separate so tests do not wait for real backoff. */
  protected pause(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
