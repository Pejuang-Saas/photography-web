import 'server-only';

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

function getApiUrl() {
  if (process.env.API_INTERNAL_URL) return process.env.API_INTERNAL_URL;
  if (process.env.HOSTNAME === '0.0.0.0') return 'http://photography-api:3000';
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3002';
}

export async function getLandingCmsContent(): Promise<LandingCmsContent | null> {
  try {
    const response = await fetch(`${getApiUrl()}/public/cms/landing`, {
      next: { revalidate: 60, tags: ['landing-cms'] },
    });

    if (!response.ok) return null;
    return (await response.json()) as LandingCmsContent;
  } catch {
    return null;
  }
}
