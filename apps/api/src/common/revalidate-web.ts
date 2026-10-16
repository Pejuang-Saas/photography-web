/**
 * Asks the web app to drop its cached landing page (ISR tag `landing-cms`) so admin edits show up
 * immediately instead of after the cache window. Best effort: a failure only delays the refresh.
 */
export async function revalidateWeb() {
  const url = process.env.WEB_REVALIDATE_URL;
  const secret = process.env.WEB_REVALIDATE_SECRET;
  if (!url || !secret) return;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'x-revalidate-secret': secret },
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    console.error('Landing ISR revalidation failed', error);
  }
}
