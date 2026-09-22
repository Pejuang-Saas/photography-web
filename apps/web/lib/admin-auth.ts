import 'server-only';

import { headers } from 'next/headers';

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  role?: string | null;
};

const apiUrl =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3002';

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie');

  if (!cookie) return null;

  const response = await fetch(`${apiUrl}/admin/auth/me`, {
    headers: { cookie },
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { user: AdminUser };
  return data.user;
}
