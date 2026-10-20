export type GalleryStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type SelectionStatus = 'DRAFT' | 'SUBMITTED';
export type SyncStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/** A folder inside the shared Drive folder, as the server counts it. */
export interface FolderSummary {
  name: string;
  /** Names from the top, joined by "/", the same shape as a photo's `folderPath`. */
  path: string;
  /** Photos inside, subfolders included. */
  count: number;
  /** Of those, how many the customer picked; 0 outside the customer's page. */
  selected: number;
}

/** One page of photos; the folders directly inside the open one come with the first page only. */
export type PhotoPage = Paginated<Photo> & { folders?: FolderSummary[] };

/** Which kind of file a list shows: photos, videos, or both. */
export type MediaType = 'all' | 'photo' | 'video';

/** Which photos a tab lists; the picked ones follow the customer's saved draft. */
export type PhotoFilter = 'all' | 'selected' | 'unselected';

/** A photo as the customer sees it: metadata only, the image stays on Google Drive. */
export interface Photo {
  id: string;
  filename: string;
  driveFileId: string;
  thumbnailUrl: string | null;
  viewUrl: string | null;
  /** "image/jpeg", "video/mp4" and so on; videos are told apart by the "video/" start. */
  mimeType: string | null;
  /** Subfolders below the shared Drive folder, joined by "/"; null for the folder itself. */
  folderPath: string | null;
}

/** What a gallery's public link shows before anything is chosen. */
export interface PublicGalleryInfo {
  name: string;
  description: string | null;
  totalPhotos: number;
  /** Of the total, how many are videos. */
  totalVideos: number;
  maxSelections: number | null;
  status: GalleryStatus;
}

export interface SyncJob {
  id: string;
  galleryId: string;
  status: SyncStatus;
  totalFiles: number | null;
  syncedFiles: number;
  newFiles: number;
  removedFiles: number;
  percentComplete: number;
  errorMessage: string | null;
  /** The sync worked but the admin should know something, such as a partial listing. */
  warningMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AdminGallery {
  id: string;
  name: string;
  slug: string;
  publicToken: string;
  publicUrl: string;
  driveFolderId: string;
  status: GalleryStatus;
  description: string | null;
  maxSelections: number | null;
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGalleryListItem extends AdminGallery {
  totalPhotos: number;
  totalSubmissions: number;
  lastSyncAt: string | null;
}

export interface AdminGalleryDetail extends AdminGallery {
  totalPhotos: number;
  totalActivePhotos: number;
  totalActiveVideos: number;
  totalSelections: number;
  totalSubmissions: number;
  totalSelectedPhotos: number;
  booking: { id: string; bookingCode: string; customerName: string } | null;
  latestSyncJob: SyncJob | null;
}

export interface CreateGalleryInput {
  name: string;
  driveFolderUrl: string;
  description?: string;
  maxSelections?: number;
  bookingId?: string;
  status?: GalleryStatus;
}

export interface UpdateGalleryInput {
  name?: string;
  description?: string;
  status?: GalleryStatus;
  maxSelections?: number | null;
  driveFolderUrl?: string;
  /** null unlinks the booking. */
  bookingId?: string | null;
}

export interface SelectionSummary {
  id: string;
  galleryId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: SelectionStatus;
  selectedCount: number;
  submittedAt: string | null;
  createdAt: string;
}

export interface SelectionDetail extends Omit<SelectionSummary, 'selectedCount'> {
  selectedPhotos: Photo[];
}

export interface CreateSessionRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface CreateSessionResponse {
  sessionToken: string;
  selectionId: string;
}

export interface SessionState {
  status: SelectionStatus;
  customerName: string;
  selectedCount: number;
  selectedPhotoIds: string[];
  submittedAt: string | null;
}

export interface SubmitSelectionResponse {
  submittedAt: string;
  selectedCount: number;
  message: string;
}
