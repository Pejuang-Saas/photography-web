import { Prisma, PrismaClient } from '@prisma/client';

/*
 * The August 2026 price list: five packages in three groups, the add-ons of each group, and the
 * general conditions. Written with upsert on the slug and `update: {}`, so re-running never
 * duplicates a row and never overwrites what an admin has since edited.
 */

const LITE_TERMS = [
  'Toleransi keterlambatan maksimal 10 menit. Setelah melewati batas toleransi, durasi sesi tetap dihitung sesuai jam reservasi yang telah disepakati.',
  'Waktu perpindahan lokasi dan pergantian anggota keluarga termasuk ke dalam durasi sesi.',
];

const PREMIUM_TERMS = [
  'Toleransi keterlambatan maksimal 30 menit. Setelah melewati batas toleransi, durasi sesi tetap dihitung sesuai jam reservasi yang telah disepakati.',
  'Waktu perpindahan lokasi dan pergantian anggota keluarga termasuk ke dalam durasi sesi.',
];

const EVERY_PACKAGE = [
  'Semua file terbaik hasil seleksi fotografer',
  'Pengambilan foto tanpa batas selama durasi sesi berlangsung',
];

export const PRICELIST_PACKAGES = [
  {
    name: 'Lite - Basic',
    slug: 'lite-basic',
    category: 'Lite',
    sortOrder: 10,
    description:
      'Pilihan terbaik untuk mengabadikan momen wisuda dengan hasil yang tetap elegan dan berkualitas. Cocok untuk sesi singkat bersama keluarga dan teman terdekat.',
    price: 350_000,
    durationMinutes: 60,
    maxPeople: 1,
    editedPhotos: 15,
    driveActiveDays: 14,
    uploadAllHours: 48,
    uploadEditDays: 7,
    maxSpots: 2,
    lateToleranceMinutes: 10,
    features: ['1 Wisudawan | Keluarga & Teman', ...EVERY_PACKAGE],
    terms: LITE_TERMS,
  },
  {
    name: 'Lite - Standart',
    slug: 'lite-standart',
    category: 'Lite',
    sortOrder: 20,
    description:
      'Pilihan ideal untuk kamu yang ingin lebih banyak variasi pose dan hasil edit yang lebih lengkap. Nikmati sesi wisuda yang nyaman dengan sentuhan visual khas Kayastory.',
    price: 400_000,
    durationMinutes: 60,
    maxPeople: 1,
    editedPhotos: 25,
    driveActiveDays: 14,
    uploadAllHours: 48,
    uploadEditDays: 5,
    maxSpots: 2,
    lateToleranceMinutes: 10,
    features: ['1 Wisudawan | Keluarga & Teman', ...EVERY_PACKAGE],
    terms: LITE_TERMS,
  },
  {
    name: 'Premium - Bronze',
    slug: 'premium-bronze',
    category: 'Premium',
    sortOrder: 30,
    description:
      'Pilihan tepat untuk menikmati sesi wisuda yang lebih leluasa dengan hasil yang lebih istimewa. Waktu tambahan dan prioritas pengerjaan membuat setiap momen terasa lebih eksklusif dan berkesan.',
    price: 450_000,
    durationMinutes: 90,
    maxPeople: 1,
    editedPhotos: 30,
    driveActiveDays: 30,
    uploadAllHours: 24,
    uploadEditDays: 3,
    maxSpots: 3,
    bonusPriorityEdits: 5,
    lateToleranceMinutes: 30,
    features: ['1 Wisudawan | Keluarga & Teman', ...EVERY_PACKAGE],
    terms: PREMIUM_TERMS,
  },
  {
    name: 'Premium - Gold',
    slug: 'premium-gold',
    category: 'Premium',
    sortOrder: 40,
    description:
      'Pengalaman sesi wisuda paling lengkap dengan waktu yang lebih leluasa dan hasil edit yang lebih maksimal. Dirancang untuk kamu yang ingin setiap momen wisuda terekam dengan elegan, detail, dan berkelas.',
    price: 550_000,
    durationMinutes: 90,
    maxPeople: 1,
    editedPhotos: 40,
    driveActiveDays: 30,
    uploadAllHours: 24,
    uploadEditDays: 2,
    maxSpots: 4,
    bonusPriorityEdits: 10,
    lateToleranceMinutes: 30,
    features: ['1 Wisudawan | Keluarga & Teman', ...EVERY_PACKAGE],
    terms: PREMIUM_TERMS,
  },
  {
    name: 'Group Package',
    slug: 'group-package',
    category: 'Group',
    sortOrder: 50,
    description:
      'Rayakan kelulusan bersama teman-teman terbaikmu dalam satu sesi yang penuh energi dan kebahagiaan. Lebih banyak momen, lebih banyak cerita, dan kenangan yang akan selalu terasa istimewa.',
    price: 500_000,
    durationMinutes: 90,
    maxPeople: 7,
    editedPhotos: 30,
    driveActiveDays: 14,
    uploadAllHours: 24,
    uploadEditDays: 3,
    maxSpots: 3,
    features: ['Maksimal 7 wisudawan', ...EVERY_PACKAGE],
    terms: [],
  },
];

const LITE_AND_PREMIUM = ['Lite', 'Premium'];
const GROUP = ['Group'];

export const PRICELIST_ADD_ONS = [
  {
    name: 'Tambahan wisudawan & keluarga',
    slug: 'tambahan-wisudawan-keluarga',
    description: 'Menambah satu wisudawan beserta keluarganya ke dalam sesi.',
    unitLabel: 'wisudawan',
    price: 150_000,
    extraMinutes: 30,
    maxQuantity: 5,
    categories: LITE_AND_PREMIUM,
    sortOrder: 10,
  },
  {
    name: 'Tambahan waktu',
    slug: 'tambahan-waktu',
    description: 'Memperpanjang durasi sesi.',
    unitLabel: '30 menit',
    price: 100_000,
    extraMinutes: 30,
    maxQuantity: 4,
    categories: LITE_AND_PREMIUM,
    sortOrder: 20,
  },
  {
    name: 'Extra edit',
    slug: 'extra-edit',
    description: 'Menambah jumlah foto yang diedit.',
    unitLabel: '5 foto',
    price: 50_000,
    extraMinutes: 0,
    maxQuantity: 10,
    categories: LITE_AND_PREMIUM,
    sortOrder: 30,
  },
  {
    name: 'Tambahan wisudawan',
    slug: 'group-tambahan-wisudawan',
    description: 'Menambah wisudawan ke dalam sesi grup.',
    unitLabel: 'orang',
    price: 100_000,
    extraMinutes: 30,
    maxQuantity: 10,
    categories: GROUP,
    sortOrder: 40,
  },
  {
    name: 'Tambahan waktu',
    slug: 'group-tambahan-waktu',
    description: 'Memperpanjang durasi sesi.',
    unitLabel: '30 menit',
    price: 75_000,
    extraMinutes: 30,
    maxQuantity: 4,
    categories: GROUP,
    sortOrder: 50,
  },
  {
    name: 'Extra edit',
    slug: 'group-extra-edit',
    description: 'Menambah jumlah foto yang diedit.',
    unitLabel: '5 foto',
    price: 50_000,
    extraMinutes: 0,
    maxQuantity: 10,
    categories: GROUP,
    sortOrder: 60,
  },
  {
    name: 'Personal photo',
    slug: 'group-personal-photo',
    description: 'Foto personal untuk satu wisudawan di dalam sesi grup.',
    unitLabel: 'orang',
    price: 75_000,
    extraMinutes: 0,
    maxQuantity: 10,
    categories: GROUP,
    sortOrder: 70,
  },
];

export const GENERAL_TERMS = [
  'Harga belum termasuk tiket masuk, parkir, dan biaya perizinan lokasi (jika ada).',
  'Apabila hujan deras atau kondisi lokasi tidak memungkinkan, sesi dapat dipindahkan ke area teduh atau dijadwalkan ulang sesuai ketersediaan jadwal.',
  'Semua file yang diberikan merupakan hasil seleksi fotografer dan tidak termasuk foto blur, test shot, atau file yang tidak layak.',
  'Revisi minor (warna, crop, atau brightness) maksimal 1 kali untuk setiap foto edit yang dipilih.',
  'File yang tidak diunduh setelah masa penyimpanan berakhir dapat dihapus dari penyimpanan Kayastory.',
  'Dengan melakukan reservasi, klien dianggap telah membaca dan menyetujui seluruh ketentuan yang berlaku.',
];

export const PRICELIST_CATEGORIES = [
  {
    name: 'Lite',
    title: 'Lite Version',
    sortOrder: 10,
    description:
      'Paket sederhana untuk mengabadikan momen wisuda dengan hasil yang tetap berkualitas dan berkesan. Cocok untuk sesi singkat bersama keluarga dan teman terdekat.',
  },
  {
    name: 'Premium',
    title: 'Premium Version',
    sortOrder: 20,
    description:
      'Untuk kamu yang menginginkan pengalaman sesi foto wisuda yang lebih eksklusif dan hasil yang lebih maksimal. Lebih banyak waktu, lebih banyak foto edit, dan prioritas pengerjaan untuk momen yang benar-benar istimewa.',
  },
  {
    name: 'Group',
    title: 'Group Session',
    sortOrder: 30,
    description:
      'Abadikan kebersamaan bersama sahabat wisudamu dalam satu sesi yang seru dan penuh cerita. Cocok untuk momen perpisahan, persahabatan, dan kenangan yang akan selalu dikenang.',
  },
];

/** The packages the studio sold before the price list; kept for old bookings, but no longer offered. */
const LEGACY_SLUGS = ['solo-graduation', 'squad-graduation', 'family-package'];

export async function seedPricelist(prisma: PrismaClient) {
  for (const category of PRICELIST_CATEGORIES) {
    await prisma.packageCategory.upsert({
      where: { key: category.name.toLowerCase() },
      create: { key: category.name.toLowerCase(), ...category },
      update: {},
    });
  }
  for (const pkg of PRICELIST_PACKAGES) {
    await prisma.servicePackage.upsert({ where: { slug: pkg.slug }, create: pkg, update: {} });
  }
  for (const addOn of PRICELIST_ADD_ONS) {
    await prisma.addOn.upsert({ where: { slug: addOn.slug }, create: addOn, update: {} });
  }
  // Bookings point at their package, so the old ones are hidden from the catalog, not deleted.
  const retired = await prisma.servicePackage.updateMany({
    where: { slug: { in: LEGACY_SLUGS }, isActive: true },
    data: { isActive: false },
  });

  const studio = await prisma.studioSetting.findUnique({ where: { id: 'default' } });
  if (!studio) {
    await prisma.studioSetting.create({ data: { id: 'default', reservationTerms: GENERAL_TERMS } });
  } else if (studio.reservationTerms === null) {
    await prisma.studioSetting.update({
      where: { id: 'default' },
      data: { reservationTerms: GENERAL_TERMS as Prisma.InputJsonValue },
    });
  }

  console.log(
    `✅ price list: ${PRICELIST_CATEGORIES.length} categories, ${PRICELIST_PACKAGES.length} packages, ${PRICELIST_ADD_ONS.length} add-ons, ${retired.count} old packages hidden`,
  );
}
