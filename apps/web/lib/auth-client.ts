'use client';

import { createAuthClient } from 'better-auth/react';

export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

export const authClient = createAuthClient({
  baseURL: apiUrl,
});
