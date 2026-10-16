import { apiRequest } from './api-client';

export type LandingPoint = { title: string; description: string };

export type LandingContent = {
  seo: { title: string; description: string; keywords: string[] };
  hero: {
    badge: string;
    headlineLine1: string;
    headlineLine2: string;
    headlineLine3: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  };
  portfolio: { heading: string; description: string };
  about: { heading: string; subheading: string; body: string; points: LandingPoint[] };
  packages: { heading: string; description: string };
  steps: LandingPoint[];
};

export const landingContentApi = {
  getAdmin: () => apiRequest<LandingContent>('/admin/landing-content'),
  update: (body: LandingContent) =>
    apiRequest<LandingContent>('/admin/landing-content', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
