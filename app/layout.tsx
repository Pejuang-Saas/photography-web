import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import StructuredData from './components/structured-data';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://photography-web-gules.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Kayastory — Jasa Foto Wisuda Semarang | Spesialis Kebaya & Squad',
    template: '%s | Kayastory Photography',
  },
  description:
    'Spesialis fotografi wisuda di Semarang. Mengabadikan momen kelulusan, kebaya, toga, personal solo, squad sahabat, dan keluarga (Undip, Unnes, Udinus, Polines, Unika, UIN) dalam estetika 35mm yang berkarakter.',
  keywords: [
    'jasa foto wisuda semarang',
    'fotografer wisuda semarang',
    'foto wisuda undip',
    'foto wisuda unnes',
    'foto wisuda udinus',
    'foto wisuda polines',
    'foto wisuda unika',
    'foto wisuda uin walisongo',
    'foto kebaya wisuda',
    'foto toga wisuda',
    'paket photoshoot wisuda semarang',
    'kayastory photography',
    'studio foto wisuda semarang',
  ],
  authors: [{ name: 'Kayastory Photography', url: siteUrl }],
  creator: 'Kayastory Photography',
  publisher: 'Kayastory Photography',
  formatDetection: {
    email: false,
    address: true,
    telephone: true,
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'Kayastory — Jasa Foto Wisuda Semarang',
    description:
      'Hari ini berlalu cepat, sebuah frame membuatnya abadi. Spesialis fotografi wisuda di Semarang untuk Undip, Unnes, Udinus, Polines, Unika & UIN.',
    url: siteUrl,
    siteName: 'Kayastory Photography',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: `${siteUrl}/opengraph-image.png`,
        width: 1200,
        height: 630,
        alt: 'Kayastory Photography — Jasa Foto Wisuda Semarang',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kayastory — Jasa Foto Wisuda Semarang',
    description:
      'Spesialis fotografi wisuda di Semarang. Abadikan momen kelulusan, kebaya, dan sahabat dalam estetika warna yang abadi.',
    images: [`${siteUrl}/opengraph-image.png`],
    creator: '@kayastory',
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
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-[100dvh] flex flex-col">
        <StructuredData />
        {children}
      </body>
    </html>
  );
}
