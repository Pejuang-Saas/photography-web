'use client';

import { createAuthClient } from 'better-auth/react';
import { apiUrl } from './api-client';

export { apiUrl } from './api-client';

export const authClient = createAuthClient({
  baseURL: apiUrl,
  // The API is on another origin, so the browser only stores its session cookie (and sends it back)
  // when credentials are included explicitly.
  fetchOptions: { credentials: 'include' },
});
