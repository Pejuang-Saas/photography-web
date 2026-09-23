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
  description: string | null;
  sortOrder?: number;
  isActive: boolean;
  _count?: { galleryItems: number };
};

export type GalleryCategoryPayload = {
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isActive: boolean;
};

export type MarqueeItem = {
  id: string;
  text: string;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MarqueePayload = {
  text: string;
  linkUrl?: string;
  sortOrder?: number;
  isActive: boolean;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaqPayload = {
  question: string;
  answer: string;
  sortOrder?: number;
  isPublished: boolean;
};

export type Testimonial = {
  id: string;
  customerName: string;
  customerRole: string | null;
  university: string | null;
  quote: string;
  rating: number;
  mediaAssetId: string | null;
  sortOrder: number;
  isPublished: boolean;
  mediaAsset: MediaAsset | null;
  createdAt: string;
  updatedAt: string;
};

export type TestimonialPayload = {
  customerName: string;
  customerRole?: string;
  university?: string;
  quote: string;
  rating: number;
  mediaAssetId?: string | null;
  sortOrder?: number;
  isPublished: boolean;
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
  sortOrder?: number;
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
  reorderGallery: (id: string, direction: 'up' | 'down') => request<GalleryItem>(`/admin/cms/gallery/items/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ direction }) }),
  listCategories: () => request<GalleryCategory[]>('/admin/cms/gallery/categories'),
  createCategory: (payload: GalleryCategoryPayload) =>
    request<GalleryCategory>('/admin/cms/gallery/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCategory: (id: string, payload: Partial<GalleryCategoryPayload>) =>
    request<GalleryCategory>(`/admin/cms/gallery/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteCategory: (id: string) =>
    request<void>(`/admin/cms/gallery/categories/${id}`, { method: 'DELETE' }),
  listMarquee: () => request<MarqueeItem[]>('/admin/cms/marquee'),
  createMarquee: (payload: MarqueePayload) => request<MarqueeItem>('/admin/cms/marquee', { method: 'POST', body: JSON.stringify(payload) }),
  updateMarquee: (id: string, payload: Partial<MarqueePayload>) => request<MarqueeItem>(`/admin/cms/marquee/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteMarquee: (id: string) => request<void>(`/admin/cms/marquee/${id}`, { method: 'DELETE' }),
  reorderMarquee: (id: string, direction: 'up' | 'down') => request<MarqueeItem>(`/admin/cms/marquee/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ direction }) }),
  listFaq: () => request<FaqItem[]>('/admin/cms/faqs'),
  createFaq: (payload: FaqPayload) => request<FaqItem>('/admin/cms/faqs', { method: 'POST', body: JSON.stringify(payload) }),
  updateFaq: (id: string, payload: Partial<FaqPayload>) => request<FaqItem>(`/admin/cms/faqs/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteFaq: (id: string) => request<void>(`/admin/cms/faqs/${id}`, { method: 'DELETE' }),
  reorderFaq: (id: string, direction: 'up' | 'down') => request<FaqItem>(`/admin/cms/faqs/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ direction }) }),
  listTestimonials: () => request<Testimonial[]>('/admin/cms/testimonials'),
  createTestimonial: (payload: TestimonialPayload) => request<Testimonial>('/admin/cms/testimonials', { method: 'POST', body: JSON.stringify(payload) }),
  updateTestimonial: (id: string, payload: Partial<TestimonialPayload>) => request<Testimonial>(`/admin/cms/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  createTestimonialWithImage: (payload: TestimonialPayload, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(payload).forEach(([key, value]) => { if (value !== undefined && value !== '') formData.append(key, String(value)); });
    return request<Testimonial>('/admin/cms/testimonials/upload', { method: 'POST', body: formData });
  },
  updateTestimonialWithImage: (id: string, payload: Partial<TestimonialPayload>, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(payload).forEach(([key, value]) => { if (value !== undefined && value !== '') formData.append(key, String(value)); });
    return request<Testimonial>(`/admin/cms/testimonials/${id}/upload`, { method: 'PATCH', body: formData });
  },
  deleteTestimonial: (id: string) => request<void>(`/admin/cms/testimonials/${id}`, { method: 'DELETE' }),
  reorderTestimonial: (id: string, direction: 'up' | 'down') => request<Testimonial>(`/admin/cms/testimonials/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ direction }) }),
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
