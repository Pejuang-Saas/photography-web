import { apiRequest } from './api-client';
import type { CrmColor } from './crm-colors';

export type CrmWindow = {
  open: boolean;
  remainingSeconds: number;
  expiresAt: string | null;
};

export type CrmCategory = {
  id: string;
  name: string;
  color: CrmColor | string;
  sortOrder: number;
  chatCount: number;
};

export type CrmBooking = {
  id: string;
  bookingCode: string;
  customerName: string;
  packageName: string;
  sessionDate: string;
  timeSlot: string;
  status: string;
  paymentStatus: string;
};

export type CrmChat = {
  id: string;
  chatId: string;
  phone: string | null;
  name: string | null;
  displayName: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  lastMessageFromMe: boolean;
  window: CrmWindow;
  category: { id: string; name: string; color: string } | null;
  booking: CrmBooking | null;
};

export type CrmChatPage = { items: CrmChat[]; total: number; page: number; pageSize: number };

export type CrmMessage = {
  id: string;
  fromMe: boolean;
  body: string;
  hasMedia: boolean;
  /** -1 error, 0 pending, 1 sent, 2 delivered, 3 read, 4 played. */
  ack: number;
  timestamp: string;
};

export type CrmMessagePage = { items: CrmMessage[]; hasMore: boolean };

export type CrmSyncResult = {
  chats: number;
  stored: number;
  duplicates: number;
  failedChats: number;
};

export type CrmChatFilter = { search?: string; categoryId?: string };

const json = (body: unknown) => JSON.stringify(body);

export const crmApi = {
  listChats: (filter: CrmChatFilter) => {
    const params = new URLSearchParams({ pageSize: '100' });
    if (filter.search) params.set('search', filter.search);
    if (filter.categoryId) params.set('categoryId', filter.categoryId);
    return apiRequest<CrmChatPage>(`/admin/crm/chats?${params}`);
  },
  getChat: (id: string) => apiRequest<CrmChat>(`/admin/crm/chats/${id}`),
  messages: (id: string) => apiRequest<CrmMessagePage>(`/admin/crm/chats/${id}/messages?limit=100`),
  assignCategory: (id: string, categoryId: string | null) =>
    apiRequest<void>(`/admin/crm/chats/${id}/category`, {
      method: 'PATCH',
      body: json({ categoryId }),
    }),
  sync: () => apiRequest<CrmSyncResult>('/admin/crm/sync', { method: 'POST' }),

  listCategories: () => apiRequest<CrmCategory[]>('/admin/crm/categories'),
  createCategory: (body: { name: string; color: string }) =>
    apiRequest<CrmCategory>('/admin/crm/categories', { method: 'POST', body: json(body) }),
  updateCategory: (id: string, body: { name?: string; color?: string }) =>
    apiRequest<CrmCategory>(`/admin/crm/categories/${id}`, { method: 'PATCH', body: json(body) }),
  deleteCategory: (id: string) =>
    apiRequest<void>(`/admin/crm/categories/${id}`, { method: 'DELETE' }),
};
