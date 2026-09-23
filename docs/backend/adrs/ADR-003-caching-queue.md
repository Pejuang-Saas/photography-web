# ADR-003: Caching & Asynchronous Task Queue Menggunakan Redis 7 & BullMQ

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead
- **Technical Story**: Menghandle operasi IO yang berat secara asinkron menggunakan antrian, dan melakukan cache untuk data frekuensi tinggi.
- **Ticket/Issue**: `[TICKET-ID-PLACEHOLDER]`

---

## 1. Konteks & Permasalahan

Operasi backend studio foto melibatkan sejumlah tugas berat yang memiliki latensi tinggi (_high latency I/O_). Jika seluruh tugas ini dijalankan secara sinkronus (_blocking_ di dalam controller HTTP), pengguna akan mengalami loading lama saat _checkout_ atau verifikasi pembayaran, serta rentan mengalami _HTTP Timeout (504)_.

**Problem Statement**:
Kinerja sistem terhambat karena _main thread_ menahan _HTTP response_ sembari menunggu koneksi ke layanan pihak ketiga (WAHA, SMTP) atau komputasi berat selesai.

**Constraints**:

- Pengguna mengharapkan respon interaksi UI di bawah 200ms.
- Proses seperti rendering PDF butuh (1.5 - 3 detik).
- Integrasi WhatsApp API (WAHA) memakan (1 - 4 detik) dan bisa berpotensi gagal karena masalah jaringan.

**Stakeholder Concerns**:

- **Pelanggan**: Menginginkan proses navigasi dan _booking_ yang cepat tanpa jeda _loading_ berlebihan.
- **Admin**: Membutuhkan kepastian bahwa notifikasi (WA & Email) tetap terkirim walaupun terjadi gangguan koneksi sementara.

## 2. Decision Drivers

- **Responsivitas HTTP**: Perlunya mendelegasikan tugas berat dari siklus _request-response_ utama.
- **Fault-Tolerance (Ketahanan Sistem)**: Pesan atau notifikasi tidak boleh hilang bila terjadi masalah koneksi, melainkan harus diulang otomatis (_retry_).
- **Reduksi Beban Database**: Caching katalog dan jadwal untuk mereduksi _query_ repetitif ke database.
- **Kemudahan Integrasi**: Alat yang digunakan sebaiknya memiliki integrasi _native_ atau matang dengan NestJS.

## 3. Considered Options

| Opsi                               | Pros (+)                                                                                                         | Cons (-)                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Redis 7 + BullMQ**               | Kinerja in-memory sangat cepat, mendukung _retry_, _backoff_, terintegrasi mulus dengan NestJS `@nestjs/bullmq`. | Menggunakan memori untuk _queue_, perlu manajemen jika _job_ macet terlalu banyak.                                         |
| **RabbitMQ**                       | Sangat tangguh untuk pola _routing_ kompleks, arsitektur AMQP standar industri.                                  | Lebih rumit disiapkan/dikelola, membutuhkan servis terpisah (_overkill_ untuk skala kita saat ini yang sudah pakai Redis). |
| **Kafka**                          | Kapasitas _throughput_ luar biasa, ideal untuk _event-sourcing_.                                                 | Kompleksitas _setup_ sangat tinggi, butuh memori dan JVM besar, terlalu berlebihan.                                        |
| **In-Memory Queue (EventEmitter)** | Sangat mudah digunakan, _built-in_ dari Node.js.                                                                 | Tidak _fault-tolerant_, data _queue_ hilang jika _server restart_, tidak dapat diskalakan horizontal.                      |

## 4. Decision Outcome

Kami memilih **Redis 7** (menggunakan kontainer eksisting `dev-redis` pada `dev-network`) sebagai infrastruktur ganda untuk **Cache Layer** dan **BullMQ Queue Broker**.

**Implementasi & Panduan**:

1. **Queueing Terisolasi**:
   - `notifications-wa`: Mengelola antrian pengiriman teks & file PDF ke WAHA.
   - `notifications-email`: Mengelola antrian SMTP pengiriman invoice.
   - `pdf-renderer`: Mengelola kompilasi PDF tanpa membebani _thread_ HTTP utama.
2. **Retry & Backoff Strategy**: Setiap kegagalan koneksi ke WAHA atau SMTP otomatis diulang (_exponential backoff retry_) hingga 3 kali.
3. **In-Memory Caching**: Cache katalog paket foto (`GET /packages`) dan profil studio di memori Redis dengan TTL (_Time-To-Live_) 1 jam, yang otomatis di-invalidate saat admin melakukan update.

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
  - Latensi respons HTTP _checkout_ dan verifikasi pembayaran turun drastis ke < 80ms.
  - Sistem memiliki toleransi kegagalan (_fault-tolerance_): jika WAHA restart, pesan antrian tidak hilang dan akan terkirim begitu WAHA aktif kembali.
  - Re-utilisasi kontainer Redis mengurangi kebutuhan untuk infrastruktur ekstra.
- **Cons (-)**:
  - Membutuhkan penanganan status _monitoring_ antrian (misal menggunakan Bull-Board _dashboard_ untuk admin teknis).
  - Serialisasi data dalam antrian harus berbentuk JSON statis (tidak bisa berupa _class instance/functions_).

## 6. Related ADRs

- [ADR-001: Pemilihan Framework NestJS 11 & Node.js 20 Alpine Runtime](./ADR-001-framework-runtime.md)
- [ADR-006: Template Engine & Otomatisasi Dokumen (WhatsApp, Email SMTP, & PDF)](./ADR-006-notification-templates.md)

## 7. References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [NestJS BullMQ Integration](https://docs.nestjs.com/techniques/queues)
- [Redis Official Specs](https://redis.io/docs/)
