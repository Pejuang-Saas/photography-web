import { apiRequest } from './api-client';
import type {
  AdminGalleryDetail,
  AdminGalleryListItem,
  CreateGalleryInput,
  CreateSessionRequest,
  CreateSessionResponse,
  AdminGallery,
  Paginated,
  MediaType,
  PhotoFilter,
  PhotoPage,
  PublicGalleryInfo,
  SelectionDetail,
  SelectionStatus,
  SelectionSummary,
  SessionState,
  SubmitSelectionResponse,
  SyncJob,
  UpdateGalleryInput,
  GalleryStatus,
} from '@/types/gallery';

const json = (body: unknown) => JSON.stringify(body);

function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const galleryApi = {
  list: (params: { page?: number; limit?: number; status?: GalleryStatus }) =>
    apiRequest<Paginated<AdminGalleryListItem>>(`/admin/galleries${query(params)}`),
  get: (id: string) => apiRequest<AdminGalleryDetail>(`/admin/galleries/${id}`),
  create: (input: CreateGalleryInput) =>
    apiRequest<AdminGallery>('/admin/galleries', { method: 'POST', body: json(input) }),
  update: (id: string, input: UpdateGalleryInput) =>
    apiRequest<AdminGallery>(`/admin/galleries/${id}`, { method: 'PUT', body: json(input) }),
  remove: (id: string) => apiRequest<void>(`/admin/galleries/${id}`, { method: 'DELETE' }),
  triggerSync: (id: string) =>
    apiRequest<{ syncJobId: string }>(`/admin/galleries/${id}/sync`, { method: 'POST' }),
  latestSync: (id: string) => apiRequest<SyncJob>(`/admin/galleries/${id}/sync/latest`),
  photos: (
    id: string,
    params: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      folder?: string;
      type?: MediaType;
    },
  ) => apiRequest<PhotoPage>(`/admin/galleries/${id}/photos${query(params)}`),
  selections: (id: string, params: { page?: number; limit?: number; status?: SelectionStatus }) =>
    apiRequest<Paginated<SelectionSummary>>(`/admin/galleries/${id}/selections${query(params)}`),
  selection: (id: string, selectionId: string) =>
    apiRequest<SelectionDetail>(`/admin/galleries/${id}/selections/${selectionId}`),
  removeSelection: (id: string, selectionId: string) =>
    apiRequest<void>(`/admin/galleries/${id}/selections/${selectionId}`, { method: 'DELETE' }),
};

/** The customer's side, reached by the secret in the link. */
export const publicGalleryApi = {
  info: (token: string) => apiRequest<PublicGalleryInfo>(`/g/${token}`),
  photos: (
    token: string,
    params: {
      page: number;
      limit?: number;
      /** The open folder; empty is the shared folder itself. */
      folder?: string;
      filter?: PhotoFilter;
      type?: MediaType;
      /** Needed for the selected and unselected tabs, and for the per-folder picked counts. */
      sessionToken?: string;
    },
  ) => apiRequest<PhotoPage>(`/g/${token}/photos${query(params)}`),
  createSession: (token: string, input: CreateSessionRequest) =>
    apiRequest<CreateSessionResponse>(`/g/${token}/selections`, {
      method: 'POST',
      body: json(input),
    }),
  getSession: (token: string, sessionToken: string) =>
    apiRequest<SessionState>(`/g/${token}/selections/${sessionToken}`),
  save: (token: string, sessionToken: string, photoIds: string[], keepalive = false) =>
    apiRequest<{ selectedCount: number }>(`/g/${token}/selections/${sessionToken}`, {
      method: 'PUT',
      body: json({ photoIds }),
      keepalive,
    }),
  saveNote: (token: string, sessionToken: string, photoId: string, note: string) =>
    apiRequest<{ saved: boolean }>(`/g/${token}/selections/${sessionToken}/notes/${photoId}`, {
      method: 'PUT',
      body: json({ note }),
    }),
  saveRevision: (token: string, sessionToken: string, photoId: string, note: string) =>
    apiRequest<{ saved: boolean }>(`/g/${token}/selections/${sessionToken}/revisions/${photoId}`, {
      method: 'PUT',
      body: json({ note }),
    }),
  submit: (token: string, sessionToken: string, note?: string) =>
    apiRequest<SubmitSelectionResponse>(`/g/${token}/selections/${sessionToken}/submit`, {
      method: 'POST',
      body: json({ note }),
    }),
};
