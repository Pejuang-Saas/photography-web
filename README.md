<div align="center">
  <h1>📸 Kaya Story Photography Platform</h1>
  
  ![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)
  ![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)
  ![Docker](https://img.shields.io/badge/docker-ready-2496ED.svg?style=for-the-badge&logo=docker&logoColor=white)
  ![Node.js](https://img.shields.io/badge/node->=22.22.1-339933.svg?style=for-the-badge&logo=nodedotjs&logoColor=white)

  <p><strong>Sistem Manajemen Studio & Website Resmi Kaya Story (Semarang)</strong></p>

  ![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
  ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)
  ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
  ![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white)
  ![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=flat-square&logo=prisma&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql&logoColor=white)
  ![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)
</div>

<br />

Kaya Story Photography Platform adalah monorepo berskala enterprise yang dirancang untuk mengelola seluruh aspek operasional studio foto. Solusi ini menghubungkan etalase publik yang elegan dengan sistem backend tangguh yang mengatur pemesanan (booking), pengelolaan kalender studio, pembayaran terintegrasi, dan Mini CRM via WhatsApp — semuanya dalam satu ekosistem modern.

---

## 🚀 Quick Start

Hanya punya waktu 5 menit? Jalankan environment secara instan menggunakan Docker.

```bash
# 1. Clone repositori
git clone https://github.com/kayastory/photography.git
cd photography

# 2. Siapkan file environment
cp .env.example .env
# Isi BETTER_AUTH_SECRET di .env dengan nilai acak dari: openssl rand -base64 32

# 3. Jalankan seluruh infrastruktur dan aplikasi (Docker diwajibkan)
docker compose -f infra/docker-compose.yml up -d
docker compose up -d --build

# 4. Selesai! Buka di browser:
# Frontend: http://localhost:3000
# Backend API: http://localhost:3002
```

---

## 📁 Struktur Monorepo

```tree
photography/
├── apps/
│   ├── api/                     # Backend NestJS 11 + Prisma ORM
│   │   ├── prisma/              # Skema database & migrasi
│   │   ├── src/                 # Kode sumber controller & service
│   │   ├── Dockerfile.dev       # Hot-reload development container
│   │   └── package.json
│   └── web/                     # Frontend Next.js 16 (App Router)
│       ├── app/                 # Halaman publik & admin dashboard
│       ├── components/          # Komponen UI (Tailwind & Shadcn)
│       ├── Dockerfile.dev       # Hot-reload development container
│       └── package.json
├── infra/
│   └── docker-compose.yml       # PostgreSQL 17 & Redis 7 via dev-network
├── docs/                        # Dokumentasi Proyek Terpusat
│   ├── backend/                 # PRD, Arsitektur, ERD, API Specs, & 6 ADRs
│   └── frontend/                # 5 Dokumen Spesifikasi Desain Fitur Studio
├── docker-compose.yml           # Root compose (menjalankan apps/api & apps/web)
├── CONTRIBUTING.md              # Panduan kontribusi tim & 5 golden rules
├── .env.example                 # Template environment variables
└── package.json                 # Workspace helper scripts
```

---

## ⚙️ Konfigurasi Environment

File `.env` di root direktori mengatur variabel berbasis **URL** untuk memastikan fleksibilitas dalam deployment dan routing proxy.

```env
# ==============================================================================
# Photography Monorepo Environment Variables
# ==============================================================================

# Application URLs
API_URL=http://localhost:3002
WEB_URL=http://localhost:3000

# Infrastructure & Database (Terhubung via dev-network di dalam Docker)
DATABASE_URL="postgresql://root:root@dev-postgres:5432/photography_db?schema=public"
REDIS_URL="redis://dev-redis:6379"

# Frontend Public URLs (Akan dibaca oleh browser)
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_SITE_URL=http://localhost:3000
BETTER_AUTH_SECRET=<nilai-acak-minimal-32-karakter>
```

---

## 🐳 Panduan Setup 1: Menggunakan Docker (Direkomendasikan)

> [!TIP]
> Metode ini adalah pilihan terbaik. Anda tidak perlu menginstal Node.js, Prisma, atau PostgreSQL di komputer. Seluruh dependensi terisolasi sempurna di dalam container.

### 1. Prasyarat
Pastikan **Docker Desktop** (macOS / Windows) atau **Docker Engine** (Linux) berjalan.
```bash
docker compose version
```

### 2. Langkah Setup

1. **Jalankan Infrastruktur Data (PostgreSQL & Redis)**
   *Mengapa? API kita membutuhkan database dan cache eksternal untuk menyimpan data pengguna dan sesi antrian (BullMQ).*
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```
   
2. **Jalankan Aplikasi Web dan API**
   *Mengapa? Perintah ini membangun image frontend dan backend. Container API akan otomatis menjalankan `prisma generate` dan `prisma db push` sebelum start.*
   ```bash
   docker compose up -d --build
   ```

3. **Cek Log (Opsional)**
   *Mengapa? Untuk memastikan Prisma berhasil terhubung dan server NestJS telah siap menerima request.*
   ```bash
   docker compose logs -f api
   ```

### ✅ Verifikasi Docker Setup

Pastikan API berjalan dan merespon:
```bash
curl -X GET http://localhost:3002/health
# Expected Response:
# {"status": "ok", "database": "connected", "redis": "connected"}
```

Pastikan Frontend Next.js berjalan:
```bash
curl -I http://localhost:3000
# Expected Response:
# HTTP/1.1 200 OK
# X-Powered-By: Next.js
```

---

## 💻 Panduan Setup 2: Lokal Tanpa Docker (Native)

Gunakan metode ini jika Anda membutuhkan akses langsung ke Node.js runtime (misalnya untuk debugging intensif dengan VSCode debugger).

### 1. Prasyarat
- **Node.js**: `v22.22.1` atau lebih baru untuk backend Better Auth.
- **Infrastruktur berjalan**: Pastikan PostgreSQL (`localhost:5432`) dan Redis (`localhost:6379`) aktif. Anda tetap bisa menggunakan container `infra/` dari Docker untuk ini.

### 2. Langkah Setup Backend (`apps/api`)

1. **Instal dependensi**
   *Mengapa? Mengunduh seluruh paket NestJS, Prisma, dan library pendukung.*
   ```bash
   cd apps/api
   npm install
   ```

2. **Siapkan `.env` lokal**
   *Mengapa? Karena kita tidak menggunakan docker network, `dev-postgres` tidak akan dikenali. Kita harus mengarahkannya ke `localhost`.*
   ```bash
   cp .env.example .env
   # Ganti DATABASE_URL menjadi: postgresql://root:root@localhost:5432/photography_db?schema=public
   # Ganti REDIS_URL menjadi: redis://localhost:6379
   ```

3. **Sinkronisasi Skema Database**
   *Mengapa? Menerapkan skema tabel dari `schema.prisma` langsung ke dalam PostgreSQL yang berjalan.*
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Jalankan Backend**
   ```bash
   npm run start:dev
   ```

### 3. Langkah Setup Frontend (`apps/web`)

1. **Instal dependensi frontend**
   ```bash
   cd apps/web
   npm install
   ```

2. **Jalankan Frontend Server**
   ```bash
   npm run dev
   ```

### ✅ Verifikasi Lokal Setup

Uji endpoint API lokal Anda:
```bash
curl -X GET http://localhost:3002/docs-json
# Expected Response:
# JSON dari Swagger OpenAPI document.
```

---

## 🔗 URL Referensi Sistem

| Komponen | URL Akses | Keterangan |
| :--- | :--- | :--- |
| **Landing Page Publik** | [http://localhost:3000](http://localhost:3000) | Katalog paket foto, ulasan, & checkout |
| **Admin Dashboard** | [http://localhost:3000/admin](http://localhost:3000/admin) | Metrik pendapatan, daftar booking, kalender |
| **Admin Mini CRM** | [http://localhost:3000/admin/crm](http://localhost:3000/admin/crm) | Obrolan WhatsApp & penanda anti-ban |
| **API Base URL** | [http://localhost:3002](http://localhost:3002) | NestJS REST API Gateway |
| **API Health Check** | [http://localhost:3002/health](http://localhost:3002/health) | Ping status server & database |
| **API Swagger Docs** | [http://localhost:3002/docs](http://localhost:3002/docs) | OpenAPI Interactive Documentation |
| **Prisma Studio** | `npx prisma studio` (via API) | GUI Manajemen Data Database |

---

## 🔄 Development Workflow

Saat mengembangkan fitur baru, kami menerapkan alur kerja standar (GitHub Flow):

```mermaid
gitGraph
   commit id: "Initial"
   branch feat/payment
   checkout feat/payment
   commit id: "Add logic"
   commit id: "Add tests"
   checkout main
   merge feat/payment
```

1. **Sinkronisasi**: Tarik pembaruan terbaru (`git pull origin main`).
2. **Branching**: Buat branch baru untuk fitur atau bug (`git checkout -b feat/nama-fitur`).
3. **Pengembangan**: Kembangkan kode, baca spesifikasi dari folder `docs/`.
4. **Commit**: Gunakan pesan Conventional Commits (`feat(web): update cart UI`).
5. **PR**: Ajukan Pull Request ke `main` dan minta review rekan kerja.

---

## ❓ Troubleshooting & Pertanyaan Umum

### 1. Error Port Sudah Digunakan
**Pesan Error:** `Error: listen EADDRINUSE: address already in use :::3000`
**Penyebab:** Ada aplikasi atau sisa proses Next.js/NestJS yang masih berjalan di latar belakang.
**Solusi:**
```bash
# macOS/Linux: Temukan proses dan matikan
lsof -i :3000
kill -9 <PID>
```

### 2. Prisma Gagal Terhubung ke Database (Docker)
**Pesan Error:** `PrismaClientInitializationError: Can't reach database server at dev-postgres:5432`
**Penyebab:** Container infrastruktur PostgreSQL belum berjalan atau berada di Docker network yang berbeda.
**Solusi:**
Pastikan `infra/docker-compose.yml` telah dijalankan terlebih dahulu dan cek keberadaan network:
```bash
docker compose -f infra/docker-compose.yml up -d
docker network ls | grep dev-network
```

### 3. Hot Reload Tidak Berfungsi di macOS (Docker Desktop)
**Pesan Error:** *Tidak ada error, tetapi perubahan file React tidak muncul di browser.*
**Penyebab:** Limitasi file-watching pada file system mount Docker Desktop macOS.
**Solusi:**
Pastikan `WATCHPACK_POLLING=true` aktif di file compose. Jika masih gagal, paksa restart watcher:
```bash
docker compose restart web
```

### 4. Gagal Menjalankan Build Image
**Pesan Error:** `failed to solve: rpc error: code = Unknown desc = failed to compute cache key`
**Penyebab:** Ada perubahan konfigurasi paket, tetapi Docker menggunakan cache image lama yang korup.
**Solusi:**
Build ulang image tanpa cache:
```bash
docker compose build --no-cache
docker compose up -d
```

### 5. Redis Timeout pada BullMQ
**Pesan Error:** `Error: connect ETIMEDOUT at TCPConnectWrap.afterConnect` pada module BullMQ.
**Penyebab:** Koneksi ke Redis lambat atau `dev-redis` mati secara mendadak.
**Solusi:**
Restart service Redis dari folder infrastruktur.
```bash
docker compose -f infra/docker-compose.yml restart redis
```

---

## 📚 Dokumentasi Spesifikasi Terpusat

Seluruh panduan teknis yang detail, keputusan arsitektur, dan referensi desain dapat ditemukan di folder `docs/`:

- 📄 **[PRD & Business Logic](docs/backend/01-PRD.md)**
- 📄 **[Arsitektur & Message Queue](docs/backend/02-ARCHITECTURE.md)**
- 📄 **[Skema Database (ERD)](docs/backend/03-DATABASE-ERD.md)**
- 📄 **[Spesifikasi API Endpoint](docs/backend/04-API-SPECIFICATION.md)**
- 📄 **[Frontend Design Specs](docs/frontend/superpowers/specs/)**

---

## 🤝 Panduan Kontribusi

Untuk mempelajari tentang *Golden Rules*, struktur format pesan commit, dan daftar centang Pull Request, harap baca dengan saksama:

👉 **[CONTRIBUTING.md](CONTRIBUTING.md)**
