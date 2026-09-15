# ADR-006: Template Engine & Otomatisasi Dokumen (WhatsApp, Email SMTP, & PDF)

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead

---

## 1. Konteks & Permasalahan
Mengacu pada spesifikasi `2026-09-08-whatsapp-template-builder-design.md` dan `2026-09-08-email-smtp-and-template-builder-design.md`:
Sistem studio fotografi memerlukan saluran notifikasi otomatis untuk:
1. Mengirim pesan konfirmasi booking dan jadwal sesi pemotretan ke WhatsApp pemesan.
2. Mengirim pesan pengingat jadwal (H-1 pemotretan).
3. Mengirimkan surat tanda terima resmi berupa dokumen **PDF Invoice** ke email dan WhatsApp pelanggan.
Format pesan harus dinamis dan dapat disesuaikan oleh studio manager melalui menu Settings di frontend tanpa perlu mengubah kode sumber (*hardcode*).

## 2. Keputusan Arsitektur
1. **Engine Parser Tag Variabel Standar**:
   - Kami mengimplementasikan string replacement engine berbasis regex token aman:
     ```regex
     /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
     ```
   - Mendukung kamus variabel resmi:
     - `{{customerName}}`, `{{bookingCode}}`, `{{sessionDate}}`, `{{timeSlot}}`, `{{packageName}}`, `{{totalPrice}}`, `{{invoiceNumber}}`, `{{paymentStatus}}`, `{{location}}`, `{{studioName}}`, `{{rejectionReason}}`.
2. **Kompilasi Dokumen PDF Invoice**:
   - Menggunakan **PDFKit** atau **Puppeteer headless HTML-to-PDF** di dalam worker queue.
   - Layout PDF dirancang responsif A4 standar percetakan dengan logo resmi Kaya Story, rincian biaya, catatan khusus sesi, dan stempel digital.
3. **Dispatcher Email SMTP via Nodemailer**:
   - Driver pengiriman email menggunakan **Nodemailer** yang dikonfigurasi melalui database (`studio_settings`).
   - Mendukung pengetesan koneksi SMTP interaktif (`POST /admin/settings/email/test-connection`).
   - Mengirim email berbasis template HTML responsif dengan lampiran berkas PDF Invoice asli.

## 3. Konsekuensi
- **Positif (+)**:
  - Tim studio dapat mengubah redaksi sapaan WhatsApp dan desain email secara bebas melalui UI builder frontend.
  - Pengiriman dokumen invoice instan meningkatkan citra profesionalisme studio Kaya Story di mata pelanggan wisuda.
- **Negatif (-)**:
  - Modul pembuatan PDF membutuhkan dependensi rendering grafis di container Docker (sudah diakomodasi oleh libc6-compat Alpine).
