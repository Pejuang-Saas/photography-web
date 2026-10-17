import { apiRequest } from './api-client';

export const CTA_COLORS = ['#d9a521', '#18181b', '#059669'] as const;

export type EmailSmtpStatus =
  | {
      configured: true;
      host: string;
      port: number;
      fromEmail: string;
      fromName: string | null;
      authenticated: boolean;
    }
  | { configured: false; missing: string[] };

export type EmailSettings = {
  enabled: boolean;
  autoSendInvoice: boolean;
  smtp: EmailSmtpStatus;
  updatedAt: string;
};

export type UpdateEmailSettingsInput = Partial<{
  enabled: boolean;
  autoSendInvoice: boolean;
}>;

export type EmailTemplateContent = {
  name: string;
  description: string;
  subject: string;
  heading: string;
  bodyText: string;
  includeBookingTable: boolean;
  ctaText: string;
  ctaUrl: string;
  ctaColor: string;
  footerText: string;
};

export type EmailTemplate = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  subject: string;
  heading: string;
  bodyText: string;
  includeBookingTable: boolean;
  ctaText: string | null;
  ctaUrl: string | null;
  ctaColor: string;
  footerText: string | null;
  isActive: boolean;
  isSystem: boolean;
  /** Which event sends it by itself; null means it only ever goes out when someone triggers it. */
  trigger: string | null;
  updatedAt: string;
};

export type EmailVariable = { key: string; label: string; group: string; sample: string };

export type EmailPreview = { subject: string; html: string; text: string };

export type EmailLogStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'SKIPPED';

export type EmailLogItem = {
  id: string;
  to: string;
  subject: string;
  templateCode: string | null;
  bookingId: string | null;
  status: EmailLogStatus;
  attempts: number;
  error: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type EmailLogDetail = EmailLogItem & { text: string; html: string | null };

export type EmailLogPage = {
  items: EmailLogItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<EmailLogStatus, number>;
};

export type EmailLogFilter = { status?: EmailLogStatus; search?: string; page: number };

const json = (body: unknown) => JSON.stringify(body);

export const emailApi = {
  getSettings: () => apiRequest<EmailSettings>('/admin/notification-settings/email'),
  updateSettings: (body: UpdateEmailSettingsInput) =>
    apiRequest<EmailSettings>('/admin/notification-settings/email', {
      method: 'PATCH',
      body: json(body),
    }),
  sendTest: (to: string) =>
    apiRequest<{ sent: boolean; to: string }>('/admin/notification-settings/email/test', {
      method: 'POST',
      body: json({ to }),
    }),

  listTemplates: () => apiRequest<EmailTemplate[]>('/admin/email-templates'),
  variables: () => apiRequest<EmailVariable[]>('/admin/email-templates/variables'),
  createTemplate: (body: EmailTemplateContent) =>
    apiRequest<EmailTemplate>('/admin/email-templates', { method: 'POST', body: json(body) }),
  updateTemplate: (id: string, body: EmailTemplateContent) =>
    apiRequest<EmailTemplate>(`/admin/email-templates/${id}`, {
      method: 'PATCH',
      body: json(body),
    }),
  setTemplateActive: (id: string, isActive: boolean) =>
    apiRequest<EmailTemplate>(`/admin/email-templates/${id}/active`, {
      method: 'PATCH',
      body: json({ isActive }),
    }),
  duplicateTemplate: (id: string) =>
    apiRequest<EmailTemplate>(`/admin/email-templates/${id}/duplicate`, { method: 'POST' }),
  resetTemplate: (id: string) =>
    apiRequest<EmailTemplate>(`/admin/email-templates/${id}/reset`, { method: 'POST' }),
  deleteTemplate: (id: string) =>
    apiRequest<void>(`/admin/email-templates/${id}`, { method: 'DELETE' }),
  preview: (body: EmailTemplateContent) =>
    apiRequest<EmailPreview>('/admin/email-templates/preview', {
      method: 'POST',
      body: json(body),
    }),

  listLogs: (filter: EmailLogFilter) => {
    const params = new URLSearchParams({ page: String(filter.page), pageSize: '15' });
    if (filter.status) params.set('status', filter.status);
    if (filter.search) params.set('search', filter.search);
    return apiRequest<EmailLogPage>(`/admin/email-logs?${params}`);
  },
  getLog: (id: string) => apiRequest<EmailLogDetail>(`/admin/email-logs/${id}`),
  resendLog: (id: string) =>
    apiRequest<EmailLogDetail>(`/admin/email-logs/${id}/resend`, { method: 'POST' }),
};
