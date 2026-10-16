export type LandingPoint = { title: string; description: string };

export type LandingContentData = {
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
