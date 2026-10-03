'use client';

import { createAuthClient } from 'better-auth/react';
import { apiUrl } from './api-client';

export { apiUrl } from './api-client';

export const authClient = createAuthClient({
  baseURL: apiUrl,
});
