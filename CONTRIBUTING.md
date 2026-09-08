# 🤝 Panduan Kontribusi (Contributing Guide) - Kayastory Web

Terima kasih telah berkontribusi dalam pengembangan website dan sistem manajemen studio **Kaya Story Photography**! 📸

Panduan ini dibuat agar seluruh anggota tim developer (terutama developer pemula) memiliki standar kerja yang sama, menjaga kualitas kode tetap bersih, mencegah konflik git, dan memastikan setiap fitur berjalan dengan lancar.

---

## 📋 5 Aturan Emas Kontributor (Golden Rules)

1. **Wajib Baca Dokumen Spesifikasi (`docs/superpowers/specs/`)** sebelum mulai menulis kode.
2. **Dilarang Keras Commit Langsung ke Branch `main`**. Selalu buat branch fitur baru.
3. **Patuhi Pemisahan Komponen Global vs Komponen Lokal**.
4. **Gunakan Format Conventional Commits** untuk setiap commit pesan.
5. **Wajib Lolos Build Docker Compose (`docker compose -f docker-compose.prod.yml build`)** sebelum mengajukan Pull Request (PR).

---

## 1. Langkah Wajib Sebelum Mulai Coding

Sebelum membuat branch atau menulis baris kode pertama:
1. **Buka folder `docs/superpowers/specs/`** dan baca dokumen spesifikasi fitur yang akan Anda kerjakan:
   - 📄 [`Master Data Layer & Settings`](./docs/superpowers/specs/2026-09-08-unified-mock-data-layer-design.md)
   - 📄 [`Dual Payment & Anti-Scam Checkout`](./docs/superpowers/specs/2026-09-08-dual-payment-mode-design.md)
   - 📄 [`WAHA Integration & Mini CRM Anti-Ban`](./docs/superpowers/specs/2026-09-08-waha-mini-crm-design.md)
   - 📄 [`WhatsApp Template Builder`](./docs/superpowers/specs/2026-09-08-whatsapp-template-builder-design.md)
   - 📄 [`Email SMTP & Template Builder`](./docs/superpowers/specs/2026-09-08-email-smtp-and-template-builder-design.md)
2. **Pahami Batasan & Arsitektur Sistem**:
   - Proyek ini menggunakan arsitektur **Frontend Mock berbasis `localStorage`** (belum ada database sungguhan). Jangan menambahkan dependensi backend atau ORM database tanpa persetujuan tim.
   - Proyek ini **sepenuhnya di-containerize menggunakan Docker Compose**. Seluruh proses build, kompilasi Next.js, dan linting wajib dieksekusi di dalam container Docker.

---

## 2. Aturan Pembuatan Git Branch (Branching Strategy)

Seluruh pengerjaan fitur atau perbaikan bug wajib dilakukan di branch terpisah.

### 2.1 Format Penamaan Branch:
Gunakan awalan berikut sesuai dengan jenis pekerjaan Anda:

| Awalan Branch | Kategori Pekerjaan | Contoh Penamaan |
| :--- | :--- | :--- |
| `feat/` | Penambahan fitur baru | `feat/dual-payment-mode`, `feat/waha-mini-crm` |
| `fix/` | Perbaikan bug / kendala | `fix/checkout-modal-scroll`, `fix/reset-storage-bug` |
| `docs/` | Pembaruan dokumentasi / spec | `docs/update-email-spec`, `docs/contributing-guide` |
| `refactor/` | Perapian struktur kode tanpa ubah fungsi | `refactor/settings-submenus`, `refactor/booking-context` |
| `style/` | Perbaikan styling UI / CSS | `style/mobile-dock-padding`, `style/badge-contrast` |

### 2.2 Langkah Membuat Branch Baru:
Pastikan branch `main` Anda sudah dalam kondisi paling mutakhir:
```bash
# 1. Pindah ke branch main
git checkout main

# 2. Ambil perubahan terbaru
git pull origin main

# 3. Buat branch baru dari main
git checkout -b feat/nama-fitur-anda
```

---

## 3. Standar Penempatan Komponen (Global vs Lokal)

Patuhi arsitektur komponen berikut agar proyek tidak berantakan:

### 3.1 Komponen Global (`@/components/` atau `@/components/ui/`)
* **Syarat**: Hanya untuk komponen yang **dapat digunakan ulang di banyak halaman** dan **tidak membawa logika bisnis khusus studio** (bersifat umum).
* **Contoh**: `Button`, `Input`, `Dialog` / `Modal`, `Badge`, `Calendar`, `ImagePreviewModal`, `Card`.

### 3.2 Komponen Lokal Fitur
* **Syarat**: Komponen yang **hanya digunakan pada halaman/fitur tertentu** wajib disimpan di folder lokal fitur tersebut.
* **Contoh**:
  - Komponen checkout pengunjung: simpan di `app/components/booking/` (misal: `StepOrderPreview.tsx`, `StepManualPayment.tsx`).
  - Komponen pengaturan admin: simpan di `app/admin/settings/components/` (misal: `PaymentSettingsCard.tsx`, `WahaConnectionCard.tsx`).
  - Komponen Mini CRM: simpan di `app/admin/crm/components/` (misal: `CrmChatBox.tsx`, `CrmContactList.tsx`).

---

## 4. Standar Pesan Commit (Conventional Commits)

Gunakan Bahasa Indonesia atau Bahasa Inggris yang singkat, padat, dan jelas dengan format:
```text
tipe(cakupan): deskripsi singkat perubahan
```

### Daftar Tipe Commit yang Diizinkan:
* `feat`: Menambah fitur baru (contoh: `feat(payment): add 4-step checkout with anti-scam preview`).
* `fix`: Memperbaiki bug (contoh: `fix(crm): resolve 24-hour window countdown timer issue`).
* `docs`: Mengubah atau menambah dokumentasi (contoh: `docs(spec): update waha crm specification`).
* `style`: Penyesuaian tampilan / styling yang tidak mengubah logika (contoh: `style(dock): adjust whatsapp button padding`).
* `refactor`: Perombakan kode tanpa mengubah fitur (contoh: `refactor(settings): split settings into 2-column layout`).
* `chore`: Tugas pemeliharaan build/config (contoh: `chore(deps): update lucide-react icons`).

> ❌ **Hindari pesan commit tidak bermakna seperti**: *"update"*, *"fix bug"*, *"coba lagi"*, *"revisi"*.

---

## 5. Verifikasi Wajib Sebelum Push (Build & Linting Gate via Docker)

> 🛑 **PERINGATAN**: Proyek ini di-build dan di-bundle di dalam lingkungan Docker Compose. Sebelum menjalankan `git push`, Anda **WAJIB memvalidasi bahwa aplikasi lolos build di dalam Docker Compose!**

Jalankan perintah verifikasi ini dari terminal Anda:

### 1. Uji Kompilasi Build Produksi via Docker Compose:
```bash
docker compose -f docker-compose.prod.yml build
```
*Perintah ini menjalankan stage `builder` di dalam Docker Alpine Node.js 20, mengompilasi Next.js 16 standalone, dan memverifikasi TypeScript Strict Mode tanpa memerlukan Node.js/npm di host machine.*

Pastikan proses build selesai sukses tanpa error fatal:
```text
✓ Compiled successfully
✓ Generating static pages
✓ Finalizing page optimization
```

### 2. Periksa Standar Kode (Linting via Container):
```bash
docker compose run --rm web npm run lint
```
*Pastikan tidak ada error ESLint atau pelanggaran aturan styling kode.*

---

## 6. Alur Pengajuan Pull Request (PR)

Setelah kode lolos build Docker Compose dan branch telah di-push ke GitHub:
1. **Buka Pull Request** dari branch Anda ke branch `main`.
2. **Format Judul PR**: Gunakan judul yang sama dengan format commit (contoh: `feat(payment): implement dual payment mode and anti-scam checkout`).
3. **Isi Deskripsi PR**:
   - Jelaskan fitur atau perubahan apa yang dibuat.
   - Cantumkan dokumen spesifikasi yang menjadi acuan (misal: *Mengacu pada spec `2026-09-08-dual-payment-mode-design.md`*).
   - Lampirkan screenshot atau rekaman singkat pengujian (jika mengubah tampilan UI).
4. **Checklist Pengujian Mandiri**:
   - [ ] Dokumen spec terkait telah dibaca dan dipatuhi.
   - [ ] `docker compose run --rm web npm run lint` lolos tanpa error.
   - [ ] `docker compose -f docker-compose.prod.yml build` sukses tanpa error build.
   - [ ] Sudah diuji coba di browser via `docker compose up` (tampilan desktop dan mobile rapi).
5. Minta rekan tim atau Tech Lead untuk me-review kode Anda sebelum di-merge ke `main`.

---

Selamat berkontribusi dan mari kita bangun website **Kaya Story Photography** yang luar biasa! 🚀📸
