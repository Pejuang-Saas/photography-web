import 'server-only';

import { headers } from 'next/headers';

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  role?: string | null;
};

function getApiUrl() {
  if (process.env.API_INTERNAL_URL) return process.env.API_INTERNAL_URL;

  if (process.env.HOSTNAME === '0.0.0.0') {
    return 'http://photography-api:3000';
  }

  return process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3002';
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie');

  if (!cookie) return null;

  try {
    const response = await fetch(`${getApiUrl()}/admin/auth/me`, {
      headers: { cookie },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { user: AdminUser };
    return data.user;
  } catch {
    return null;
  }
}
