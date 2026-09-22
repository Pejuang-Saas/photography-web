export type MediaAsset = {
  id: string;
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
};

export type GalleryCategory = {
  id: string;
  name: string;
  slug: string;
};

export type GalleryItem = {
  id: string;
  title: string;
  altText: string;
  caption: string | null;
  location: string | null;
  categoryId: string | null;
  mediaAssetId: string;
  sortOrder: number;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: string;
  category: GalleryCategory | null;
  mediaAsset: MediaAsset;
};

export type GalleryPayload = {
  title: string;
  altText: string;
  categoryId?: string;
  caption?: string;
  location?: string;
  sortOrder: number;
  isFeatured: boolean;
  isPublished: boolean;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...init?.headers,
    },
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Sesi admin tidak memiliki akses ke CMS.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? 'Permintaan CMS gagal diproses.');
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const cmsApi = {
  listGallery: () => request<GalleryItem[]>('/admin/cms/gallery/items'),
  listCategories: () => request<GalleryCategory[]>('/admin/cms/gallery/categories'),
  createGalleryWithImage: (payload: GalleryPayload, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== '') formData.append(key, String(value));
    });
    return request<GalleryItem>('/admin/cms/gallery/items/upload', {
      method: 'POST',
      body: formData,
    });
  },
  updateGallery: (id: string, payload: Partial<GalleryPayload>) =>
    request<GalleryItem>(`/admin/cms/gallery/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateGalleryWithImage: (id: string, payload: GalleryPayload, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== '') formData.append(key, String(value));
    });
    return request<GalleryItem>(`/admin/cms/gallery/items/${id}/upload`, {
      method: 'PATCH',
      body: formData,
    });
  },
  deleteGallery: (id: string) =>
    request<void>(`/admin/cms/gallery/items/${id}`, { method: 'DELETE' }),
};
