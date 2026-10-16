import 'server-only';

export function getApiUrl() {
  if (process.env.API_INTERNAL_URL) return process.env.API_INTERNAL_URL;
  if (process.env.HOSTNAME === '0.0.0.0') return 'http://photography-api:3000';
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3002';
}

/**
 * GET a public API resource for server rendering. Cached for a minute and tagged `landing-cms`, which
 * the API's revalidate webhook clears whenever an admin edits CMS content, packages or the studio
 * profile. Returns null (and logs) on failure so the page degrades instead of crashing.
 */
export async function fetchPublic<T>(path: string, label: string): Promise<T | null> {
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
