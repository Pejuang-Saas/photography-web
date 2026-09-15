# ADR-001: Pemilihan Framework NestJS 11 & Node.js 20 Alpine Runtime

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead

---

## 1. Konteks & Permasalahan
Frontend sistem Kaya Story Studio (`apps/web`) dibangun menggunakan Next.js 16 (React 19) dan TypeScript 5 Strict Mode. Untuk membangun backend yang mampu menangani transaksi reservasi studio, verifikasi pembayaran, integrasi WhatsApp, dan pengiriman email otomatis, diperlukan framework backend yang:
1. Mendukung arsitektur modular enterprise (Dependency Injection, Decorators, Separation of Concerns).
2. Memiliki dukungan TypeScript native kelas satu.
3. Mudah diintegrasikan ke dalam ekosistem monorepo Docker bersama Next.js tanpa dependensi `node_modules` di host lokal.

## 2. Keputusan Arsitektur
Kami memilih **NestJS 11** yang berjalan di atas **Node.js 20 Alpine** (`node:20-alpine`) dengan HTTP platform adapter standar Express:
1. **Struktur Modular**: Setiap domain bisnis (Bookings, Payments, WAHA, CRM, Invoices) diisolasi dalam satu Module tersendiri (`*.module.ts`, `*.service.ts`, `*.controller.ts`).
2. **Strict Validation Pipeline**: Menggunakan kombinasi `class-validator` dan `class-transformer` secara global untuk menjamin sanitasi seluruh payload HTTP sebelum masuk ke service layer.
3. **Docker Multi-Stage Build**: Memisahkan stage `deps`, `dev` (hot-reload via `start:dev`), `builder`, dan `runner` (image produksi tanpa build tools).

## 3. Konsekuensi
- **Positif (+)**:
  - Struktur kode terstandarisasi, memudahkan kolaborasi banyak developer pemula tanpa risiko kode "spaghetti".
  - Swagger/OpenAPI otomatis di-generate menggunakan `@nestjs/swagger` decorators.
  - Sangat mudah mengintegrasikan BullMQ, Prisma, dan Throttler via modul resmi NestJS.
- **Negatif (-)**:
  - Sedikit kurva pembelajaran konsep Dependency Injection bagi developer yang terbiasa dengan Express polos.

## 4. Alternatif yang Dipertimbangkan
- *Express.js murni*: Terlalu minim struktur, rawan inkonsistensi arsitektur saat skala fitur bertambah.
- *Fastify murni*: Performa throughput sedikit lebih tinggi, namun ekosistem modul pihak ketiga untuk WAHA/Prisma/BullMQ lebih matang di NestJS.
