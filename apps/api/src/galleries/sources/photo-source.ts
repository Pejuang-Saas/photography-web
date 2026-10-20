export type DiscoveredPhoto = {
  externalId: string;
  filename: string;
  mimeType: string;
  thumbnailUrl: string;
  viewUrl: string;
  /** Subfolders below the shared folder, joined by "/"; empty for a photo in the folder itself. */
  folderPath: string;
};

export type DiscoveryResult = {
  photos: DiscoveredPhoto[];
  /** Something the admin should know even though the sync worked, such as a partial listing. */
  warning?: string;
};

/** Where a gallery's photos come from. Only this seam knows about Google Drive. */
export interface PhotoSource {
  discover(folderId: string): Promise<DiscoveryResult>;
}

export type DriveErrorCode =
  'DRIVE_FOLDER_INVALID' | 'DRIVE_FOLDER_PRIVATE' | 'DRIVE_FOLDER_EMPTY' | 'DRIVE_PARSE_FAILED';

/** A failure the admin can act on, with a stable code the sync records. */
export class DriveSourceError extends Error {
  constructor(
    readonly code: DriveErrorCode,
    message: string,
  ) {
    super(message);
  }
}
