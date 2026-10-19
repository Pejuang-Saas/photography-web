import { apiRequest } from './api-client';

export type TemplateCategory = 'TRANSACTIONAL' | 'REMINDER' | 'DELIVERY' | 'FOLLOW_UP';

export type TemplateCategoryOption = { value: TemplateCategory; label: string };

export type TemplateHealthLevel = 'good' | 'warning' | 'error';

export type TemplateHealth = {
  level: TemplateHealthLevel;
  issues: { severity: 'error' | 'warning'; message: string }[];
  summary: string;
  length: number;
};

export type WhatsappTemplate = {
  id: string;
  code: string;
  name: string;
  category: TemplateCategory;
  body: string;
  isActive: boolean;
  isSystem: boolean;
  /** What sends it by itself, or null when it is only sent by hand from the CRM. */
  trigger: string | null;
  /** Only in the list. */
  health?: TemplateHealthLevel;
};

export type WhatsappTemplateContent = {
  name: string;
  category: TemplateCategory;
  body: string;
};

export type TemplateVariable = {
  key: string;
  label: string;
  group: string;
  sample: string;
  /** Needs a booking, so a conversation without one cannot fill it. */
  needsBooking: boolean;
};

export type TemplatePreview = { text: string; health: TemplateHealth; variables: string[] };

const json = (body: unknown) => JSON.stringify(body);

export const whatsappTemplateApi = {
  variables: () =>
    apiRequest<{ variables: TemplateVariable[]; categories: TemplateCategoryOption[] }>(
      '/admin/whatsapp-templates/variables',
    ),
  list: () => apiRequest<WhatsappTemplate[]>('/admin/whatsapp-templates'),
  create: (content: WhatsappTemplateContent) =>
    apiRequest<WhatsappTemplate>('/admin/whatsapp-templates', {
      method: 'POST',
      body: json(content),
    }),
  update: (id: string, content: WhatsappTemplateContent) =>
    apiRequest<WhatsappTemplate>(`/admin/whatsapp-templates/${id}`, {
      method: 'PATCH',
      body: json(content),
    }),
  setActive: (id: string, isActive: boolean) =>
    apiRequest<WhatsappTemplate>(`/admin/whatsapp-templates/${id}/active`, {
      method: 'PATCH',
      body: json({ isActive }),
    }),
  duplicate: (id: string) =>
    apiRequest<WhatsappTemplate>(`/admin/whatsapp-templates/${id}/duplicate`, { method: 'POST' }),
  reset: (id: string) =>
    apiRequest<WhatsappTemplate>(`/admin/whatsapp-templates/${id}/reset`, { method: 'POST' }),
  remove: (id: string) => apiRequest<void>(`/admin/whatsapp-templates/${id}`, { method: 'DELETE' }),
  preview: (body: string) =>
    apiRequest<TemplatePreview>('/admin/whatsapp-templates/preview', {
      method: 'POST',
      body: json({ body }),
    }),
  testSend: (body: string, phone: string) =>
    apiRequest<{ sent: boolean; to: string }>('/admin/whatsapp-templates/test-send', {
      method: 'POST',
      body: json({ body, phone }),
    }),
};
