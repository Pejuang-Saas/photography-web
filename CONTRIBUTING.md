# 🤝 Panduan Kontribusi (Contributing Guide) - Kaya Story Monorepo

Terima kasih telah berkontribusi dalam pengembangan platform **Kaya Story Photography Monorepo** (Frontend Next.js & Backend NestJS + Prisma)! 📸

Panduan ini dibuat agar seluruh anggota tim developer memiliki standar kerja yang sama, menjaga kualitas kode tetap bersih, mencegah konflik git, dan memastikan setiap fitur berjalan dengan lancar.

---

## 🌟 Project Overview

Platform ini merupakan sebuah monorepo berskala *enterprise* yang memisahkan tanggung jawab (Separation of Concerns) secara tegas antara lapisan UI (Frontend) dan logika bisnis serta pengelolaan data (Backend).

- **Frontend (`apps/web`)**: Next.js 16 (App Router) menggunakan arsitektur komponen React 19, ditata dengan Tailwind CSS v4. Bertugas menangani tampilan publik dan dashboard admin CRM.
- **Backend (`apps/api`)**: NestJS 11 yang bertindak sebagai API gateway dan micro-services orchestrator. Menggunakan Prisma ORM 6.x untuk interaksi ke PostgreSQL 17, serta Redis 7 untuk sistem antrian (*job queue* via BullMQ).
- **Infrastruktur (`infra`)**: File konfigurasi Docker Compose untuk menyuplai *database* dan *cache layer* lokal ke dalam jaringan yang terisolasi.

---

## 📋 5 Aturan Emas Kontributor (Golden Rules)

Aturan ini bersifat mutlak. Pelanggaran terhadap poin-poin ini dapat menyebabkan PR (Pull Request) Anda ditolak.

1. **Wajib Baca Dokumen Spesifikasi (`docs/`)** sebelum mulai menulis kode.
   - ❌ *Pelanggaran*: Membuat struktur tabel atau mock API secara asal tanpa mengacu pada PRD/ERD.
   - ✅ *Solusi*: Selalu selaraskan implementasi dengan `docs/backend/03-DATABASE-ERD.md` dan `docs/frontend/superpowers/specs/`.

2. **Dilarang Keras Commit Langsung ke Branch `main`**.
   - ❌ *Pelanggaran*: Melakukan `git commit` di branch `main` lalu `git push origin main`.
   - ✅ *Solusi*: Selalu buat branch fitur baru dengan pola penamaan yang disepakati (misal: `feat/...`, `fix/...`).

3. **Patuhi Pemisahan Monorepo (Separation of Concerns)**.
   - ❌ *Pelanggaran*: Meletakkan tipe (Type/Interface) Prisma backend di dalam `apps/web/src`, atau sebaliknya.
   - ✅ *Solusi*: Frontend di `apps/web`, Backend di `apps/api`, Infra di `infra/`.

4. **Gunakan Format Conventional Commits**.
   - ❌ *Pelanggaran*: Menulis commit message "fix bug" atau "update styling".
   - ✅ *Solusi*: Gunakan awalan terstruktur seperti `fix(web): resolve layout shift on checkout page`.

5. **Wajib Lolos Uji Build & Linting** sebelum PR.
   - ❌ *Pelanggaran*: Mengirimkan PR yang gagal di-compile oleh TypeScript atau terdapat peringatan ESLint.
   - ✅ *Solusi*: Jalankan `npm run lint` dan `npm run build` lokal secara berkala.

---

## 🌿 Aturan Pembuatan Git Branch (Branching Strategy)

Seluruh pengerjaan fitur atau perbaikan bug wajib dilakukan di branch terpisah.

### Format Penamaan Branch
Gunakan awalan berikut sesuai dengan jenis pekerjaan Anda:

| Awalan Branch | Kategori Pekerjaan | Contoh Penamaan |
| :--- | :--- | :--- |
| `feat/` | Penambahan fitur baru | `feat/dual-payment-mode`, `feat/auth-api` |
| `fix/` | Perbaikan bug / kendala | `fix/checkout-modal-scroll`, `fix/prisma-connection` |
| `docs/` | Pembaruan dokumentasi / spec | `docs/update-email-spec`, `docs/contributing-guide` |
| `refactor/` | Perapian struktur kode | `refactor/settings-submenus`, `refactor/api-modules` |
| `style/` | Perbaikan styling UI / CSS | `style/mobile-dock-padding`, `style/badge-contrast` |

---

## 📝 Standar Pesan Commit (Conventional Commits)

Kami menggunakan format Conventional Commits. Anda diperbolehkan menggunakan Bahasa Indonesia atau Bahasa Inggris yang singkat, padat, dan jelas.

### Struktur
```text
<tipe>(<cakupan>): <deskripsi singkat>
```

### Tabel Contoh DO & DON'T

| Tipe | Contoh Benar (✅ DO) | Contoh Salah (❌ DON'T) |
| :--- | :--- | :--- |
| **feat** | `feat(api): add photo gallery endpoint` | `fitur galeri ditambahin` |
| **fix** | `fix(web): resolve checkout calculation error` | `fix bug checkout` |
| **docs** | `docs: update root README instructions` | `update readme` |
| **style** | `style(web): fix padding on mobile nav` | `benerin css dikit` |
| **refactor**| `refactor(api): move user validation to guard` | `rapihin kode backend` |

---

## 📐 Code Style & Conventions

### Frontend (`apps/web` - Next.js)
1. **Server vs Client Components**: Secara default, gunakan *Server Components* untuk performa. Gunakan `'use client'` hanya di ujung *(leaves)* komponen interaktif atau yang membutuhkan React Hooks (`useState`, `useEffect`).
2. **Styling**: Gunakan sintaks Tailwind CSS v4. Gunakan `cn()` utility untuk menggabungkan class conditionally (dari library `clsx` & `tailwind-merge`).
3. **Data Fetching**: Jangan memanggil database dari Server Components secara langsung, panggil internal API Next.js Route Handlers atau eksternal NestJS backend.

### Backend (`apps/api` - NestJS)
1. **Modularity**: Tiap fitur wajib memiliki modul sendiri (misal: `AuthModule`, `BookingModule`). Hindari membuat *God Controller*.
2. **Validasi**: Wajib menggunakan `class-validator` dan `class-transformer` di dalam kelas DTO (Data Transfer Object).
3. **Prisma Calls**: Bungkus interaksi database kompleks di dalam transaksi (`$transaction`) untuk mencegah data parsial *(partial state)*.

---

## ✅ Pull Request (PR) Checklist

Gunakan markdown checkbox ini pada deskripsi Pull Request (PR) Anda di GitHub:

```markdown
### Deskripsi Perubahan
[Tuliskan ringkasan dari fitur/bug yang dikerjakan]

### Referensi Spesifikasi / Tiket
- Resolves: #TICKET_ID / Acuan Dokumen Spec

### Checklist Verifikasi
- [ ] Saya telah membaca dan memahami **Golden Rules**.
- [ ] Kode saya telah lolos `npm run lint` di lokal (Web / API).
- [ ] Kode saya berhasil di-*build* secara bersih (`npm run build`).
- [ ] Pesan commit saya mengikuti format *Conventional Commits*.
- [ ] (Jika ada perubahan UI) Saya telah melampirkan screenshot / screen recording uji coba fitur.
- [ ] (Jika mengubah Prisma Schema) Saya telah menyertakan script migrasi / PRISMA.
```

---

## 🛠 Debugging Tips untuk Umum

Menghadapi masalah saat development? Cobalah langkah-langkah berikut sebelum bertanya:

1. **"Module not found" / Kesalahan Import**
   - *Tip*: Hapus folder `node_modules` dan file `package-lock.json` di root atau di dalam `apps/...`, lalu jalankan ulang `npm install`.

2. **Perubahan Database Prisma Tidak Muncul**
   - *Tip*: Pastikan Anda sudah menjalankan ulang `npx prisma generate` di dalam `apps/api` (atau eksekusi via docker: `docker compose exec api npx prisma generate`).

3. **NestJS Berjalan tetapi 500 Error Terus Menerus**
   - *Tip*: Cek terminal untuk meninjau log lengkap. Sebagian besar 500 error disebabkan karena kegagalan DI (Dependency Injection) di mana sebuah provider/service lupa didaftarkan ke array `providers: []` di dalam modul.

4. **Next.js Hydration Mismatch**
   - *Tip*: Ini biasanya terjadi jika output rendering server berbeda dari client (sering karena manipulasi tanggal atau ekstensi browser tertentu). Pastikan komponen yang mengakses `window` atau `localStorage` dibungkus dengan komponen `NoSSR` atau dieksekusi di dalam `useEffect`.
