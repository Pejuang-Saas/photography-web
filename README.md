# Photography Platform Monorepo

Monorepo untuk platform Photography yang terdiri dari:
- **`apps/api`**: Backend service menggunakan **NestJS**, **Prisma ORM**, dan **PostgreSQL**.
- **`apps/web`**: Frontend application menggunakan **Next.js** (React 19, Tailwind CSS, Shadcn UI).

---

## 📁 Struktur Monorepo

```tree
photography/
├── apps/
│   ├── api/                     # Backend NestJS + Prisma
│   │   ├── prisma/
│   │   │   └── schema.prisma    # PostgreSQL Schema
│   │   ├── src/
│   │   │   ├── prisma/          # PrismaService & Module
│   │   │   ├── app.controller.ts
│   │   │   ├── app.service.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── Dockerfile
│   │   ├── docker-entrypoint.sh
│   │   └── package.json
│   └── web/                     # Frontend Next.js
│       ├── app/
│       ├── components/
│       ├── Dockerfile
│       └── package.json
├── docker-compose.yml           # Orkestrasi Docker (Postgres, API, Web)
├── .env.example                 # Template Environment Variables
├── .env                         # Konfigurasi aktif
└── package.json
```

---

## 🚀 Cara Menjalankan dengan Docker Compose

Semua dependensi `node_modules` diinstal **di dalam container Docker** sehingga host mesin tetap bersih tanpa perlu `npm install` lokal.

### 1. Konfigurasi Environment

Pastikan file `.env` di root sudah sesuai:
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=photography_db
POSTGRES_PORT=5432

API_PORT=3000
WEB_PORT=3001
```

> **Catatan Port:** Jika port `5432` atau `3000` sedang dipakai oleh aplikasi/container lain di host, Anda dapat mengganti port di `.env` (misalnya `POSTGRES_PORT=5434` dan `API_PORT=3002`).

### 2. Jalankan Container

Untuk menjalankan semua service (**PostgreSQL**, **NestJS API**, dan **Next.js Web**):
```bash
docker compose up -d --build
```

Atau hanya menjalankan **Database + Backend API**:
```bash
docker compose up -d --build postgres api
```

### 3. Cek Status dan Log

```bash
# Cek container yang sedang berjalan
docker compose ps

# Melihat log API
docker compose logs -f api

# Melihat log Web
docker compose logs -f web

# Melihat log Database
docker compose logs -f postgres
```

### 4. Menghentikan Container

```bash
docker compose down
```

---

## 🔗 Endpoint Tersedia

- **API Base URL**: [http://localhost:3000](http://localhost:3000)
- **API Health Check**: [http://localhost:3000/health](http://localhost:3000/health) (memverifikasi koneksi database)
- **Web Frontend**: [http://localhost:3001](http://localhost:3001)

---

## 🛠️ Perintah Prisma (via Docker)

Karena `node_modules` dan Prisma CLI berada di dalam container, jalankan perintah Prisma melalui `docker compose exec`:

```bash
# Push schema terbaru ke PostgreSQL
docker compose exec api npx prisma db push

# Menjalankan migrasi database
docker compose exec api npx prisma migrate dev

# Membuka Prisma Studio
docker compose exec api npx prisma studio
```
