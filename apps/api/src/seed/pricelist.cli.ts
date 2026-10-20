import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedPricelist } from './pricelist';

// Loads just the price list (packages, add-ons, general terms), without the website content seed.
const prisma = new PrismaClient();
seedPricelist(prisma)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
