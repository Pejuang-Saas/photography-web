import type { ServicePackage } from '@/lib/booking-api';
import { featureList } from '@/lib/booking-form';
import { getSiteUrl } from '@/lib/site-url';
import { FALLBACK_STUDIO_NAME, type StudioInfo } from '@/lib/studio-api';

type Props = {
  studio?: StudioInfo | null;
  description?: string;
  packages?: ServicePackage[] | null;
  testimonials?: Array<{ rating: number }> | null;
  faqs?: Array<{ question: string; answer: string }>;
};

const formatIdr = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * JSON-LD for search engines. Everything here comes from what the admin has entered, so it always
 * matches the visible page; fields without data are omitted rather than invented.
 */
export default function StructuredData({
  studio,
  description,
  packages,
  testimonials,
  faqs,
}: Props) {
  const siteUrl = getSiteUrl();
  const studioName = studio?.studioName ?? FALLBACK_STUDIO_NAME;
  const activePackages = (packages ?? []).filter((pkg) => pkg.isActive);
  const prices = activePackages.map((pkg) => pkg.price);
  const ratings = (testimonials ?? []).map((item) => item.rating).filter((rating) => rating > 0);

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': ['LocalBusiness', 'ProfessionalService'],
    name: studioName,
    ...(description && { description }),
    ...(siteUrl && {
      url: siteUrl,
      logo: `${siteUrl}/icon.png`,
      image: `${siteUrl}/opengraph-image.png`,
    }),
    currenciesAccepted: 'IDR',
    ...(prices.length > 0 && {
      priceRange:
        Math.min(...prices) === Math.max(...prices)
          ? formatIdr(prices[0])
          : `${formatIdr(Math.min(...prices))} - ${formatIdr(Math.max(...prices))}`,
    }),
    address: {
      '@type': 'PostalAddress',
      ...(studio?.address && { streetAddress: studio.address }),
      ...(studio?.city && { addressLocality: studio.city }),
      ...(studio?.region && { addressRegion: studio.region }),
      addressCountry: 'ID',
    },
    ...(studio?.whatsappNumber && { telephone: `+${studio.whatsappNumber}` }),
    ...(studio?.mapsUrl && { hasMap: studio.mapsUrl }),
    ...(studio?.instagramUrl && { sameAs: [studio.instagramUrl] }),
    ...(studio?.openTime &&
      studio.closeTime && {
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ALL_DAYS,
            opens: studio.openTime,
            closes: studio.closeTime,
          },
        ],
      }),
    ...((studio?.city || studio?.region) && {
      areaServed: [studio.city, studio.region]
        .filter((name): name is string => Boolean(name))
        .map((name) => ({ '@type': 'AdministrativeArea', name })),
    }),
    // Only real, published testimonials count; an invented rating violates search engine policies.
    ...(ratings.length > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1),
        reviewCount: String(ratings.length),
        bestRating: '5',
        worstRating: '1',
      },
    }),
    ...(activePackages.length > 0 && {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: `Paket Foto Wisuda ${studioName}`,
        itemListElement: activePackages.map((pkg) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: pkg.name,
            description:
              pkg.description ??
              (featureList(pkg.features).join(', ') ||
                `${pkg.durationMinutes} menit sesi foto untuk maksimal ${pkg.maxPeople} orang.`),
          },
          price: String(pkg.price),
          priceCurrency: 'IDR',
        })),
      },
    }),
  };

  const faqSchema = faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }
    : null;

  // "<" is escaped so user-entered text can never close the script tag.
  const serialize = (schema: object) => JSON.stringify(schema).replace(/</g, '\\u003c');

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serialize(localBusinessSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serialize(faqSchema) }}
        />
      )}
    </>
  );
}
