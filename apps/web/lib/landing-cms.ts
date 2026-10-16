import 'server-only';
import { fetchPublic } from './server-api';

export type LandingCmsContent = {
  gallery: Array<{
    id: string;
    title: string;
    altText: string;
    caption: string | null;
    location: string | null;
    sortOrder: number;
    category: { id: string; name: string; slug: string } | null;
    mediaAsset: { id: string; url: string };
  }>;
  marquee: Array<{ id: string; text: string; linkUrl: string | null; sortOrder: number }>;
  testimonials: Array<{
    id: string;
    customerName: string;
    customerRole: string | null;
    university: string | null;
    quote: string;
    rating: number;
    sortOrder: number;
    mediaAsset: { id: string; url: string } | null;
  }>;
  faqs: Array<{ id: string; question: string; answer: string; sortOrder: number }>;
};

export function getLandingCmsContent() {
  return fetchPublic<LandingCmsContent>('/public/cms/landing', 'landing-cms');
}
