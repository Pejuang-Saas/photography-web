# 📸 Kayastory Photography Platform Monorepo

Monorepo resmi untuk website studio dan sistem manajemen studio **Kaya Story Photography (Semarang)**:
- **`apps/web`**: Frontend application menggunakan **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Motion**, Shadcn UI, serta antarmuka Mini CRM WhatsApp.
- **`apps/api`**: Backend REST API menggunakan **NestJS 11**, **Prisma ORM 6.x**, **PostgreSQL 17**, dan **Redis 7**.
- **`infra/`**: Docker Compose untuk database & caching infrastructure (**PostgreSQL** & **Redis**) pada shared network `dev-network`.
- **`docs/`**: Dokumentasi spesifikasi komprehensif untuk Frontend (`docs/frontend/`) dan Backend (`docs/backend/`).

---

## 📁 Struktur Monorepo

```tree
photography/
├── apps/
│   ├── api/                     # Backend NestJS 11 + Prisma ORM
│   │   ├── prisma/              # Skema database & migrasi
│   │   ├── src/                 # Kode sumber controller & service
│   │   ├── Dockerfile.dev       # Hot-reload development container
│   │   ├── docker-entrypoint.sh # Auto prisma generate & db push
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
├── CONTRIBUTING.md               # Panduan kontribusi tim & 5 golden rules
├── .env.example                 # Template environment variables (berbasis URL)
├── .env                         # Konfigurasi aktif monorepo
└── package.json                 # Workspace helper scripts
```

---

## ⚙️ Konfigurasi Environment (Berbasis URL)

File `.env` di root direktori menggunakan format variabel berbasis **URL** (bukan port mentah) agar fleksibel saat deployment dan integrasi reverse proxy:

```env
# ==============================================================================
# Photography Monorepo Environment Variables
# ==============================================================================

# Application URLs
API_URL=http://localhost:3002
WEB_URL=http://localhost:3000

# Infrastructure & Database (terhubung via dev-network)
DATABASE_URL="postgresql://root:root@dev-postgres:5432/photography_db?schema=public"
REDIS_URL="redis://dev-redis:6379"

# Frontend Public URLs
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🐳 Panduan Setup 1: Menggunakan Docker (Direkomendasikan)

> [!TIP]
> Metode ini adalah pilihan terbaik karena **zero local setup** — Anda tidak perlu menginstall Node.js, Prisma CLI, atau database PostgreSQL di komputer lokal. Seluruh `node_modules` diisolasi di dalam container Docker.

### 1. Prasyarat Sistem
- **Docker Desktop** (macOS / Windows) atau **Docker Engine** (Linux) yang sedang berjalan. Cek dengan:
  ```bash
  docker --version
  docker compose version
  ```

### 2. Persiapan Infrastruktur (PostgreSQL & Redis)
Aplikasi terhubung ke network `dev-network`.
- **Jika container `dev-postgres` dan `dev-redis` sudah ada di host** (cek via `docker ps`), Anda bisa langsung melompat ke Langkah 3.
- **Jika container infrastruktur belum ada**, jalankan dari folder `infra/`:
  ```bash
  docker compose -f infra/docker-compose.yml up -d
  ```

### 3. Jalankan Aplikasi (API & Web)
Dari root direktori monorepo (`photography/`):
```bash
# Jalankan seluruh service aplikasi dengan hot-reload
docker compose up -d --build
```

Container API akan otomatis:
1. Menunggu PostgreSQL `dev-postgres:5432` siap menerima koneksi.
2. Menjalankan `prisma generate` dan `prisma db push` untuk menyinkronkan tabel `photography_db`.
3. Menjalankan NestJS dalam mode `start:dev` (hot-reload).
4. Menjalankan Next.js Web di port 3000.

### 4. Perintah Berguna via Docker
```bash
# Melihat log aktivitas API secara realtime
docker compose logs -f api

# Melihat log aktivitas Web
docker compose logs -f web

# Melihat status seluruh kontainer
docker compose ps

# Menghentikan kontainer aplikasi
docker compose down

# Menjalankan perintah Prisma (Push schema / Migrate / Studio)
docker compose exec api npx prisma db push
docker compose exec api npx prisma studio
```

---

## 💻 Panduan Setup 2: Lokal Tanpa Docker (Native Node.js)

Gunakan metode ini jika Anda ingin menjalankan backend dan frontend langsung di mesin lokal komputer tanpa Docker.

### 1. Prasyarat Sistem
Pastikan komputer Anda sudah terpasang:
- **Node.js**: Versi `20.x` LTS atau lebih baru (`node -v`).
- **npm**: Versi `10.x` atau lebih baru (`npm -v`).
- **PostgreSQL 16/17**: Sedang berjalan di `localhost:5432` (dapat menggunakan container Docker `dev-postgres` yang sudah aktif atau PostgreSQL native).
- **Redis 7**: Sedang berjalan di `localhost:6379` (dapat menggunakan container Docker `dev-redis` atau Redis native).

---

### 2. Langkah Setup Backend API (`apps/api`)

1. **Masuk ke direktori API**:
   ```bash
   cd apps/api
   ```

2. **Buat file `.env`**:
   Salin dari `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Sesuaikan `DATABASE_URL` ke host lokal Anda (`localhost`):
   ```env
   PORT=3002
   NODE_ENV=development
   DATABASE_URL="postgresql://root:root@localhost:5432/photography_db?schema=public"
   REDIS_URL="redis://localhost:6379"
   ```

3. **Install dependensi (hanya untuk mode non-docker)**:
   ```bash
   npm install
   ```

4. **Sinkronisasi Skema Database**:
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Push skema tabel ke PostgreSQL
   npx prisma db push
   ```

5. **Jalankan Backend Development Server**:
   ```bash
   npm run start:dev
   ```
   👉 Backend aktif di: **`http://localhost:3002`** (Health check: `http://localhost:3002/health`)

---

### 3. Langkah Setup Frontend Web (`apps/web`)

1. **Buka terminal baru dan masuk ke direktori web**:
   ```bash
   cd apps/web
   ```

2. **Buat file `.env.local`**:
   Salin dari `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   Pastikan mengarah ke Backend API lokal:
   ```env
   PORT=3000
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:3002
   ```

3. **Install dependensi**:
   ```bash
   npm install
   ```

4. **Jalankan Frontend Development Server**:
   ```bash
   npm run dev
   ```
   👉 Frontend aktif di: **`http://localhost:3000`**

---

## 🔗 Endpoint & URL Akses Sistem

| Komponen | URL Akses | Keterangan |
| :--- | :--- | :--- |
| **Landing Page Publik** | [http://localhost:3000](http://localhost:3000) | Beranda, katalog paket foto, ulasan, & checkout booking 4-langkah |
| **Admin Dashboard** | [http://localhost:3000/admin](http://localhost:3000/admin) | Metrik pendapatan, daftar booking, kalender studio, & invoice |
| **Admin Mini CRM** | [http://localhost:3000/admin/crm](http://localhost:3000/admin/crm) | Obrolan WhatsApp & penanda aturan 24 jam anti-ban |
| **API Base URL** | [http://localhost:3002](http://localhost:3002) | NestJS REST API Gateway |
| **API Health Check** | [http://localhost:3002/health](http://localhost:3002/health) | Ping status PostgreSQL via Prisma Client |
| **API Documentation** | [http://localhost:3002/docs](http://localhost:3002/docs) | Swagger / OpenAPI Interactive Documentation |

---

## ❓ Troubleshooting & Pertanyaan Umum

### 1. Port 3000 atau 3002 Sudah Digunakan (*Port in Use*)
Jika muncul error `port is already allocated` atau `EADDRINUSE`:
- **Cek proses di Mac/Linux**:
  ```bash
  lsof -i :3000
  lsof -i :3002
  ```
- Matikan proses dengan `kill -9 <PID>` atau ubah port pada file `.env`.

### 2. Error Koneksi Database (`P1001: Can't reach database server`)
- **Jika menggunakan Docker**: Pastikan `DATABASE_URL` menggunakan nama kontainer `dev-postgres` (`postgresql://root:root@dev-postgres:5432/...`) dan terhubung ke `dev-network`.
- **Jika menggunakan Lokal Native**: Pastikan `DATABASE_URL` menggunakan `localhost` (`postgresql://root:root@localhost:5432/...`) dan port `5432` dapat diakses dari host.

### 3. Perubahan Kode Tidak Terdeteksi di macOS (Docker Desktop)
Konfigurasi Docker compose sudah menyertakan `WATCHPACK_POLLING=true`. Jika perubahan file belum memicu hot-reload:
- Pastikan Docker Desktop memiliki izin file sharing ke folder project (*Settings -> Resources -> File Sharing*).
- Lakukan restart kontainer: `docker compose restart web` atau `docker compose restart api`.

---

## 📚 Dokumentasi Spesifikasi Terpusat

Seluruh dokumentasi teknis tersimpan di folder [`docs/`](file:///Users/user/Developer/projects/personal/photography/docs/):

### 📄 Dokumentasi Backend (`docs/backend/`)
- 📄 [01-PRD.md](file:///Users/user/Developer/projects/personal/photography/docs/backend/01-PRD.md) — Product Requirements Document lengkap
- 📄 [02-ARCHITECTURE.md](file:///Users/user/Developer/projects/personal/photography/docs/backend/02-ARCHITECTURE.md) — Diagram Arsitektur, Sequence Flow, & BullMQ Queue
- 📄 [03-DATABASE-ERD.md](file:///Users/user/Developer/projects/personal/photography/docs/backend/03-DATABASE-ERD.md) — Visual ERD & Skema Prisma Lengkap
- 📄 [04-API-SPECIFICATION.md](file:///Users/user/Developer/projects/personal/photography/docs/backend/04-API-SPECIFICATION.md) — Spesifikasi Endpoint REST API & Webhooks
- 📂 [docs/backend/adrs/](file:///Users/user/Developer/projects/personal/photography/docs/backend/adrs/) — Koleksi 6 Architecture Decision Records

### 📄 Dokumentasi Frontend (`docs/frontend/superpowers/specs/`)
- 📄 [Master Data Layer & Settings](file:///Users/user/Developer/projects/personal/photography/docs/frontend/superpowers/specs/2026-09-08-unified-mock-data-layer-design.md)
- 📄 [Dual Payment Mode & Anti-Scam](file:///Users/user/Developer/projects/personal/photography/docs/frontend/superpowers/specs/2026-09-08-dual-payment-mode-design.md)
- 📄 [WAHA Integration & Mini CRM Anti-Ban](file:///Users/user/Developer/projects/personal/photography/docs/frontend/superpowers/specs/2026-09-08-waha-mini-crm-design.md)
- 📄 [WhatsApp Template Builder Visual](file:///Users/user/Developer/projects/personal/photography/docs/frontend/superpowers/specs/2026-09-08-whatsapp-template-builder-design.md)
- 📄 [Email SMTP & Responsive Template Builder](file:///Users/user/Developer/projects/personal/photography/docs/frontend/superpowers/specs/2026-09-08-email-smtp-and-template-builder-design.md)

---

## 🤝 Panduan Kontribusi

Sebelum membuat branch atau mengajukan Pull Request (PR), silakan baca panduan lengkap di:  
👉 **[CONTRIBUTING.md](file:///Users/user/Developer/projects/personal/photography/CONTRIBUTING.md)**
