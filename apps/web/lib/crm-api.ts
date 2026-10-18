import { apiRequest, apiUrl } from './api-client';
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
  /** Messages from the customer that no admin has opened yet. */
  unreadCount: number;
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
  /** The attachment, when there is one. The file itself comes from crmMediaUrl(). */
  media: { mime: string | null; filename: string | null } | null;
};

export type CrmMessagePage = { items: CrmMessage[]; hasMore: boolean };

/** Where to continue from when loading older messages: the oldest one already on screen. */
export type CrmMessageCursor = { before: string; beforeId: string };

export type CrmUnread = {
  total: number;
  latest: {
    chatId: string;
    displayName: string;
    preview: string | null;
    at: string | null;
  } | null;
};

export type CrmSyncResult = {
  chats: number;
  stored: number;
  duplicates: number;
  failedChats: number;
};

export type CrmTemplate = { id: string; code: string; name: string };

export type CrmTemplatePreview = { template: { id: string; name: string }; text: string };

export type CrmSendResult = { sent: boolean; messageId: string | null };

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
  messages: (id: string, cursor?: CrmMessageCursor, limit = 100) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      params.set('before', cursor.before);
      params.set('beforeId', cursor.beforeId);
    }
    return apiRequest<CrmMessagePage>(`/admin/crm/chats/${id}/messages?${params}`);
  },
  markRead: (id: string) => apiRequest<void>(`/admin/crm/chats/${id}/read`, { method: 'POST' }),
  unread: () => apiRequest<CrmUnread>('/admin/crm/unread'),
  assignCategory: (id: string, categoryId: string | null) =>
    apiRequest<void>(`/admin/crm/chats/${id}/category`, {
      method: 'PATCH',
      body: json({ categoryId }),
    }),
  sync: () => apiRequest<CrmSyncResult>('/admin/crm/sync', { method: 'POST' }),

  sendMessage: (chatId: string, text: string) =>
    apiRequest<CrmSendResult>(`/admin/crm/chats/${chatId}/messages`, {
      method: 'POST',
      body: json({ text }),
    }),
  listTemplates: () => apiRequest<CrmTemplate[]>('/admin/crm/templates'),
  previewTemplate: (chatId: string, templateId: string) =>
    apiRequest<CrmTemplatePreview>(`/admin/crm/chats/${chatId}/templates/${templateId}/preview`),
  sendTemplate: (chatId: string, templateId: string) =>
    apiRequest<CrmSendResult>(`/admin/crm/chats/${chatId}/send-template`, {
      method: 'POST',
      body: json({ templateId }),
    }),
  /** The conversation for a booking's number; created empty if the customer has not written yet. */
  openChat: (bookingId: string) =>
    apiRequest<{ id: string }>('/admin/crm/chats/open', {
      method: 'POST',
      body: json({ bookingId }),
    }),

  listCategories: () => apiRequest<CrmCategory[]>('/admin/crm/categories'),
  createCategory: (body: { name: string; color: string }) =>
    apiRequest<CrmCategory>('/admin/crm/categories', { method: 'POST', body: json(body) }),
  updateCategory: (id: string, body: { name?: string; color?: string }) =>
    apiRequest<CrmCategory>(`/admin/crm/categories/${id}`, { method: 'PATCH', body: json(body) }),
  deleteCategory: (id: string) =>
    apiRequest<void>(`/admin/crm/categories/${id}`, { method: 'DELETE' }),
};

/** The address of an attachment. The browser sends the admin session cookie along with it. */
export const crmMediaUrl = (messageId: string) => `${apiUrl}/admin/crm/messages/${messageId}/media`;
