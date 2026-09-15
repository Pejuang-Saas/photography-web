# 📸 Kayastory Photography Platform Monorepo

Monorepo resmi untuk website studio dan sistem manajemen studio **Kaya Story Photography (Semarang)**:
- **`apps/web`**: Frontend application menggunakan **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, **Motion**, Shadcn UI, serta Mini CRM WhatsApp.
- **`apps/api`**: Backend service menggunakan **NestJS**, **Prisma ORM**, dan **PostgreSQL**.
- **`infra/`**: Docker Compose untuk database & caching infrastructure (**PostgreSQL** & **Redis**) pada shared network `dev-network`.

---

## 📁 Struktur Monorepo

```tree
photography/
├── apps/
│   ├── api/                     # Backend NestJS + Prisma
│   │   ├── prisma/
│   │   │   └── schema.prisma    # PostgreSQL Schema
│   │   ├── src/
│   │   │   ├── prisma/          # PrismaService & Module (@Global)
│   │   │   ├── app.controller.ts
│   │   │   ├── app.service.ts
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── Dockerfile
│   │   ├── Dockerfile.dev        # Development hot-reload
│   │   ├── docker-entrypoint.sh # Auto prisma generate & db push
│   │   └── package.json
│   └── web/                     # Frontend Next.js 16
│       ├── app/
│       ├── components/
│       ├── docs/superpowers/specs/ # Dokumen spesifikasi teknis
│       ├── Dockerfile
│       ├── Dockerfile.dev        # Development hot-reload
│       └── package.json
├── infra/
│   └── docker-compose.yml       # Infra service (Postgres, Redis) via dev-network
├── docker-compose.yml           # Root compose (apps: api & web terhubung ke dev-network)
├── CONTRIBUTING.md               # Panduan kontribusi & golden rules
├── .env.example                 # Template Environment Variables (berbasis URL)
├── .env                         # Konfigurasi aktif
└── package.json
```

---

## 🛠️ Konfigurasi Environment (Berbasis URL)

File `.env` di root menggunakan variabel berbasis **URL** (bukan angka port mentah):

```env
# Application URLs
API_URL=http://localhost:3002
WEB_URL=http://localhost:3000

# Infrastructure & Database (terhubung melalui dev-network)
DATABASE_URL="postgresql://root:root@dev-postgres:5432/photography_db?schema=public"
REDIS_URL="redis://dev-redis:6379"

# Frontend Public URLs
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🐳 Panduan Menjalankan via Docker Compose

### 1. Infrastruktur (PostgreSQL & Redis)

Aplikasi terhubung ke network `dev-network`. Jika container infrastruktur (`dev-postgres` dan `dev-redis`) sudah berjalan di Docker host, aplikasi `api` dan `web` akan otomatis terhubung langsung ke service tersebut.

Jika Anda ingin menjalankan infrastruktur secara mandiri:
```bash
docker compose -f infra/docker-compose.yml up -d
```

### 2. Jalankan Aplikasi (API & Web)

Jalankan container development dari root direktori:
```bash
docker compose up -d --build
```

Container API akan secara otomatis:
1. Menghubungkan ke `dev-postgres:5432` pada `dev-network`.
2. Menjalankan `prisma generate` dan `prisma db push` untuk memastikan database schema mutakhir.
3. Menjalankan server NestJS dalam mode `start:dev` dengan fitur hot-reload.

### 3. Monitoring Log

```bash
# Melihat log API
docker compose logs -f api

# Melihat log Web
docker compose logs -f web

# Melihat seluruh status container
docker compose ps
```

### 4. Menghentikan Aplikasi

```bash
docker compose down
```

---

## 🔗 Endpoint & URL Akses

| Service | URL | Deskripsi |
| :--- | :--- | :--- |
| **Web Landing Page** | [http://localhost:3000](http://localhost:3000) | Katalog paket foto wisuda & reservasi |
| **Admin Dashboard** | [http://localhost:3000/admin](http://localhost:3000/admin) | Metrik omset studio & manajemen reservasi |
| **API Base** | [http://localhost:3002](http://localhost:3002) | NestJS REST API |
| **API Health Check** | [http://localhost:3002/health](http://localhost:3002/health) | Ping status PostgreSQL via Prisma |

---

## 🛠️ Perintah Prisma (via Docker)

Karena seluruh dependensi terisolasi di dalam Docker (tanpa `node_modules` di host lokal):

```bash
# Push perubahan schema ke PostgreSQL
docker compose exec api npx prisma db push

# Buat migration baru
docker compose exec api npx prisma migrate dev

# Buka Prisma Studio (Web GUI DB)
docker compose exec api npx prisma studio
```

---

## 🤝 Panduan Kontribusi & Spesifikasi Teknis

- Silakan baca panduan kontribusi lengkap di 📄 [CONTRIBUTING.md](file:///Users/user/Developer/projects/personal/photography/CONTRIBUTING.md).
- Dokumen spesifikasi fitur tersimpan di: [`apps/web/docs/superpowers/specs/`](file:///Users/user/Developer/projects/personal/photography/apps/web/docs/superpowers/specs/).
