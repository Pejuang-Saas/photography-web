# 📸 Kayastory Photography Web & Studio Management

Website resmi studio foto wisuda dan potret analog **Kaya Story Photography (Semarang)**. Aplikasi ini dibangun dengan teknologi modern **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, dan **Motion**, dilengkapi sistem manajemen reservasi studio (*Admin Dashboard*), Mini CRM WhatsApp, serta lapisan data simulasi interaktif (*LocalStorage Data Layer*).

---

## 📑 Daftar Isi
- [Teknologi & Stack](#-teknologi--stack)
- [Struktur Halaman & Rute](#-struktur-halaman--rute)
- [Panduan Setup 1: Tanpa Docker (Lokal / Node.js)](#-panduan-setup-1-tanpa-docker-lokal--nodejs)
- [Panduan Setup 2: Menggunakan Docker](#-panduan-setup-2-menggunakan-docker)
  - [A. Mode Development (Hot-Reload)](#a-mode-development-hot-reload)
  - [B. Mode Production (Build Optimal)](#b-mode-production-build-optimal)
- [Dokumentasi Spesifikasi Teknis (Specs)](#-dokumentasi-spesifikasi-teknis-specs)
- [Panduan Kontribusi (Contributing)](#-panduan-kontribusi-contributing)
- [Troubleshooting & Kendala Umum](#-troubleshooting--kendala-umum)

---

## 🛠 Teknologi & Stack

* **Framework**: [Next.js 16.3 (App Router)](https://nextjs.org) & [React 19](https://react.dev)
* **Bahasa**: [TypeScript 5](https://www.typescriptlang.org) (Strict Mode)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com) (CSS-first configuration)
* **Animasi**: [Motion (Framer Motion v13)](https://motion.dev) & [GSAP](https://gsap.com)
* **Komponen UI**: [Base UI](https://base-ui.com), [Phosphor Icons](https://phosphoricons.com), [Lucide Icons](https://lucide.dev)
* **Diagram & Grafik**: [Recharts](https://recharts.org)
* **Notifikasi Toast**: [Sonner](https://sonner.emilkowal.ski)
* **Containerization**: Docker & Docker Compose (Multi-stage build)

---

## 🗺 Struktur Halaman & Rute

Setelah aplikasi berjalan, berikut daftar halaman yang dapat diakses:

| Bagian | Rute / URL | Penjelasan Fungsi |
| :--- | :--- | :--- |
| **Landing Page** | `http://localhost:3000/` | Halaman beranda utama: katalog paket foto wisuda, ulasan klien, galeri interaktif, dan modal checkout booking bertahap. |
| **Dashboard Admin** | `http://localhost:3000/admin` | Ringkasan metrik statistik studio (total omset, jumlah pemesanan) dan grafik pendapatan bulanan. |
| **Manajemen Booking** | `http://localhost:3000/admin/bookings` | Daftar reservasi pelanggan, filter status, pencarian, dan verifikasi bukti transfer manual. |
| **Kalender Sesi** | `http://localhost:3000/admin/calendar` | Jadwal sesi pemotretan studio per tanggal dan jam, serta penanda hari libur studio (*blackout dates*). |
| **Paket Layanan** | `http://localhost:3000/admin/packages` | Pengelolaan paket foto (tambah paket baru, ubah harga, kuota master edit, durasi sesi). |
| **Invoice Digital** | `http://localhost:3000/admin/invoices` | Daftar invoice resmi yang otomatis terbit saat pembayaran diverifikasi, dilengkapi fungsi cetak PDF. |
| **Mini CRM WhatsApp** | `http://localhost:3000/admin/crm` | Ruang obrolan pelanggan, pengelompokan label kategori dinamis, dan proteksi anti-ban jendela pesan 24 jam. |
| **Pengaturan Studio** | `http://localhost:3000/admin/settings` | Navigasi 2 kolom: Profil studio, Metode Pembayaran Dual Mode (Gateway vs BCA), Koneksi WAHA, Template Builder, dan Notifikasi Email SMTP. |

---

## 💻 Panduan Setup 1: Tanpa Docker (Lokal / Node.js)

Gunakan cara ini jika Anda ingin menjalankan aplikasi langsung di komputer lokal menggunakan Node.js.

### 1. Prasyarat Sistem
Pastikan komputer Anda sudah terpasang:
* **Node.js**: Versi `20.x` atau lebih baru (Disarankan versi LTS). Cek dengan `node -v`.
* **npm**: Versi `10.x` atau lebih baru. Cek dengan `npm -v`.

### 2. Langkah-Langkah Menjalankan:

#### Langkah 1: Siapkan Berkas Environment
Salin berkas template environment `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
*(Nilai bawaan sudah siap pakai untuk pengujian lokal `http://localhost:3000`)*.

#### Langkah 2: Install Dependensi
Jalankan perintah berikut untuk mengunduh semua paket library:
```bash
npm install
```

#### Langkah 3: Jalankan Development Server
Nyalakan server development dengan fitur *hot-reloading* (halaman otomatis ter-update saat kode disimpan):
```bash
npm run dev
```

Buka peramban (browser) dan akses:  
👉 **`http://localhost:3000`**

### 3. Perintah Lain yang Berguna:
* `npm run build` — Melakukan kompilasi dan optimasi kode untuk produksi.
* `npm run start` — Menjalankan server hasil build produksi (wajib jalankan `npm run build` terlebih dahulu).
* `npm run lint` — Memeriksa standar kode dan potensi kesalahan menggunakan ESLint.

---

## 🐳 Panduan Setup 2: Menggunakan Docker

Gunakan cara ini jika Anda tidak ingin menginstall Node.js di komputer lokal, atau ingin lingkungan yang terisolasi dan identik dengan server produksi.

### 1. Prasyarat Sistem
* Pastikan **Docker Desktop** (atau Docker Engine di Linux) sudah terpasang dan sedang berjalan. Cek dengan:
```bash
docker --version
docker compose version
```

---

### A. Mode Development (Hot-Reload)
Mode ini menggunakan konfigurasi `docker-compose.yml` dengan *volume mounting*. Setiap perubahan kode di editor Anda akan langsung terdeteksi tanpa perlu build ulang kontainer.

#### 1. Jalankan Kontainer Development:
```bash
docker compose up
```

Jika ingin menjalankannya di latar belakang (*background/detached mode*):
```bash
docker compose up -d
```

#### 2. Akses Aplikasi:
Buka browser di:  
👉 **`http://localhost:3000`**

#### 3. Perintah Tambahan untuk Mode Development:
* **Melihat log aktivitas**:
  ```bash
  docker compose logs -f web
  ```
* **Menghentikan kontainer**:
  ```bash
  docker compose down
  ```
* **Build ulang (jika baru saja menambah dependensi di `package.json`)**:
  ```bash
  docker compose up --build
  ```

---

### B. Mode Production (Build Optimal)
Mode ini menggunakan `docker-compose.prod.yml` dengan *multi-stage build* dan fitur Next.js *standalone output* yang menghasilkan ukuran image sangat ringan dan performa maksimal.

#### 1. Jalankan Kontainer Production:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

#### 2. Akses Aplikasi:
Buka browser di:  
👉 **`http://localhost:3000`**

#### 3. Menghentikan Kontainer Production:
```bash
docker compose -f docker-compose.prod.yml down
```

---

## 📚 Dokumentasi Spesifikasi Teknis (Specs)

Aplikasi ini dirancang menggunakan standar spesifikasi teknis modular. Seluruh dokumen spesifikasi tersimpan di folder `docs/superpowers/specs/` dan saling terhubung satu sama lain:

1. 📄 [`docs/superpowers/specs/2026-09-08-unified-mock-data-layer-design.md`](./docs/superpowers/specs/2026-09-08-unified-mock-data-layer-design.md)  
   **Dokumen Induk**: Arsitektur master data layer (`localStorage`), event listener sinkronisasi antar tab, navigasi pengaturan 2 kolom, dan tombol reset pabrik khusus mode development.

2. 📄 [`docs/superpowers/specs/2026-09-08-dual-payment-mode-design.md`](./docs/superpowers/specs/2026-09-08-dual-payment-mode-design.md)  
   **Modul Pembayaran**: Mode Gateway (Midtrans/Xendit) vs Transfer Manual BCA, alur checkout 4 langkah (*Preview Order*, sinyal anti-scam, upload struk transfer, dan konfirmasi WhatsApp CS 1-klik).

3. 📄 [`docs/superpowers/specs/2026-09-08-waha-mini-crm-design.md`](./docs/superpowers/specs/2026-09-08-waha-mini-crm-design.md)  
   **Modul Komunikasi & CRM**: Integrasi engine WAHA QR, pembacaan riwayat chat dari sesi aktif, sistem label/kategori kustom dinamis, dan proteksi anti-ban jendela pesan 24 jam.

4. 📄 [`docs/superpowers/specs/2026-09-08-whatsapp-template-builder-design.md`](./docs/superpowers/specs/2026-09-08-whatsapp-template-builder-design.md)  
   **Modul WhatsApp Template Builder**: Antarmuka visual penyusunan template pesan WhatsApp dengan simulator smartphone live dan tombol tag variabel dinamis 1-klik.

5. 📄 [`docs/superpowers/specs/2026-09-08-email-smtp-and-template-builder-design.md`](./docs/superpowers/specs/2026-09-08-email-smtp-and-template-builder-design.md)  
   **Modul Email SMTP & Builder**: Pengaturan koneksi server SMTP, pengiriman otomatis invoice digital ke email pelanggan, dan builder email responsif (Desktop & Mobile).

---

## 🤝 Panduan Kontribusi (Contributing)

Kami menyambut kontribusi dari seluruh anggota tim developer! Sebelum mulai membuat branch atau menulis kode:
* Baca panduan lengkap di 📄 [`CONTRIBUTING.md`](./CONTRIBUTING.md).
* **Ringkasan 5 Aturan Emas**:
  1. **Wajib Baca Dokumen Spesifikasi** di `docs/superpowers/specs/` sebelum menulis kode.
  2. **Dilarang Commit Langsung ke `main`** — Buat branch fitur (`feat/...`, `fix/...`, dll.).
  3. **Patuhi Pemisahan Komponen Global vs Lokal** (`@/components/ui/` vs folder lokal fitur).
  4. **Gunakan Format Conventional Commits** (`feat:`, `fix:`, `docs:`, dll.).
  5. **Wajib Lolos Build Docker Compose (`docker compose -f docker-compose.prod.yml build`)** sebelum mengajukan Pull Request (PR).

---

## ❓ Troubleshooting & Kendala Umum

### 1. Port 3000 Sudah Digunakan (*Port in Use*)
Jika muncul pesan error `Port 3000 is already in use`:
* **Di Mac / Linux**: Cari dan matikan proses yang menggunakan port 3000:
  ```bash
  lsof -i :3000
  kill -9 <PID_PROSES>
  ```
* Atau jalankan Next.js di port lain:
  ```bash
  npm run dev -- -p 3001
  ```

### 2. Perubahan Kode Tidak Terdeteksi di Docker (Khusus macOS)
Konfigurasi `docker-compose.yml` sudah dilengkapi dengan `WATCHPACK_POLLING=true`. Jika perubahan masih tidak terbaca:
* Pastikan Docker Desktop memiliki izin akses file sharing ke folder project Anda (*Docker Settings -> Resources -> File Sharing*).
* Lakukan restart kontainer dengan `docker compose restart web`.

### 3. Mengembalikan Data Pengujian ke Kondisi Awal (Reset Mock Data)
Jika data pesanan atau paket di browser Anda sudah terlalu banyak setelah pengujian:
* Masuk ke halaman **Settings** (`/admin/settings`).
* Pilih sub-menu **Pemeliharaan & Simulator Data**.
* Klik tombol merah **"Reset ke Data Awal Pabrik"** (tombol ini otomatis muncul jika server dijalankan pada mode development).
* Seluruh data di `localStorage` akan kembali bersih seperti kondisi awal pemasangan.
