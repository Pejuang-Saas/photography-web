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
Backend harus mampu melayani operasi API untuk Next.js dengan arsitektur yang jelas. Kita membutuhkan sebuah sistem yang dapat mencegah terjadinya _spaghetti code_ saat aplikasi mulai tumbuh dan mengakomodasi fitur-fitur baru.

**Constraints**:

- Harus berjalan dengan optimal dalam kontainer Docker bersama aplikasi lainnya dalam monorepo.
- Memerlukan ekosistem pendukung untuk _queuing_, _database access_, dan integrasi pihak ketiga.

**Stakeholder Concerns**:

- **Tim Developer**: Menginginkan _Developer Experience_ (DX) yang baik, dengan type safety dan autocompletion yang penuh dari ujung ke ujung.
- **Manajemen Studio**: Mengharapkan performa aplikasi yang cepat dan tidak ada _downtime_ saat melakukan _deployment_ atau pembaruan fitur.

## 2. Decision Drivers

- **Struktur Kode & Maintainability**: Kemampuan _framework_ untuk menyediakan kerangka kerja arsitektur _out-of-the-box_ (seperti modul, kontroler, dan layanan).
- **Type Safety**: Adopsi penuh pada TypeScript tanpa kompromi.
- **Ekosistem & Integrasi**: Ketersediaan _library_ dan _plugin_ untuk modul yang umum (misalnya Swagger, validasi, ORM, _Message Queue_).
- **Performa & Efisiensi Resource**: Berjalan optimal dalam _environment_ Docker _Alpine_.

## 3. Considered Options

| Opsi                    | Pros (+)                                                                                                       | Cons (-)                                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **NestJS 11 (Node 20)** | Arsitektur _enterprise-ready_, TypeScript _native_, ekosistem _plugin_ matang (_Swagger_, _BullMQ_, _Prisma_). | Kurva pembelajaran lebih curam (konsep _Dependency Injection_, _Decorators_).                               |
| **Express.js murni**    | Sangat ringan, fleksibel, mudah dipelajari, banyak referensi komunitas.                                        | Tidak memiliki standar arsitektur bawaan, sangat rentan terhadap _spaghetti code_ di skala besar.           |
| **Fastify murni**       | Performa dan _throughput_ sangat tinggi.                                                                       | Ekosistem _plugin_ untuk kebutuhan spesifik (seperti ORM/WAHA integrasi) kurang matang dibandingkan NestJS. |
| **Go/Fiber**            | Eksekusi sangat cepat, _footprint_ memori kecil.                                                               | Memutus _stack_ bahasa (frontend TS, backend Go) sehingga _context switching_ developer tinggi.             |

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
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

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
  - Terdapat sedikit kurva pembelajaran terhadap konsep _Dependency Injection_ bagi developer yang terbiasa dengan Express polos.
  - _Cold start_ dan _build time_ lebih lambat dibanding framework minimalis lainnya.

## 6. Related ADRs

- [ADR-002: Pemilihan PostgreSQL 17 & Prisma ORM 6.x](./ADR-002-database-orm.md)
- [ADR-003: Caching & Asynchronous Task Queue Menggunakan Redis 7 & BullMQ](./ADR-003-caching-queue.md)

## 7. References

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [Node.js 20 Release Notes](https://nodejs.org/en/blog/release/v20.0.0)
- [Docker Alpine Images](https://hub.docker.com/_/node)
