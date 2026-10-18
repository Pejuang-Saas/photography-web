import { apiRequest } from './api-client';

export type WhatsappState =
  | 'NOT_CONFIGURED'
  | 'UNREACHABLE'
  | 'DISCONNECTED'
  | 'STARTING'
  | 'SCAN_QR'
  | 'CONNECTED'
  | 'FAILED';

export type WhatsappStatus = {
  state: WhatsappState;
  session: string;
  /** Automatic notifications over WhatsApp (WAHA_ENABLED on the server). */
  automationEnabled: boolean;
  account: { phone: string | null; name: string | null } | null;
  engine: string | null;
  detail?: string;
};

export const whatsappApi = {
  status: () => apiRequest<WhatsappStatus>('/admin/whatsapp/status'),
  connect: () => apiRequest<WhatsappStatus>('/admin/whatsapp/connect', { method: 'POST' }),
  disconnect: () => apiRequest<WhatsappStatus>('/admin/whatsapp/disconnect', { method: 'POST' }),
  qr: () => apiRequest<{ image: string }>('/admin/whatsapp/qr'),
};
