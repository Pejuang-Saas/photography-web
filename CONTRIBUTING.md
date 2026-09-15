# 🤝 Panduan Kontribusi (Contributing Guide) - Photography Platform Monorepo

Terima kasih telah berkontribusi dalam pengembangan platform **Photography Monorepo** (Frontend Next.js & Backend NestJS + Prisma)! 📸

Panduan ini dibuat agar seluruh anggota tim developer memiliki standar kerja yang sama, menjaga kualitas kode tetap bersih, mencegah konflik git, dan memastikan setiap fitur berjalan dengan lancar.

---

## 📋 5 Aturan Emas Kontributor (Golden Rules)

1. **Wajib Baca Dokumen Spesifikasi (`apps/web/docs/superpowers/specs/`)** sebelum mulai menulis kode.
2. **Dilarang Keras Commit Langsung ke Branch `main`**. Selalu buat branch fitur baru.
3. **Patuhi Pemisahan Monorepo**: Frontend di `apps/web`, Backend di `apps/api`, dan Infra di `infra/`.
4. **Gunakan Format Conventional Commits** untuk setiap commit pesan.
5. **Wajib Lolos Uji Build & Linting** sebelum mengajukan Pull Request (PR) — baik via **Docker Compose** maupun lokal.

---

## 1. Langkah Wajib Sebelum Mulai Coding

Sebelum membuat branch atau menulis baris kode pertama:
1. **Buka folder `apps/web/docs/superpowers/specs/`** dan baca dokumen spesifikasi fitur yang akan Anda kerjakan:
   - 📄 [`Master Data Layer & Settings`](apps/web/docs/superpowers/specs/2026-09-08-unified-mock-data-layer-design.md)
   - 📄 [`Dual Payment & Anti-Scam Checkout`](apps/web/docs/superpowers/specs/2026-09-08-dual-payment-mode-design.md)
   - 📄 [`WAHA Integration & Mini CRM Anti-Ban`](apps/web/docs/superpowers/specs/2026-09-08-waha-mini-crm-design.md)
   - 📄 [`WhatsApp Template Builder`](apps/web/docs/superpowers/specs/2026-09-08-whatsapp-template-builder-design.md)
   - 📄 [`Email SMTP & Template Builder`](apps/web/docs/superpowers/specs/2026-09-08-email-smtp-and-template-builder-design.md)
2. **Pahami Arsitektur Monorepo**:
   - **Frontend (`apps/web`)**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Motion, Lucide & Base UI.
   - **Backend (`apps/api`)**: NestJS, Prisma ORM, PostgreSQL. Tidak ada `node_modules` di host lokal (diinstal di dalam Docker).
   - **Infrastruktur (`infra/` & Docker Network)**: Menggunakan container PostgreSQL (`dev-postgres`) dan Redis (`dev-redis`) yang terhubung melalui Docker network `dev-network`.

---

## 2. Aturan Pembuatan Git Branch (Branching Strategy)

Seluruh pengerjaan fitur atau perbaikan bug wajib dilakukan di branch terpisah.

### 2.1 Format Penamaan Branch:
Gunakan awalan berikut sesuai dengan jenis pekerjaan Anda:

| Awalan Branch | Kategori Pekerjaan | Contoh Penamaan |
| :--- | :--- | :--- |
| `feat/` | Penambahan fitur baru | `feat/dual-payment-mode`, `feat/auth-api` |
| `fix/` | Perbaikan bug / kendala | `fix/checkout-modal-scroll`, `fix/prisma-connection` |
| `docs/` | Pembaruan dokumentasi / spec | `docs/update-email-spec`, `docs/contributing-guide` |
| `refactor/` | Perapian struktur kode tanpa ubah fungsi | `refactor/settings-submenus`, `refactor/api-modules` |
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

## 3. Standar Pesan Commit (Conventional Commits)

Gunakan Bahasa Indonesia atau Bahasa Inggris yang singkat, padat, dan jelas dengan format:
```text
tipe(cakupan): deskripsi singkat perubahan
```

### Daftar Tipe Commit yang Diizinkan:
* `feat`: Menambah fitur baru (contoh: `feat(api): add photo gallery endpoint with prisma`).
* `fix`: Memperbaiki bug (contoh: `fix(web): resolve checkout calculation error`).
* `docs`: Mengubah atau menambah dokumentasi (contoh: `docs: update root README and setup instructions`).
* `style`: Penyesuaian tampilan / styling yang tidak mengubah logika.
* `refactor`: Perombakan kode tanpa mengubah fitur.
* `chore`: Tugas pemeliharaan build/config/docker.

> ❌ **Hindari pesan commit tidak bermakna seperti**: *"update"*, *"fix bug"*, *"coba lagi"*, *"revisi"*.

---

## 4. Verifikasi Wajib Sebelum Push (Build Gate)

Sebelum menjalankan `git push`, pastikan aplikasi dapat di-build dengan sempurna via Docker Compose:

```bash
# Uji kompilasi container development
docker compose build

# Uji linting frontend
docker compose run --rm web npm run lint

# Uji kompilasi TypeScript backend
docker compose run --rm api npm run build
```

---

## 5. Alur Pengajuan Pull Request (PR)

Setelah kode lolos verifikasi build dan branch telah di-push ke GitHub:
1. **Buka Pull Request** dari branch Anda ke branch `main`.
2. **Format Judul PR**: Gunakan judul yang sama dengan format commit (contoh: `feat(payment): implement dual payment mode and anti-scam checkout`).
3. **Isi Deskripsi PR**:
   - Jelaskan fitur atau perubahan apa yang dibuat.
   - Cantumkan dokumen spesifikasi yang menjadi acuan.
   - Lampirkan screenshot/video pengujian (jika mengubah UI).
4. Minta rekan tim atau Tech Lead untuk me-review kode Anda sebelum di-merge ke `main`.
