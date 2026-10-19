export const TEMPLATE_CATEGORIES = [
  { value: 'TRANSACTIONAL', label: 'Transaksional' },
  { value: 'REMINDER', label: 'Pengingat' },
  { value: 'DELIVERY', label: 'Pengiriman Foto' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]['value'];

export const CATEGORY_VALUES = TEMPLATE_CATEGORIES.map((category) => category.value);

export type SystemWhatsappTemplate = {
  code: string;
  name: string;
  category: TemplateCategory;
  body: string;
  sortOrder: number;
};

/** Templates every studio starts with. Admins may edit them, but not delete them. */
export const SYSTEM_WHATSAPP_TEMPLATES: SystemWhatsappTemplate[] = [
  {
    code: 'KONFIRMASI_BOOKING',
    name: 'Konfirmasi Booking & Tagihan',
    category: 'TRANSACTIONAL',
    sortOrder: 0,
    body: 'Halo {customer_name}! 👋\n\nTerima kasih sudah memesan sesi foto di {studio_name}.\n\nRincian booking:\n• Kode: {booking_code}\n• Paket: {package_name}\n• Jadwal: {session_date}, {session_time}\n• Total biaya: {total_price}\n• Skema: {payment_plan}\n\nAda yang ingin ditanyakan? Balas pesan ini ya.',
  },
  {
    code: 'PENGINGAT_H1',
    name: 'Pengingat Jadwal Sesi (H-1)',
    category: 'REMINDER',
    sortOrder: 1,
    body: 'Halo {customer_name}! 🔔\n\nPengingat jadwal sesi foto kamu:\n📅 {session_date}\n⏰ {session_time}\n📍 {studio_address}\n\nMohon hadir 15 menit lebih awal ya. Sampai bertemu! ✨',
  },
  {
    code: 'SAPAAN_FOLLOW_UP',
    name: 'Sapaan & Follow-up Ramah',
    category: 'FOLLOW_UP',
    sortOrder: 2,
    body: 'Halo {customer_name}! 😊\n\nIni {studio_name}. Kami ingin menanyakan apakah kamu masih tertarik dengan sesi foto wisuda. Kalau ada pertanyaan soal paket atau jadwal, kabari kami di sini ya.',
  },
  {
    code: 'PAYMENT_VERIFIED',
    name: 'Pembayaran Terverifikasi',
    category: 'TRANSACTIONAL',
    sortOrder: 3,
    body: 'Halo Kak {customer_name}! ✨\n\nPembayaran untuk reservasi {booking_code} ({package_name}) sudah kami terima dan jadwal sesi fotomu resmi terkunci.\n\n📅 {session_date}\n⏰ {session_time}\n📍 {studio_address}\n\nInvoice resmi: {invoice_url}\n\nSampai jumpa di hari-H! 🎓',
  },
  {
    code: 'PAYMENT_REJECTED',
    name: 'Bukti Pembayaran Ditolak',
    category: 'TRANSACTIONAL',
    sortOrder: 4,
    body: 'Halo Kak {customer_name},\n\nBukti pembayaran untuk reservasi {booking_code} belum dapat kami verifikasi.\n\nAlasan: {rejection_reason}\n\nSlot jadwal sudah dilepas. Silakan reservasi ulang di {site_url} atau balas pesan ini agar kami bantu.',
  },
  {
    code: 'BOOKING_EXPIRED',
    name: 'Reservasi Kedaluwarsa',
    category: 'TRANSACTIONAL',
    sortOrder: 5,
    body: 'Halo Kak {customer_name},\n\nReservasi {booking_code} untuk paket {package_name} pada {session_date} dibatalkan otomatis karena pembayaran belum kami terima tepat waktu.\n\nKamu masih bisa memesan ulang kapan saja di {site_url} selama slot masih tersedia.',
  },
];

/** The template that is sent to the customer by itself when each event happens. */
export const WHATSAPP_TEMPLATE_BY_EVENT: Record<string, string> = {
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  BOOKING_EXPIRED: 'BOOKING_EXPIRED',
};

/** Shown in the admin so nobody expects a template to send itself when nothing triggers it. */
export const WHATSAPP_TRIGGER_LABEL: Record<string, string> = {
  PAYMENT_VERIFIED: 'Otomatis saat pembayaran diverifikasi',
  PAYMENT_REJECTED: 'Otomatis saat bukti pembayaran ditolak',
  BOOKING_EXPIRED: 'Otomatis saat batas waktu pembayaran habis',
};
