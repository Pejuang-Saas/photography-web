import 'server-only';

/**
 * Where the server side of the web app reaches the API. `API_INTERNAL_URL` is the address on the
 * private network (a service name), set wherever the API is not at its public address; without it
 * the public `NEXT_PUBLIC_API_URL` is used, which always works, just through the public route.
 */
export function getApiUrl() {
  return process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3002';
}

/**
 * GET a public API resource for server rendering. Cached for a minute and tagged `landing-cms`, which
 * the API's revalidate webhook clears whenever an admin edits CMS content, packages or the studio
 * profile. Returns null (and logs) on failure so the page degrades instead of crashing.
 */
export async function fetchPublic<T>(path: string, label: string): Promise<T | null> {
  // `next build` runs where the API's private name does not resolve (and the API may not be up yet);
  // pages that need this data are rendered per request, so the build does not try to fetch it.
  if (process.env.NEXT_PHASE === 'phase-production-build') return null;

  try {
    const response = await fetch(`${getApiUrl()}${path}`, {
      next: { revalidate: 60, tags: ['landing-cms'] },
    });

    if (!response.ok) {
      console.error(`[${label}] ${response.status} from ${path}`);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`[${label}] fetch failed`, error);
    return null;
  }
}
