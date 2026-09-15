# ADR-001: Pemilihan Framework NestJS 11 & Node.js 20 Alpine Runtime

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead
- **Technical Story**: Membangun fondasi backend yang tangguh untuk sistem reservasi dan operasional Kaya Story.
- **Ticket/Issue**: `[TICKET-ID-PLACEHOLDER]`

---

## 1. Konteks & Permasalahan

Frontend sistem Kaya Story Studio (`apps/web`) dibangun menggunakan Next.js 16 (React 19) dan TypeScript 5 Strict Mode. Untuk membangun backend yang mampu menangani transaksi reservasi studio, verifikasi pembayaran, integrasi WhatsApp, dan pengiriman email otomatis, diperlukan framework backend yang andal dan mudah diskalakan.

**Problem Statement**:
Backend harus mampu melayani operasi API untuk Next.js dengan arsitektur yang jelas. Kita membutuhkan sebuah sistem yang dapat mencegah terjadinya *spaghetti code* saat aplikasi mulai tumbuh dan mengakomodasi fitur-fitur baru.

**Constraints**:
- Harus berjalan dengan optimal dalam kontainer Docker bersama aplikasi lainnya dalam monorepo.
- Memerlukan ekosistem pendukung untuk *queuing*, *database access*, dan integrasi pihak ketiga.

**Stakeholder Concerns**:
- **Tim Developer**: Menginginkan *Developer Experience* (DX) yang baik, dengan type safety dan autocompletion yang penuh dari ujung ke ujung.
- **Manajemen Studio**: Mengharapkan performa aplikasi yang cepat dan tidak ada *downtime* saat melakukan *deployment* atau pembaruan fitur.

## 2. Decision Drivers

- **Struktur Kode & Maintainability**: Kemampuan *framework* untuk menyediakan kerangka kerja arsitektur *out-of-the-box* (seperti modul, kontroler, dan layanan).
- **Type Safety**: Adopsi penuh pada TypeScript tanpa kompromi.
- **Ekosistem & Integrasi**: Ketersediaan *library* dan *plugin* untuk modul yang umum (misalnya Swagger, validasi, ORM, *Message Queue*).
- **Performa & Efisiensi Resource**: Berjalan optimal dalam *environment* Docker *Alpine*.

## 3. Considered Options

| Opsi | Pros (+) | Cons (-) |
|---|---|---|
| **NestJS 11 (Node 20)** | Arsitektur *enterprise-ready*, TypeScript *native*, ekosistem *plugin* matang (*Swagger*, *BullMQ*, *Prisma*). | Kurva pembelajaran lebih curam (konsep *Dependency Injection*, *Decorators*). |
| **Express.js murni** | Sangat ringan, fleksibel, mudah dipelajari, banyak referensi komunitas. | Tidak memiliki standar arsitektur bawaan, sangat rentan terhadap *spaghetti code* di skala besar. |
| **Fastify murni** | Performa dan *throughput* sangat tinggi. | Ekosistem *plugin* untuk kebutuhan spesifik (seperti ORM/WAHA integrasi) kurang matang dibandingkan NestJS. |
| **Go/Fiber** | Eksekusi sangat cepat, *footprint* memori kecil. | Memutus *stack* bahasa (frontend TS, backend Go) sehingga *context switching* developer tinggi. |

## 4. Decision Outcome

Kami memilih **NestJS 11** yang berjalan di atas **Node.js 20 Alpine** (`node:20-alpine`) dengan HTTP platform adapter standar Express.

**Implementasi & Panduan**:
1. **Struktur Modular**: Setiap domain bisnis (Bookings, Payments, WAHA, CRM, Invoices) diisolasi dalam satu Module tersendiri (`*.module.ts`, `*.service.ts`, `*.controller.ts`).
2. **Strict Validation Pipeline**: Menggunakan kombinasi `class-validator` dan `class-transformer` secara global untuk menjamin sanitasi seluruh payload HTTP sebelum masuk ke service layer.
3. **Docker Multi-Stage Build**: Memisahkan stage `deps`, `dev` (hot-reload via `start:dev`), `builder`, dan `runner` (image produksi tanpa build tools).

**Contoh Konfigurasi Bootstrapping (main.ts):**
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Strict Validation Pipeline
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Kaya Story API')
    .setDescription('Backend API for Photography Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

## 5. Pros and Cons of the Decision

- **Pros (+)**:
  - Struktur kode terstandarisasi, memudahkan kolaborasi banyak developer pemula tanpa risiko kode "spaghetti".
  - Swagger/OpenAPI otomatis di-generate menggunakan `@nestjs/swagger` decorators, memudahkan frontend developer dalam integrasi.
  - Sangat mudah mengintegrasikan sistem pihak ketiga (BullMQ, Prisma, dan Throttler) via modul resmi NestJS.
  - Memanfaatkan ekosistem satu bahasa (TypeScript) di seluruh monorepo.
- **Cons (-)**:
  - Terdapat sedikit kurva pembelajaran terhadap konsep *Dependency Injection* bagi developer yang terbiasa dengan Express polos.
  - *Cold start* dan *build time* lebih lambat dibanding framework minimalis lainnya.

## 6. Related ADRs

- [ADR-002: Pemilihan PostgreSQL 17 & Prisma ORM 6.x](./ADR-002-database-orm.md)
- [ADR-003: Caching & Asynchronous Task Queue Menggunakan Redis 7 & BullMQ](./ADR-003-caching-queue.md)

## 7. References

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [Node.js 20 Release Notes](https://nodejs.org/en/blog/release/v20.0.0)
- [Docker Alpine Images](https://hub.docker.com/_/node)
