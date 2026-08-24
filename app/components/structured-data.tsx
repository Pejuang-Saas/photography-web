export default function StructuredData() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://photography-web-gules.vercel.app';

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    name: 'Kayastory Photography',
    alternateName: 'Kayastory Graduation Studio Semarang',
    description:
      'Spesialis jasa fotografi wisuda di Semarang (Undip, Unnes, Udinus, Polines, Unika, UIN). Mengabadikan momen kelulusan, kebaya, solo, squad, dan keluarga dalam estetika 35mm.',
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
    image: `${siteUrl}/opengraph-image.png`,
    priceRange: 'Rp 350.000 - Rp 900.000',
    currenciesAccepted: 'IDR',
    paymentAccepted: 'Cash, Bank Transfer, QRIS',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Semarang',
      addressRegion: 'Jawa Tengah',
      addressCountry: 'ID',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -7.0494,
      longitude: 110.4381,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday',
        ],
        opens: '08:00',
        closes: '21:00',
      },
    ],
    areaServed: [
      { '@type': 'AdministrativeArea', name: 'Semarang' },
      { '@type': 'AdministrativeArea', name: 'Jawa Tengah' },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '128',
      bestRating: '5',
      worstRating: '1',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Paket Foto Wisuda Kayastory 2026',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Solo Graduation Package',
            description:
              'Sesi personal 1 jam untuk foto kebaya dan toga wisuda dengan 30 foto edited color grade.',
          },
          price: '350000',
          priceCurrency: 'IDR',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Squad Graduation Package',
            description:
              'Sesi foto bersama 2-5 sahabat wisuda dengan 60 foto edited color grade dan 2 titik lokasi kampus.',
          },
          price: '650000',
          priceCurrency: 'IDR',
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Family Graduation Package',
            description:
              'Sesi hangat bersama keluarga besar 3 jam santai, 100 foto edited, dan 1 cetakan mini album fisik.',
          },
          price: '900000',
          priceCurrency: 'IDR',
        },
      ],
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Berapa lama proses editing sampai foto diterima?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Rata-rata 7 hari kerja setelah kamu memilih foto favoritmu. Jika membutuhkan foto lebih cepat, tersedia layanan Express 48 Jam.',
        },
      },
      {
        '@type': 'Question',
        name: 'Apakah bisa request lokasi foto di luar kampus?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bisa. Untuk Paket Family, lokasi sudah bebas di area Semarang. Untuk paket Solo dan Squad, lokasi luar kampus dikenakan penyesuaian biaya transport yang wajar.',
        },
      },
      {
        '@type': 'Question',
        name: 'Bagaimana cara reservasi dan pembayarannya?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Pilih paket, isi form reservasi di WhatsApp, lalu bayar DP 50% untuk mengunci tanggal. Sisanya dilunasi setelah sesi foto selesai.',
        },
      },
      {
        '@type': 'Question',
        name: 'Apakah seluruh foto mentah ikut diberikan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Ya. Seluruh file foto mentah kualitas original tanpa watermark dibagikan via link Google Drive, di samping foto-foto yang sudah diedit.',
        },
      },
      {
        '@type': 'Question',
        name: 'Bagaimana jika terjadi hujan atau jadwal wisuda berubah?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Reschedule gratis satu kali selama dikabari minimal H-1 sebelum pemotretan. DP tetap berlaku dan tidak hangus.',
        },
      },
      {
        '@type': 'Question',
        name: 'Apakah orang yang belum pernah photoshoot bisa diarahkan?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Tentu. Mayoritas klien kami baru pertama kali foto profesional. Fotografer kami memandu pose, gestur, dan ekspresi dari awal sampai selesai.',
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
    </>
  );
}
