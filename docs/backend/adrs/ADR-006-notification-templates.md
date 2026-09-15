# ADR-006: Template Engine & Otomatisasi Dokumen (WhatsApp, Email SMTP, & PDF)

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead
- **Technical Story**: Pembuatan parser dokumen notifikasi yang dinamis berbasis variabel template dan otomatisasi pengirimannya.
- **Ticket/Issue**: `[TICKET-ID-PLACEHOLDER]`

---

## 1. Konteks & Permasalahan

Mengacu pada spesifikasi `2026-09-08-whatsapp-template-builder-design.md` dan `2026-09-08-email-smtp-and-template-builder-design.md`, sistem studio fotografi memerlukan saluran notifikasi otomatis untuk:
1. Mengirim pesan konfirmasi booking dan jadwal sesi pemotretan ke WhatsApp pemesan.
2. Mengirim pesan pengingat jadwal (H-1 pemotretan).
3. Mengirimkan surat tanda terima resmi berupa dokumen **PDF Invoice** ke email dan WhatsApp pelanggan.

**Problem Statement**:
Teks sapaan untuk notifikasi atau detail di dalam dokumen faktur (PDF) bisa berubah-ubah bergantung promo, musim, dan kebijakan studio. Lakukan hardcode string pada *source code* akan sangat merugikan fleksibilitas bisnis.

**Constraints**:
- Pengguna (Admin) bukan programmer, mereka butuh metode pemformatan yang aman dan tidak memecahkan aplikasi jika ada kesalahan ketik (contoh: regex catastrophic backtracking).
- *Engine* PDF harus sanggup me-*render* dokumen kaya warna dan *layout* di lingkungan Alpine Linux (sering bermasalah dengan font/native binaries).

**Stakeholder Concerns**:
- **Manajemen & Marketing Studio**: Ingin leluasa mengganti kata-kata promosi di notifikasi WA dan email secara mandiri via UI.
- **Pelanggan**: Butuh dokumen *invoice* yang terlihat profesional dan dapat diunduh untuk klaim reimbursement.

## 2. Decision Drivers

- **Kemandirian Pengguna (No-Code Config)**: Mendukung admin mengelola redaksional notifikasi sendiri tanpa deploy ulang.
- **Keamanan Parsing Text**: Parser template tidak boleh menyebabkan *ReDoS (Regular Expression Denial of Service)*.
- **Konsistensi Visual PDF**: Hasil *render* PDF harus sama persis strukturnya kapanpun dicetak.

## 3. Considered Options

| Opsi | Pros (+) | Cons (-) |
|---|---|---|
| **Custom Regex Parser + HTML to PDF (Puppeteer)** | Simpel, dapat menggunakan sintaks mirip *handlebars* (contoh `{{nama}}`), HTML mudah dikonversi. | Puppeteer (*headless Chrome*) sangat berat (butuh RAM ~300MB per *instance*), setup di Docker Alpine *tricky*. |
| **Handlebars.js + PDFKit** | Sangat mumpuni untuk manipulasi *string/logic*, PDFKit sangat *lightweight* tanpa butuh *browser headless*. | Membuat *layouting* kompleks (tabel invoice responsif) di PDFKit murni sangat sulit dibandingkan menggunakan sintaks HTML CSS. |
| **String Replace Standar** | Paling cepat dan paling ringan, nihil risiko performa. | Fungsionalitas kaku, tidak ada *logic control flow* (seperti `if/else` atau `loop`). |

## 4. Decision Outcome

Kami memilih implementasi hibrida: **Engine Parser Tag Variabel Custom** (berbasis regex aman) untuk WhatsApp, dan **Nodemailer + Puppeteer HTML-to-PDF** berjalan pada *worker queue* terpisah.

**Implementasi & Panduan**:
1. **Engine Parser Tag Variabel Standar**: Mengimplementasikan *string replacement engine* berbasis regex token aman: `/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g`.
2. **Kompilasi Dokumen PDF Invoice**: Menggunakan headless HTML-to-PDF di dalam *worker queue* (BullMQ), sehingga *delay* pembuatan dokumen (1-3 detik) tidak memblokir respon. Layout responsif standar A4.
3. **Dispatcher Email SMTP via Nodemailer**: Diatur via database (`studio_settings`). Mendukung *test connection* interaktif (`POST /admin/settings/email/test-connection`).

**Implementasi Parser Template Variabel (TypeScript):**
```typescript
/**
 * Utility untuk mengganti variabel template {{variabel}} 
 * dengan data aktual secara dinamis.
 */
export class TemplateParser {
  static parse(templateStr: string, dictionary: Record<string, string | number>): string {
    if (!templateStr) return '';
    
    // Regex matching {{ key }} atau {{key}} dengan aman
    const tagRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    
    return templateStr.replace(tagRegex, (match, key) => {
      // Jika key tersedia dalam kamus data, replace.
      // Jika tidak, biarkan match aslinya tetap sebagai string "{{key}}".
      const value = dictionary[key];
      return value !== undefined && value !== null ? String(value) : match;
    });
  }
}

// Contoh Penggunaan:
const template = "Halo {{customerName}}, booking Anda {{bookingCode}} telah aktif.";
const data = { customerName: "Andi", bookingCode: "BK-1234" };
const hasil = TemplateParser.parse(template, data);
// Hasil: "Halo Andi, booking Anda BK-1234 telah aktif."
```
Kamus resmi yang didukung: `{{customerName}}`, `{{bookingCode}}`, `{{sessionDate}}`, `{{timeSlot}}`, `{{packageName}}`, `{{totalPrice}}`, `{{invoiceNumber}}`, `{{paymentStatus}}`, `{{location}}`, `{{studioName}}`, `{{rejectionReason}}`.

## 5. Pros and Cons of the Decision

- **Pros (+)**:
  - Tim studio dapat mengubah redaksi sapaan WhatsApp dan desain email secara bebas melalui UI *builder frontend*.
  - Pengiriman dokumen *invoice* instan meningkatkan citra profesionalisme studio Kaya Story.
  - Regex sederhana mencegah resiko eksekusi *logic* berbahaya dibanding *full template engine*.
- **Cons (-)**:
  - Modul pembuatan PDF dengan HTML-to-PDF (Puppeteer) menambah ukuran Docker image secara signifikan dan memerlukan pustaka *library C* pendukung (seperti libc6-compat Alpine, font library).
  - Parser template yang simpel ini tidak mendukung *looping* untuk *list* item otomatis (item keranjang belanja akan disusun menjadi 1 string HTML panjang di sisi *backend* sebelum diparsing).

## 6. Related ADRs

- [ADR-003: Caching & Asynchronous Task Queue Menggunakan Redis 7 & BullMQ](./ADR-003-caching-queue.md)

## 7. References

- [Puppeteer Docker Alpine Support](https://pptr.dev/guides/docker)
- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Regular Expressions in JavaScript (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
