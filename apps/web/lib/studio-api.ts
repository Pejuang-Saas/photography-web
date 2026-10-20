import { apiRequest } from './api-client';

/** Shown only if the studio profile cannot be loaded at all. */
export const FALLBACK_STUDIO_NAME = 'Studio Foto';

/** "Kayastory Photography" -> "KAYASTORY", the short wordmark used in headers. */
export const brandMark = (studioName: string) => studioName.split(' ')[0].toUpperCase();

export type StudioInfo = {
  studioName: string;
  whatsappNumber: string | null;
  address: string | null;
  mapsUrl: string | null;
  instagramHandle: string | null;
  instagramUrl: string | null;
  city: string | null;
  region: string | null;
  openTime: string | null;
  closeTime: string | null;
  guarantees: string[];
  /** The general conditions every package is booked under. */
  reservationTerms: string[];
  /** Off means the catalog is for looking only: nobody can book online. */
  reservationsOpen: boolean;
};

export type AdminStudioSettings = StudioInfo & { updatedAt: string };

export type UpdateStudioInput = Partial<{
  studioName: string;
  whatsappNumber: string;
  address: string;
  mapsUrl: string;
  instagramHandle: string;
  city: string;
  region: string;
  openTime: string;
  closeTime: string;
  guarantees: string[];
  reservationTerms: string[];
  reservationsOpen: boolean;
}>;

export const studioApi = {
  getPublic: () => apiRequest<StudioInfo>('/public/studio-info'),
  getAdmin: () => apiRequest<AdminStudioSettings>('/admin/studio-settings'),
  update: (body: UpdateStudioInput) =>
    apiRequest<AdminStudioSettings>('/admin/studio-settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
