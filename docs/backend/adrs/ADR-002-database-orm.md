# ADR-002: Pemilihan PostgreSQL 17 & Prisma ORM 6.x

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead

---

## 1. Konteks & Permasalahan
Sistem reservasi studio dan verifikasi keuangan membutuhkan database yang:
1. Menjamin integritas data transaksi perbankan dan reservasi secara ACID (*Atomicity, Consistency, Isolation, Durability*).
2. Mampu menangani relasi kompleks antara paket foto, addon, jadwal booking, bukti transfer, invoice, dan riwayat chat CRM.
3. Memiliki ORM TypeScript yang memberikan *autocomplete* dan *type-safety* penuh untuk mencegah bug *null pointer* atau salah ketik nama kolom.

## 2. Keputusan Arsitektur
Kami memilih **PostgreSQL 17 Alpine** yang dikelola melalui **Prisma ORM 6.x**:
1. **Container Eksisting**: Memanfaatkan container `dev-postgres` yang telah berjalan pada Docker network `dev-network` dengan database khusus `photography_db`.
2. **Global Prisma Module**: Mengimplementasikan `PrismaService` yang mengimplementasikan lifecycle NestJS (`OnModuleInit` dan `OnModuleDestroy`) untuk manajemen connection pool yang efisien.
3. **Database Constraints**: Memanfaatkan composite unique index PostgreSQL pada kolom `(session_date, time_slot, location)` untuk menjamin pencegahan double booking pada level kernel database.
4. **Auto-Synchronization**: Menggunakan `docker-entrypoint.sh` di dalam Docker container API untuk menjalankan `prisma generate` dan `prisma db push` secara otomatis setiap kali container di-restart.

## 3. Konsekuensi
- **Positif (+)**:
  - 100% Type-safety: perubahan skema Prisma otomatis memperbarui interface TypeScript di seluruh service.
  - Relasi antar tabel terbaca jelas secara deklaratif dalam satu berkas `schema.prisma`.
  - Migrasi database terdokumentasi dan dapat dilacak (*version-controlled*).
- **Negatif (-)**:
  - Eksekusi bulk insertion dalam jumlah puluhan ribu baris lebih lambat dibandingkan raw query SQL, namun untuk skala studio fotografi (ratusan transaksi/hari), performa Prisma sangat memadai.

## 4. Alternatif yang Dipertimbangkan
- *TypeORM*: Kurang ketat dalam type safety dan sering mengalami kendala migrasi pada PostgreSQL modern.
- *Drizzle ORM*: Performa sangat baik, namun Prisma dipilih karena kejelasan skema deklaratif dan kemudahan integrasi Docker entrypoint untuk tim.
