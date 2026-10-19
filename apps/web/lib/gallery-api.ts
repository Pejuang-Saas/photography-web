import { apiRequest } from './api-client';
import type {
  AdminGalleryDetail,
  AdminGalleryListItem,
  CreateGalleryInput,
  CreateSessionRequest,
  CreateSessionResponse,
  AdminGallery,
  Paginated,
  Photo,
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

function query(params: Record<string, string | number | undefined>) {
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
  selections: (id: string, params: { page?: number; limit?: number; status?: SelectionStatus }) =>
    apiRequest<Paginated<SelectionSummary>>(`/admin/galleries/${id}/selections${query(params)}`),
  selection: (id: string, selectionId: string) =>
    apiRequest<SelectionDetail>(`/admin/galleries/${id}/selections/${selectionId}`),
};

/** The customer's side, reached by the secret in the link. */
export const publicGalleryApi = {
  info: (token: string) => apiRequest<PublicGalleryInfo>(`/g/${token}`),
  photos: (token: string, page: number, limit = 100) =>
    apiRequest<Paginated<Photo>>(`/g/${token}/photos${query({ page, limit })}`),
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
  submit: (token: string, sessionToken: string) =>
    apiRequest<SubmitSelectionResponse>(`/g/${token}/selections/${sessionToken}/submit`, {
      method: 'POST',
      body: json({}),
    }),
};
