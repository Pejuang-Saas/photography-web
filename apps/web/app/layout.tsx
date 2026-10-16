import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';
import { getLandingContent, getStudioInfo } from '@/lib/landing-data';
import { getSiteUrl } from '@/lib/site-url';
import { FALLBACK_STUDIO_NAME } from '@/lib/studio-api';

export async function generateMetadata(): Promise<Metadata> {
  const [content, studio] = await Promise.all([getLandingContent(), getStudioInfo()]);
  const siteUrl = getSiteUrl();
  const studioName = studio?.studioName ?? FALLBACK_STUDIO_NAME;
  const seo = content?.seo;
  const title = seo?.title || studioName;

  return {
    ...(siteUrl && { metadataBase: new URL(siteUrl) }),
    title: { default: title, template: `%s | ${studioName}` },
    description: seo?.description,
    keywords: seo?.keywords,
    authors: [{ name: studioName, ...(siteUrl && { url: siteUrl }) }],
    creator: studioName,
    publisher: studioName,
    formatDetection: { email: false, address: true, telephone: true },
    ...(siteUrl && { alternates: { canonical: siteUrl } }),
    openGraph: {
      title,
      description: seo?.description,
      ...(siteUrl && { url: siteUrl }),
      siteName: studioName,
      locale: 'id_ID',
      type: 'website',
      images: [{ url: '/opengraph-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: seo?.description,
      images: ['/opengraph-image.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [{ url: '/favicon.ico' }, { url: '/icon.png', sizes: '512x512', type: 'image/png' }],
      apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className="antialiased">
      <body className="min-h-[100dvh] flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
