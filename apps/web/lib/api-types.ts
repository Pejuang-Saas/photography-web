export type ApiHealth = {
  status: 'ok' | 'error';
  service: 'api';
  timestamp: string;
};

export type ApiReadiness = {
  status: 'ok' | 'error';
  checks: {
    database: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    queues: 'connected' | 'disconnected';
  };
  timestamp: string;
};

export type PaymentMode = 'GATEWAY' | 'MANUAL';
export type GatewayProvider = 'MOCK' | 'MIDTRANS' | 'XENDIT';
export type GatewayEnvironment = 'SANDBOX' | 'PRODUCTION';
export type PaymentPlan = 'DP_50' | 'FULL';
export type PaymentStatus =
  | 'UNPAID'
  | 'WAITING_CONFIRMATION'
  | 'PAID_DP'
  | 'PAID_FULL'
  | 'REJECTED'
  | 'EXPIRED';
export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_VERIFICATION'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED';
