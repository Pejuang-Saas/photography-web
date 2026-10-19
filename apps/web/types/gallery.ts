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

/** A photo as the customer sees it: metadata only, the image stays on Google Drive. */
export interface Photo {
  id: string;
  filename: string;
  driveFileId: string;
  thumbnailUrl: string | null;
  viewUrl: string | null;
}

/** What a gallery's public link shows before anything is chosen. */
export interface PublicGalleryInfo {
  name: string;
  description: string | null;
  totalPhotos: number;
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
