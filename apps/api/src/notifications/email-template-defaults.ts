import { CTA_COLORS } from './email-renderer';

export type TemplateContent = {
  name: string;
  description: string | null;
  subject: string;
  heading: string;
  bodyText: string;
  includeBookingTable: boolean;
  ctaText: string | null;
  ctaUrl: string | null;
  ctaColor: string;
  footerText: string | null;
};

export type SystemTemplate = TemplateContent & { code: string };

const [AMBER, , GREEN] = CTA_COLORS;

/** Templates every studio starts with. Admins may edit them, but not delete them. */
export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    code: 'INVOICE_OFFICIAL',
    name: 'Pengiriman Invoice Resmi',
    description: 'Dikirim otomatis ke customer saat pembayaran diverifikasi.',
    subject: '[Invoice #{invoice_number}] Konfirmasi Reservasi Foto Wisuda Kak {customer_name}',
    heading: 'Pembayaran Anda Berhasil Diverifikasi! 🎓',
    bodyText:
      'Halo Kak {customer_name}! ✨\n\nTerima kasih sudah memilih {studio_name}. Pembayaran untuk reservasi {booking_code} sudah kami terima dan jadwal sesi fotomu resmi terkunci.\n\nSimpan email ini sebagai bukti reservasi. Sampai jumpa di hari-H!',
    includeBookingTable: true,
    ctaText: 'Unduh Invoice Resmi (PDF)',
    ctaUrl: '{invoice_url}',
    ctaColor: AMBER,
    footerText: 'Email ini dikirim otomatis. Ada pertanyaan? Balas lewat WhatsApp studio.',
  },
  {
    code: 'PAYMENT_REJECTED',
    name: 'Bukti Pembayaran Ditolak',
    description: 'Dikirim otomatis ke customer saat admin menolak bukti transfer.',
    subject: '[Perlu Tindakan] Pembayaran Reservasi {booking_code} Belum Dapat Diverifikasi',
    heading: 'Bukti Pembayaran Belum Dapat Diverifikasi',
    bodyText:
      'Halo Kak {customer_name},\n\nBukti pembayaranmu untuk reservasi {booking_code} belum dapat kami verifikasi.\n\nAlasan: {rejection_reason}\n\nSlot jadwal sesi sudah dilepas. Silakan reservasi ulang atau hubungi kami lewat WhatsApp agar kami bantu.',
    includeBookingTable: true,
    ctaText: 'Hubungi Admin via WhatsApp',
    ctaUrl: '{studio_whatsapp_url}',
    ctaColor: GREEN,
    footerText: null,
  },
  {
    code: 'BOOKING_EXPIRED',
    name: 'Reservasi Kedaluwarsa',
    description: 'Dikirim otomatis ke customer saat batas waktu pembayaran habis.',
    subject: 'Reservasi {booking_code} Kedaluwarsa',
    heading: 'Waktu Pembayaran Habis',
    bodyText:
      'Halo Kak {customer_name},\n\nReservasi {booking_code} untuk paket {package_name} pada {session_date} dibatalkan otomatis karena pembayaran belum kami terima tepat waktu, dan slot jadwalnya sudah dilepas.\n\nKamu masih bisa memesan ulang kapan saja selama slot masih tersedia.',
    includeBookingTable: true,
    ctaText: 'Pesan Ulang',
    ctaUrl: '{site_url}',
    ctaColor: AMBER,
    footerText: null,
  },
  {
    code: 'REMINDER_H1',
    name: 'Pengingat Jadwal H-1',
    description:
      'Pengingat sehari sebelum sesi. Pemicu otomatisnya belum aktif; template siap dipakai.',
    subject: '[Pengingat H-1] Photoshoot Wisuda Kak {customer_name}',
    heading: 'Sampai Jumpa Besok! 📸',
    bodyText:
      'Halo Kak {customer_name},\n\nIni pengingat bahwa sesi fotomu dijadwalkan besok, {session_date} pukul {session_time}.\n\nAgar sesi berjalan lancar, datanglah 15 menit lebih awal dan bawa perlengkapan wisudamu. Kalau ada perubahan, kabari kami lewat WhatsApp.',
    includeBookingTable: true,
    ctaText: 'Hubungi Kami',
    ctaUrl: '{studio_whatsapp_url}',
    ctaColor: AMBER,
    footerText: null,
  },
  {
    code: 'REVIEW_REQUEST',
    name: 'Permintaan Ulasan',
    description: 'Mengajak customer menulis ulasan setelah sesi. Dikirim manual.',
    subject: 'Bagaimana Sesi Foto Wisudamu, Kak {customer_name}?',
    heading: 'Terima Kasih Sudah Berfoto Bersama Kami 💛',
    bodyText:
      'Halo Kak {customer_name},\n\nSenang sekali bisa mengabadikan momen wisudamu. Kalau berkenan, ceritakan pengalamanmu agar calon wisudawan lain bisa merasakan hal yang sama.',
    includeBookingTable: false,
    ctaText: 'Tulis Ulasan di Google Maps',
    ctaUrl: '{studio_maps_url}',
    ctaColor: AMBER,
    footerText: null,
  },
];

/** Which template an automatic notification uses. */
export const TEMPLATE_BY_EVENT: Record<string, string> = {
  PAYMENT_VERIFIED: 'INVOICE_OFFICIAL',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  BOOKING_EXPIRED: 'BOOKING_EXPIRED',
};

/** Shown in the admin so nobody expects a template to send itself when nothing triggers it. */
export const TEMPLATE_TRIGGER_LABEL: Record<string, string> = {
  INVOICE_OFFICIAL: 'Otomatis saat pembayaran diverifikasi',
  PAYMENT_REJECTED: 'Otomatis saat bukti pembayaran ditolak',
  BOOKING_EXPIRED: 'Otomatis saat batas waktu pembayaran habis',
};

/**
 * Changes to a built-in template that should also reach studios that already have it. Each one
 * matches the previous shipped text exactly, so a template an admin has edited is never touched.
 */
export const DEFAULT_UPGRADES: Array<{
  code: string;
  from: { ctaText: string; ctaUrl: string };
  to: { ctaText: string; ctaUrl: string };
}> = [
  {
    code: 'INVOICE_OFFICIAL',
    from: { ctaText: 'Hubungi Kami via WhatsApp', ctaUrl: '{studio_whatsapp_url}' },
    to: { ctaText: 'Unduh Invoice Resmi (PDF)', ctaUrl: '{invoice_url}' },
  },
];
