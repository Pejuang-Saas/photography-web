import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL ?? process.env.API_URL;
const webURL = process.env.WEB_URL;
// Set when the web app and the API live on different subdomains of one site (kayastory.id and
// api.kayastory.id): ".kayastory.id". The session cookie is then shared with the web app, whose
// /admin guard looks for it. Leave unset for local development, where both share "localhost".
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();

if (!secret || secret.length < 32) {
  throw new Error('BETTER_AUTH_SECRET must be at least 32 characters long');
}
if (!baseURL || !webURL) {
  throw new Error('BETTER_AUTH_URL (or API_URL) and WEB_URL are required');
}

const prisma = new PrismaClient();

export const auth = betterAuth({
  secret,
  baseURL,
  trustedOrigins: [webURL],
  ...(cookieDomain && {
    advanced: { crossSubDomainCookies: { enabled: true, domain: cookieDomain } },
  }),
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
  },
  plugins: [admin()],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          await prisma.session.deleteMany({
            where: { userId: session.userId, id: { not: session.id } },
          });
        },
      },
    },
  },
});
