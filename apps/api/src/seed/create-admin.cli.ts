import 'dotenv/config';
import { auth } from '../auth/auth';

/**
 * Creates the first admin from a built image, where there is no TypeScript source and no network
 * for a CLI to fetch. Safe to run again: an existing user is made an admin and left otherwise
 * alone, so a password is never overwritten by accident.
 *
 *   ADMIN_EMAIL=owner@studio.id ADMIN_PASSWORD='at-least-12-characters' node dist/seed/create-admin.cli.js
 *   node dist/seed/create-admin.cli.js --email owner@studio.id --name "Owner" --password '...'
 */

const flag = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : undefined;
};

const email = (process.env.ADMIN_EMAIL ?? flag('email'))?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? flag('password');
const name = (process.env.ADMIN_NAME ?? flag('name') ?? 'Admin').trim();

const MIN_PASSWORD = 12;

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function main() {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    fail('ADMIN_EMAIL (or --email) must be a valid email address.');
  }
  if (!password || password.length < MIN_PASSWORD) {
    fail(`ADMIN_PASSWORD (or --password) must be at least ${MIN_PASSWORD} characters.`);
  }

  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    // The admin plugin adds `role`, which the base user type does not list.
    if ((existing.user as { role?: string }).role !== 'admin') {
      await ctx.internalAdapter.updateUser(existing.user.id, { role: 'admin' });
      console.log(`✅ ${email} already existed and is now an admin. Its password was not changed.`);
    } else {
      console.log(`✅ ${email} is already an admin. Nothing changed.`);
    }
    return;
  }

  const user = await ctx.internalAdapter.createUser(
    { email, name, role: 'admin', emailVerified: true },
    { method: 'admin' },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: 'credential',
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  console.log(`✅ Admin created: ${email}`);
}

main()
  .catch((error) => {
    console.error('❌ Could not create the admin:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  // The auth module keeps its own database connection open, so the process is ended explicitly.
  .finally(() => process.exit(process.exitCode ?? 0));
