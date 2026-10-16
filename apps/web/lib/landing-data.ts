import 'server-only';
import type { PublicPaymentSettings, ServicePackage } from './booking-api';
import type { LandingContent } from './landing-content-api';
import { fetchPublic } from './server-api';
import type { StudioInfo } from './studio-api';

export const getStudioInfo = () => fetchPublic<StudioInfo>('/public/studio-info', 'studio-info');

export const getPublicPackages = () =>
  fetchPublic<ServicePackage[]>('/public/packages', 'public-packages');

export const getPublicPaymentSettings = () =>
  fetchPublic<PublicPaymentSettings>('/public/payment-settings', 'payment-settings');

export const getLandingContent = () =>
  fetchPublic<LandingContent>('/public/landing-content', 'landing-content');
