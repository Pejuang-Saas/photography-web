import 'dotenv/config';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { seedPricelist } from './pricelist';

// Initial site content, written with upsert on stable keys (slug, media key, deterministic id),
// so re-running never duplicates rows. `update: {}` means existing rows are left as admins edited them.

// Stable UUID derived from a name, so CMS rows without a natural unique key can still be upserted.
function seedId(name: string) {
  const bytes = createHash('sha1').update(`kayastory-seed:${name}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const ASSET_DIR = join(process.cwd(), 'prisma', 'seed-assets');

const CATEGORIES = [
  { slug: 'portrait', name: 'Kebaya & Solo' },
  { slug: 'squad', name: 'Squad & Bestie' },
  { slug: 'campus', name: 'Outdoor Kampus' },
  { slug: 'details', name: 'Detail & Medali' },
];

const CATEGORY_META: Record<string, { title: string; location: string }> = {
  portrait: { title: 'Sesi Wisuda Kebaya & Solo', location: 'Universitas Diponegoro, Semarang' },
  squad: { title: 'Squad & Bestie Graduation', location: 'Universitas Diponegoro, Tembalang' },
  campus: { title: 'Outdoor Campus Session', location: 'Universitas Negeri Semarang, Sekaran' },
  details: { title: 'Detail Medali & Selempang', location: 'UDINUS Semarang' },
};

const GALLERY: Array<{ file: string; category: string; alt: string }> = [
  {
    file: '01',
    category: 'portrait',
    alt: 'Wisudawati berkebaya memegang map ijazah di lobi kampus',
  },
  {
    file: '02',
    category: 'squad',
    alt: 'Sekelompok wisudawan berpose ceria bersama di tangga kampus',
  },
  { file: '03', category: 'portrait', alt: 'Wisudawati membawa buket bunga tersenyum lepas' },
  { file: '04', category: 'squad', alt: 'Wisudawan berfoto bersama di Tugu Muda saat senja' },
  { file: '05', category: 'squad', alt: 'Wisudawan melambaikan tangan dari mobil golf kampus' },
  { file: '06', category: 'portrait', alt: 'Wisudawan tersenyum dengan toga lengkap' },
  { file: '07', category: 'campus', alt: 'Wisudawati berkebaya di halaman gedung kampus' },
  { file: '08', category: 'portrait', alt: 'Momen bahagia wisudawati bersama keluarga' },
  { file: '09', category: 'details', alt: 'Wisudawati menunjukkan medali kelulusan' },
  { file: '10', category: 'details', alt: 'Detail medali wisuda dalam genggaman tangan' },
  { file: '11', category: 'campus', alt: 'Dua wisudawan bersalaman merayakan kelulusan bersama' },
  { file: '12', category: 'portrait', alt: 'Wisudawan berpose candid di sudut kampus' },
  { file: '13', category: 'campus', alt: 'Wisudawati berbusana merah muda di taman kampus' },
  { file: '14', category: 'squad', alt: 'Tiga sahabat berfoto bersama saat wisuda' },
  { file: '15', category: 'details', alt: 'Wisudawati memegang selempang sarjana hukum' },
  { file: '16', category: 'squad', alt: 'Dua wisudawati duduk santai di rumput lapangan kampus' },
  { file: '17', category: 'squad', alt: 'Sekelompok wisudawati merayakan kelulusan bersama' },
  { file: '18', category: 'portrait', alt: 'Wisudawati tersenyum cerah di bawah sinar matahari' },
  { file: '19', category: 'portrait', alt: 'Pose elegan wisudawati berlatar arsitektur kampus' },
  { file: '21', category: 'squad', alt: 'Dua wisudawati berpose menunjuk ke kamera dengan riang' },
  { file: '22', category: 'portrait', alt: 'Momen wisuda malam hari penuh keceriaan' },
  { file: '24', category: 'squad', alt: 'Sesi foto kelompok saat malam hari bertema nocturnal' },
];

const MARQUEE = [
  'UNIVERSITAS DIPONEGORO',
  'UNIVERSITAS NEGERI SEMARANG',
  'UNIVERSITAS DIAN NUSWANTORO',
  'POLINES',
  'UNIKA SOEGIJAPRANATA',
  'UIN WALISONGO',
];

const TESTIMONIALS = [
  {
    customerName: 'HASNA AULIA',
    university: 'Universitas Dian Nuswantoro, Semarang',
    photo: '01',
    quote:
      'Hasilnya jauh di atas ekspektasi. Fotografernya sabar banget mengarahkan pose, jadi kami yang awalnya kaku pun kelihatan lepas dan natural.',
  },
  {
    customerName: 'GLORIA MARGARETHA',
    university: 'Universitas Diponegoro, Tembalang',
    photo: '16',
    quote:
      'Kami foto berlima dan semuanya kebagian momen bagus. Tone warnanya konsisten, detail kebaya keluar rapi tanpa over-editing.',
  },
  {
    customerName: 'PASHA RAHMADANI',
    university: 'Universitas Negeri Semarang, Sekaran',
    photo: '07',
    quote:
      'Proses booking gampang, tim responsif di WhatsApp. Pas hari-H fotografer datang on-time dan hasilnya selesai tepat 7 hari kerja.',
  },
];

const FAQS = [
  {
    question: 'Berapa lama proses editing sampai foto diterima?',
    answer:
      'Rata-rata 7 hari kerja setelah kamu memilih foto favoritmu. Jika membutuhkan foto lebih cepat, tersedia layanan Express 48 Jam.',
  },
  {
    question: 'Apakah bisa request lokasi foto di luar kampus?',
    answer:
      'Bisa. Untuk Paket Family, lokasi sudah bebas di area Semarang. Untuk paket Solo dan Squad, lokasi luar kampus dikenakan penyesuaian biaya transport yang wajar.',
  },
  {
    question: 'Bagaimana cara reservasi dan pembayarannya?',
    answer:
      'Pilih paket, isi form reservasi di WhatsApp, lalu bayar DP 50% untuk mengunci tanggal. Sisanya dilunasi setelah sesi foto selesai.',
  },
  {
    question: 'Apakah seluruh foto mentah ikut diberikan?',
    answer:
      'Ya. Seluruh file foto mentah kualitas original tanpa watermark dibagikan via link Google Drive, di samping foto-foto yang sudah diedit.',
  },
  {
    question: 'Bagaimana jika terjadi hujan atau jadwal wisuda berubah?',
    answer:
      'Reschedule gratis satu kali selama dikabari minimal H-1 sebelum pemotretan. DP tetap berlaku dan tidak hangus.',
  },
  {
    question: 'Apakah orang yang belum pernah photoshoot bisa diarahkan?',
    answer:
      'Tentu. Mayoritas klien kami baru pertama kali foto profesional. Fotografer kami memandu pose, gestur, dan ekspresi dari awal sampai selesai.',
  },
];

const CRM_CATEGORIES = [
  { name: 'Prospek Baru', color: 'blue' },
  { name: 'Tanya Paket', color: 'amber' },
  { name: 'Booking DP', color: 'purple' },
  { name: 'Lunas', color: 'green' },
  { name: 'Selesai', color: 'zinc' },
];

const WHATSAPP_TEMPLATES = [
  {
    code: 'KONFIRMASI_BOOKING',
    name: 'Konfirmasi Booking & Tagihan',
    body: 'Halo {customer_name}! 👋\n\nTerima kasih sudah memesan sesi foto di {studio_name}.\n\nRincian booking:\n• Kode: {booking_code}\n• Paket: {package_name}\n• Jadwal: {session_date}, {session_time}\n• Total biaya: {total_price}\n• Skema: {payment_plan}\n\nAda yang ingin ditanyakan? Balas pesan ini ya.',
  },
  {
    code: 'PENGINGAT_H1',
    name: 'Pengingat Jadwal Sesi (H-1)',
    body: 'Halo {customer_name}! 🔔\n\nPengingat jadwal sesi foto kamu:\n📅 {session_date}\n⏰ {session_time}\n📍 {studio_address}\n\nMohon hadir 15 menit lebih awal ya. Sampai bertemu! ✨',
  },
  {
    code: 'SAPAAN_FOLLOW_UP',
    name: 'Sapaan & Follow-up Ramah',
    body: 'Halo {customer_name}! 😊\n\nIni {studio_name}. Kami ingin menanyakan apakah kamu masih tertarik dengan sesi foto wisuda. Kalau ada pertanyaan soal paket atau jadwal, kabari kami di sini ya.',
  },
];

async function main() {
  const prisma = new PrismaClient();
  const storage = new StorageService(new ConfigService());

  const mediaAsset = async (file: string, folder: string) => {
    const key = `seed/${folder}/kayastory-${file}.jpg`;
    const existing = await prisma.mediaAsset.findUnique({ where: { key } });
    if (existing) return existing;

    const buffer = await readFile(join(ASSET_DIR, `kayastory-${file}.jpg`));
    const asset = await storage.uploadPublicObject(key, {
      buffer,
      originalname: `kayastory-${file}.jpg`,
      mimetype: 'image/jpeg',
      size: buffer.length,
    });
    return prisma.mediaAsset.upsert({
      where: { key },
      create: {
        key,
        url: asset.url,
        filename: asset.filename,
        mimeType: asset.mimeType,
        size: asset.size,
      },
      update: {},
    });
  };

  try {
    await seedPricelist(prisma);

    for (const [sortOrder, text] of MARQUEE.entries()) {
      await prisma.marqueeItem.upsert({
        where: { id: seedId(`marquee:${text}`) },
        create: { id: seedId(`marquee:${text}`), text, sortOrder, isActive: true },
        update: {},
      });
    }
    console.log(`✅ marquee: ${MARQUEE.length}`);

    for (const [sortOrder, faq] of FAQS.entries()) {
      const id = seedId(`faq:${faq.question}`);
      await prisma.faqItem.upsert({
        where: { id },
        create: { id, ...faq, sortOrder, isPublished: true },
        update: {},
      });
    }
    console.log(`✅ faq: ${FAQS.length}`);

    const categoryIds = new Map<string, string>();
    for (const [sortOrder, category] of CATEGORIES.entries()) {
      const row = await prisma.galleryCategory.upsert({
        where: { slug: category.slug },
        create: { ...category, sortOrder },
        update: {},
      });
      categoryIds.set(category.slug, row.id);
    }
    for (const [sortOrder, item] of GALLERY.entries()) {
      const meta = CATEGORY_META[item.category];
      const id = seedId(`gallery:${item.file}`);
      const asset = await mediaAsset(item.file, 'gallery');
      await prisma.galleryItem.upsert({
        where: { id },
        create: {
          id,
          title: meta.title,
          altText: item.alt,
          location: meta.location,
          categoryId: categoryIds.get(item.category),
          mediaAssetId: asset.id,
          sortOrder,
          isPublished: true,
          publishedAt: new Date(),
        },
        update: {},
      });
    }
    console.log(`✅ gallery: ${GALLERY.length} items, ${CATEGORIES.length} categories`);

    for (const [sortOrder, { photo, ...testimonial }] of TESTIMONIALS.entries()) {
      const id = seedId(`testimonial:${testimonial.customerName}`);
      const asset = await mediaAsset(photo, 'testimonials');
      await prisma.testimonial.upsert({
        where: { id },
        create: {
          id,
          ...testimonial,
          rating: 5,
          mediaAssetId: asset.id,
          sortOrder,
          isPublished: true,
        },
        update: {},
      });
    }
    console.log(`✅ testimonials: ${TESTIMONIALS.length}`);

    // Starting categories for the WhatsApp CRM. Admins can rename, recolour or delete them, and
    // update: {} keeps it that way on later runs.
    for (const [sortOrder, category] of CRM_CATEGORIES.entries()) {
      await prisma.crmCategory.upsert({
        where: { name: category.name },
        create: { ...category, sortOrder },
        update: {},
      });
    }
    console.log(`✅ crm categories: ${CRM_CATEGORIES.length}`);

    // Approved messages for when the 24-hour window is closed. update: {} keeps any later edits.
    for (const [sortOrder, template] of WHATSAPP_TEMPLATES.entries()) {
      await prisma.whatsappTemplate.upsert({
        where: { code: template.code },
        create: { ...template, sortOrder },
        update: {},
      });
    }
    console.log(`✅ whatsapp templates: ${WHATSAPP_TEMPLATES.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('❌ Seed failed', error);
  process.exit(1);
});
