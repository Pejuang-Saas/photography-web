# ADR-002: Pemilihan PostgreSQL 17 & Prisma ORM 6.x

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead
- **Technical Story**: Menentukan persistensi data relasional yang andal beserta lapisan ORM dengan type-safety ketat.
- **Ticket/Issue**: `[TICKET-ID-PLACEHOLDER]`

---

## 1. Konteks & Permasalahan

Sistem reservasi studio dan verifikasi keuangan membutuhkan database yang mampu menangani relasi antar-entitas kompleks. Data pemesanan pelanggan, detail tagihan, rekam obrolan (CRM), dan ketersediaan waktu studio harus saling terkait satu sama lain.

**Problem Statement**:
Kesalahan pada relasi database atau pengaksesan data (seperti _null pointers_ atau _typo_ nama kolom) dapat berdampak langsung ke kegagalan operasional, misal _double booking_ atau ketidakcocokan nilai transaksi. Sistem perlu metode untuk memastikan setiap interaksi ke database itu aman.

**Constraints**:

- Wajib memiliki jaminan ketat akan konsistensi data (ACID).
- Relasi tabel sangat kompleks (paket foto, addon, jadwal booking, bukti transfer, riwayat chat).
- Harus kompatibel dengan kontainerisasi dan proses CI/CD.

**Stakeholder Concerns**:

- **Tim Developer**: Butuh _autocomplete_ di IDE untuk meminimalkan durasi _debugging_ dan mencegah _typo_.
- **Manajer Studio**: Tidak boleh ada pelanggan yang memesan di jadwal yang sudah penuh (_double booking_).

## 2. Decision Drivers

- **Integritas Transaksi (ACID)**: Mutlak diperlukan untuk transaksi finansial (pembayaran) dan sistem penjadwalan.
- **Type Safety Penuh**: Konektivitas end-to-end type-safe dari _Database Schema_ hingga _API Response_.
- **Kemudahan Migrasi**: Solusi harus menyediakan cara mudah untuk mengelola perubahan skema seiring waktu.
- **Database Engine Matang**: Memerlukan engine yang stabil dan berkinerja tinggi untuk kueri-kueri berelasi dalam.

## 3. Considered Options

| Opsi                            | Pros (+)                                                                                            | Cons (-)                                                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL 17 + Prisma 6.x**  | _Type-safety_ absolut, skema deklaratif, dukungan migrasi mudah dan handal.                         | Kinerja eksekusi kueri agregasi berat bisa sedikit lebih lambat dari raw SQL.                                          |
| **PostgreSQL 17 + TypeORM**     | Mendukung paradigma _ActiveRecord_ dan _DataMapper_, cukup familiar untuk veteran Spring/Hibernate. | Kurang ketat dalam _type-safety_, sering bermasalah di migrasi otomatis pada fitur-fitur PG modern.                    |
| **PostgreSQL 17 + Drizzle ORM** | Performa sangat cepat (karena abstraksinya dekat ke SQL), 100% Type-safe.                           | Dokumentasi skema terkadang sulit dibaca untuk relasi yang kompleks, belum selengkap Prisma untuk integrasi ekosistem. |
| **MongoDB + Mongoose**          | Sangat fleksibel dalam menyimpan data tidak terstruktur (dokumen).                                  | Tidak menjamin ACID seketat PostgreSQL, sangat berisiko untuk transaksi reservasi bersinggungan.                       |

## 4. Decision Outcome

Kami memilih **PostgreSQL 17 Alpine** yang dikelola melalui **Prisma ORM 6.x**.

**Implementasi & Panduan**:

1. **Container Eksisting**: Memanfaatkan container `dev-postgres` yang telah berjalan pada Docker network `dev-network` dengan database khusus `photography_db`.
2. **Global Prisma Module**: Mengimplementasikan `PrismaService` yang mengimplementasikan lifecycle NestJS (`OnModuleInit` dan `OnModuleDestroy`) untuk manajemen _connection pool_ yang efisien.
3. **Database Constraints**: Memanfaatkan composite unique index PostgreSQL pada kolom `(session_date, time_slot, location)` untuk menjamin pencegahan _double booking_ pada level kernel database.
4. **Auto-Synchronization**: Menggunakan `docker-entrypoint.sh` di dalam Docker container API untuk menjalankan `prisma generate` dan `prisma db push` secara otomatis setiap kali container di-restart (di environment dev).

**Contoh Implementasi PrismaService:**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Strategi Migrasi:**
Untuk lingkungan _development_, perubahan skema diaplikasikan via `prisma db push`. Untuk _production_, kita menggunakan `prisma migrate deploy` sebagai bagian dari proses CI/CD.

## 5. Pros and Cons of the Decision

- **Pros (+)**:
  - 100% _Type-safety_: perubahan skema Prisma otomatis memperbarui interface TypeScript di seluruh service.
  - Relasi antar tabel terbaca jelas secara deklaratif dalam satu berkas `schema.prisma`.
  - Migrasi database terdokumentasi dan dapat dilacak (_version-controlled_).
  - Ekosistem ekstensif dengan ekstensi prisma-studio untuk melihat isi database.
- **Cons (-)**:
  - Eksekusi bulk insertion dalam jumlah puluhan ribu baris lebih lambat dibandingkan _raw query_ SQL, namun untuk skala studio fotografi (ratusan transaksi/hari), performa Prisma sangat memadai.
  - Abstraksi Prisma kadang menyembunyikan inefisiensi _query_ (contoh: N+1 problem jika tidak hati-hati).

## 6. Related ADRs

- [ADR-001: Pemilihan Framework NestJS 11 & Node.js 20 Alpine Runtime](./ADR-001-framework-runtime.md)

## 7. References

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/)
- [Prisma ORM Documentation](https://www.prisma.io/docs)
- [NestJS Prisma Integration Guide](https://docs.nestjs.com/recipes/prisma)
