import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** Content-ID the logo is attached under, so an email can show it with `src="cid:studio-logo"`. */
export const LOGO_CID = 'studio-logo';

let cached: Buffer | null | undefined;

/**
 * The studio logo (a small PNG copy of the website icon, kept in `assets/` so it ships with the API
 * image). Returns null when the file is missing, so a mail or PDF is simply produced without it.
 */
export function studioLogo(): Buffer | null {
  if (cached !== undefined) return cached;
  const path = join(process.cwd(), 'assets', 'logo.png');
  cached = existsSync(path) ? readFileSync(path) : null;
  return cached;
}

export function logoDataUrl(): string | null {
  const logo = studioLogo();
  return logo ? `data:image/png;base64,${logo.toString('base64')}` : null;
}
