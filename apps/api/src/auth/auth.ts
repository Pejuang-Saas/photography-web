import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { betterAuth } from 'better-auth';
import { admin } from 'better-auth/plugins';

const secret = process.env.BETTER_AUTH_SECRET;
const baseURL = process.env.BETTER_AUTH_URL ?? process.env.API_URL;
const webURL = process.env.WEB_URL;

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
