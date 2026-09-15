# ADR-003: Caching & Asynchronous Task Queue Menggunakan Redis 7 & BullMQ

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead
- **Technical Story**: Menghandle operasi IO yang berat secara asinkron menggunakan antrian, dan melakukan cache untuk data frekuensi tinggi.
- **Ticket/Issue**: `[TICKET-ID-PLACEHOLDER]`

---

## 1. Konteks & Permasalahan

Operasi backend studio foto melibatkan sejumlah tugas berat yang memiliki latensi tinggi (*high latency I/O*). Jika seluruh tugas ini dijalankan secara sinkronus (*blocking* di dalam controller HTTP), pengguna akan mengalami loading lama saat *checkout* atau verifikasi pembayaran, serta rentan mengalami *HTTP Timeout (504)*.

**Problem Statement**:
Kinerja sistem terhambat karena *main thread* menahan *HTTP response* sembari menunggu koneksi ke layanan pihak ketiga (WAHA, SMTP) atau komputasi berat selesai. 

**Constraints**:
- Pengguna mengharapkan respon interaksi UI di bawah 200ms.
- Proses seperti rendering PDF butuh (1.5 - 3 detik).
- Integrasi WhatsApp API (WAHA) memakan (1 - 4 detik) dan bisa berpotensi gagal karena masalah jaringan.

**Stakeholder Concerns**:
- **Pelanggan**: Menginginkan proses navigasi dan *booking* yang cepat tanpa jeda *loading* berlebihan.
- **Admin**: Membutuhkan kepastian bahwa notifikasi (WA & Email) tetap terkirim walaupun terjadi gangguan koneksi sementara.

## 2. Decision Drivers

- **Responsivitas HTTP**: Perlunya mendelegasikan tugas berat dari siklus *request-response* utama.
- **Fault-Tolerance (Ketahanan Sistem)**: Pesan atau notifikasi tidak boleh hilang bila terjadi masalah koneksi, melainkan harus diulang otomatis (*retry*).
- **Reduksi Beban Database**: Caching katalog dan jadwal untuk mereduksi *query* repetitif ke database.
- **Kemudahan Integrasi**: Alat yang digunakan sebaiknya memiliki integrasi *native* atau matang dengan NestJS.

## 3. Considered Options

| Opsi | Pros (+) | Cons (-) |
|---|---|---|
| **Redis 7 + BullMQ** | Kinerja in-memory sangat cepat, mendukung *retry*, *backoff*, terintegrasi mulus dengan NestJS `@nestjs/bullmq`. | Menggunakan memori untuk *queue*, perlu manajemen jika *job* macet terlalu banyak. |
| **RabbitMQ** | Sangat tangguh untuk pola *routing* kompleks, arsitektur AMQP standar industri. | Lebih rumit disiapkan/dikelola, membutuhkan servis terpisah (*overkill* untuk skala kita saat ini yang sudah pakai Redis). |
| **Kafka** | Kapasitas *throughput* luar biasa, ideal untuk *event-sourcing*. | Kompleksitas *setup* sangat tinggi, butuh memori dan JVM besar, terlalu berlebihan. |
| **In-Memory Queue (EventEmitter)** | Sangat mudah digunakan, *built-in* dari Node.js. | Tidak *fault-tolerant*, data *queue* hilang jika *server restart*, tidak dapat diskalakan horizontal. |

## 4. Decision Outcome

Kami memilih **Redis 7** (menggunakan kontainer eksisting `dev-redis` pada `dev-network`) sebagai infrastruktur ganda untuk **Cache Layer** dan **BullMQ Queue Broker**.

**Implementasi & Panduan**:
1. **Queueing Terisolasi**:
   - `notifications-wa`: Mengelola antrian pengiriman teks & file PDF ke WAHA.
   - `notifications-email`: Mengelola antrian SMTP pengiriman invoice.
   - `pdf-renderer`: Mengelola kompilasi PDF tanpa membebani *thread* HTTP utama.
2. **Retry & Backoff Strategy**: Setiap kegagalan koneksi ke WAHA atau SMTP otomatis diulang (*exponential backoff retry*) hingga 3 kali.
3. **In-Memory Caching**: Cache katalog paket foto (`GET /packages`) dan profil studio di memori Redis dengan TTL (*Time-To-Live*) 1 jam, yang otomatis di-invalidate saat admin melakukan update.

**Contoh Konfigurasi BullMQ di NestJS:**
```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    // Global Redis configuration for BullMQ
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'dev-redis',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for manual inspection
      },
    }),
    // Registering specific queues
    BullModule.registerQueue(
      { name: 'notifications-wa' },
      { name: 'notifications-email' },
      { name: 'pdf-renderer' },
    ),
  ],
})
export class QueueModule {}
```

## 5. Pros and Cons of the Decision

- **Pros (+)**:
  - Latensi respons HTTP *checkout* dan verifikasi pembayaran turun drastis ke < 80ms.
  - Sistem memiliki toleransi kegagalan (*fault-tolerance*): jika WAHA restart, pesan antrian tidak hilang dan akan terkirim begitu WAHA aktif kembali.
  - Re-utilisasi kontainer Redis mengurangi kebutuhan untuk infrastruktur ekstra.
- **Cons (-)**:
  - Membutuhkan penanganan status *monitoring* antrian (misal menggunakan Bull-Board *dashboard* untuk admin teknis).
  - Serialisasi data dalam antrian harus berbentuk JSON statis (tidak bisa berupa *class instance/functions*).

## 6. Related ADRs

- [ADR-001: Pemilihan Framework NestJS 11 & Node.js 20 Alpine Runtime](./ADR-001-framework-runtime.md)
- [ADR-006: Template Engine & Otomatisasi Dokumen (WhatsApp, Email SMTP, & PDF)](./ADR-006-notification-templates.md)

## 7. References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [NestJS BullMQ Integration](https://docs.nestjs.com/techniques/queues)
- [Redis Official Specs](https://redis.io/docs/)
