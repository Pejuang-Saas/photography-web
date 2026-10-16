let warned = false;

/**
 * Canonical origin of the public site, from NEXT_PUBLIC_SITE_URL.
 *
 * There is deliberately no hardcoded production fallback: guessing a domain would publish wrong
 * canonical, sitemap and structured-data URLs. When it is unset, absolute URLs are omitted instead
 * (and localhost is used in development so local pages still work).
 */
export function getSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return 'http://localhost:3000';

  if (!warned) {
    warned = true;
    console.warn(
      '[site-url] NEXT_PUBLIC_SITE_URL is not set; canonical and sitemap URLs are omitted.',
    );
  }
  return null;
}
