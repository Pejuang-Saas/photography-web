import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseDriveFolderHtml } from './google-drive-public.parser';
import { DriveSourceError, type DiscoveryResult, type PhotoSource } from '../photo-source';

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const PARTIAL_WARNING =
  'Google hanya menampilkan 50 file pertama dari folder publik, jadi foto lainnya mungkin belum ikut. ' +
  'Bagi foto ke beberapa folder berisi maksimal 50 file, atau hubungi developer untuk memakai Google Drive API.';

/** Reads a public Drive folder by its web page: no account, no key, no cost. */
@Injectable()
export class GoogleDrivePublicSource implements PhotoSource {
  private readonly logger = new Logger(GoogleDrivePublicSource.name);

  constructor(private readonly config: ConfigService) {}

  async discover(folderId: string): Promise<DiscoveryResult> {
    const html = await this.fetchFolder(folderId);
    const { photos, possiblyTruncated } = parseDriveFolderHtml(html);
    if (photos.length === 0) {
      throw new DriveSourceError(
        'DRIVE_FOLDER_EMPTY',
        'Folder tidak berisi foto (JPG, PNG, WEBP, GIF, atau HEIC). Subfolder tidak ikut dibaca.',
      );
    }
    if (possiblyTruncated) this.logger.warn(`Folder ${folderId} reached the 50-entry page limit`);
    return { photos, warning: possiblyTruncated ? PARTIAL_WARNING : undefined };
  }

  private baseUrl() {
    return (this.config.get<string>('DRIVE_BASE_URL') ?? 'https://drive.google.com').replace(
      /\/$/,
      '',
    );
  }

  /** Retries network trouble and server errors with a growing pause, never a refusal. */
  private async fetchFolder(folderId: string) {
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      if (attempt > 0) await this.pause(1000 * 2 ** (attempt - 1));
      try {
        const response = await fetch(`${this.baseUrl()}/drive/folders/${folderId}`, {
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
