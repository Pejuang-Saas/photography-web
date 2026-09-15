# 🏛️ Spesifikasi Arsitektur Sistem Backend (System Architecture)
## Photography Platform Monorepo (Kaya Story Semarang)

- **Versi**: 1.0.0
- **Pola Desain**: *Modular Monolith with Domain-Driven Service Layer*
- **Framework**: NestJS 11 (Express Adapter, TypeScript Strict Mode)
- **Komunikasi Internal**: Docker Bridge Network (`dev-network`)

---

## 1. Topologi Arsitektur Monorepo & Jaringan Docker

Sistem mengadopsi struktur monorepo di mana seluruh layanan aplikasi dan infrastruktur terhubung ke dalam satu bridge network bersama bernama **`dev-network`**.

```mermaid
flowchart TD
    subgraph Host_Machine ["Host Machine (Developer / VPS)"]
        Browser["User Browser / Client Devices"]
        AdminDevice["Admin Device (Tablet / PC)"]
    end

    subgraph External ["External Services"]
        EmailSMTP["SMTP Provider (SendGrid/Mailgun)"]
        MetaAPI["WhatsApp Clients"]
        PaymentGateway["Midtrans/Xendit Gateway"]
    end

    subgraph Docker_Dev_Network ["Docker Virtual Network: dev-network"]
        subgraph Web_Tier ["Frontend Service"]
        NextApp["photography-web (Next.js 16)<br/>Port Host: 3000 (Internal: 3000)"]
        end

        subgraph API_Tier ["Backend Application Service"]
        NestApp["photography-api (NestJS 11)<br/>Port Host: 3002 (Internal: 3000)"]
        PDFWorker["NestJS BullMQ PDF Worker"]
        NotificationWorker["NestJS BullMQ Notification Worker"]
        end

        subgraph Infra_Tier ["Shared Infrastructure Services"]
        Postgres[("dev-postgres (PostgreSQL 17)<br/>Port Host: 5432 (Internal: 5432)<br/>DB: photography_db")]
        Redis[("dev-redis (Redis 7 Alpine)<br/>Port Host: 6379 (Internal: 6379)<br/>Queue & Cache")]
        WAHA["dev-waha (WhatsApp HTTP API)<br/>Port Host: 3001 (Internal: 3000)<br/>Session: default"]
        end
    end

    Browser -->|"HTTP Request (Port 3000)"| NextApp
    AdminDevice -->|"API Calls via CORS (Port 3002)"| NestApp
    Browser -->|"API Calls via CORS (Port 3002)"| NestApp
    PaymentGateway -->|"Webhook (Port 3002)"| NestApp
    
    NextApp -->|"SSR / Server Action API Fetch"| NestApp
    
    NestApp -->|"Prisma Client TCP (Port 5432)"| Postgres
    PDFWorker -->|"Prisma Client"| Postgres
    NotificationWorker -->|"Prisma Client"| Postgres
    
    NestApp -->|"BullMQ & Cache (Port 6379)"| Redis
    PDFWorker <-->|"Consume Job (Port 6379)"| Redis
    NotificationWorker <-->|"Consume Job (Port 6379)"| Redis
    
    NestApp -->|"HTTP Client (Port 3000/WAHA)"| WAHA
    NotificationWorker -->|"HTTP Client"| WAHA
    WAHA -->|"Webhook Callback (POST /webhooks/waha)"| NestApp
    
    NotificationWorker -->|"SMTP TLS"| EmailSMTP
    WAHA -->|"Send Message Protocol"| MetaAPI
```

### Penjelasan Konektivitas Antar Kontainer:
1. **Frontend $\rightarrow$ Backend**: Melalui domain publik `http://localhost:3002` (via Browser) atau alias kontainer internal `http://photography-api:3000` (saat Next.js melakukan *Server-Side Rendering / Route Handler*).
2. **Backend $\rightarrow$ Database**: Menggunakan URI internal `postgresql://root:root@dev-postgres:5432/photography_db?schema=public`.
3. **Backend $\rightarrow$ Caching & Queue**: Menggunakan URI `redis://dev-redis:6379`.
4. **Backend $\leftrightarrow$ WAHA (WhatsApp)**: Menggunakan REST API `http://dev-waha:3000` dan Webhook dua arah.

---

## 2. Struktur Modul Aplikasi NestJS (Internal Modular Monolith)

Kode backend di `apps/api/src/` diorganisir menggunakan prinsip **Clean Architecture**:

```tree
apps/api/src/
├── common/                     # Utilitas Lintas Modul
│   ├── decorators/             # @CurrentUser(), @Roles(), @Public()
│   ├── filters/                # GlobalHttpExceptionFilter
│   ├── guards/                 # JwtAuthGuard, RolesGuard, ThrottlerGuard
│   ├── interceptors/           # TransformResponseInterceptor, LoggingInterceptor
│   └── pipes/                  # Custom Validation & Sanitize Pipes
├── config/                     # Konfigurasi Environment & Type Checking
├── prisma/                     # Global PrismaModule & PrismaService
├── modules/
│   ├── auth/                   # Login Admin, JWT Access/Refresh Token
│   ├── packages/               # Manajemen Katalog Paket & Addons
│   ├── bookings/               # Reservasi, Slot Calculation, Collision Lock
│   ├── payments/               # Upload Bukti Bayar, Verifikasi Admin, Gateway
│   ├── invoices/               # Penomoran Invoice, Kompilasi PDF Document
│   ├── waha/                   # WAHA Client, Session Monitor, Webhook Receiver
│   ├── crm/                    # Obrolan WhatsApp, Tag Kategori, 24h Window Check
│   ├── templates/              # Engine Parser Tag WhatsApp & Builder Template
│   ├── notifications/          # BullMQ Queue Processor (WA & SMTP Email)
│   └── settings/               # Profil Studio, Blackout Dates, Rekening Bank
├── app.module.ts               # Root Orchestration Module
└── main.ts                     # Application Entrypoint & Middleware Pipeline
```

### 2.1 Tabel Tanggung Jawab Modul (Component Responsibility Table)

| Modul NestJS | Tanggung Jawab (Responsibility) | Dependensi Internal Utama |
| :--- | :--- | :--- |
| **AuthModule** | Menangani verifikasi kredensial, hashing password (`bcrypt`), menerbitkan JWT (Access & Refresh), dan role-based access. | `PrismaModule`, `JwtModule` |
| **PackagesModule** | CRUD paket dan addon studio. Menangani logika harga dinamis. Cache response via Redis. | `PrismaModule`, `CacheModule` |
| **BookingsModule** | Inti bisnis kalender; menghitung availabilitas slot, atomic reservation lock, handle blackout dates. | `PrismaModule`, `NotificationsModule` |
| **PaymentsModule** | Verifikasi pembayaran manual, parsing Midtrans webhook, mengelola file bukti transfer lokal/S3. | `PrismaModule`, `InvoicesModule`, `NotificationsModule` |
| **InvoicesModule** | Generate PDF invoice dengan library `pdfkit`/`puppeteer`, penomoran invoice `INV-KYA-*`. | `PrismaModule`, `QueueModule` |
| **CrmModule** | Sinkronisasi pesan WhatsApp WAHA, manajemen *24-hour window locking*, tagging obrolan. | `PrismaModule`, `WahaModule`, `TemplatesModule` |
| **NotificationsModule** | *Producer & Consumer* BullMQ untuk memproses antrian WAHA & Email secara asinkron. Menangani *retry* & *Dead Letter*. | `QueueModule`, `WahaModule`, `TemplatesModule` |

---

## 3. Strategi Keamanan, Caching & Observabilitas

### 3.1 Security Architecture
- **JWT & Stateless Flow**: Token dikirim via HTTP Authorization header (Bearer token). Access token berumur 15 menit, dikombinasikan dengan Refresh token rotasi berumur 7 hari. Backend tidak menyimpan sesi di memori (stateless).
- **CORS (Cross-Origin Resource Sharing)**: Filter origin secara ketat berdasarkan env var `WEB_URL`. Permintaan dari origin anonim akan diblokir oleh layer NestJS middleware.
- **Rate Limiting**: Dikonfigurasi global via `nestjs-throttler` terhubung ke Redis. Publik endpoint (misal list package) maksimal 60/menit per IP. API berat (upload bukti transfer) maksimal 5/menit per IP.
- **SQL Injection Prevention**: Secara native ditangani oleh Prisma ORM parameter bindings, dikombinasikan dengan validasi rigid dari `class-validator` (ValidationPipe `whitelist: true`, membuang field tak dikenal).

### 3.2 Caching Strategy
Menggunakan cache Redis untuk endpoint yang berat I/O namun frekuensi datanya jarang berubah.
- **Tipe Caching**: HTTP Response Caching (menggunakan `@CacheKey()` dan `@CacheTTL()`).
- **Data yang di-cache**: 
  - `GET /packages` (Katalog publik): TTL 24 jam.
  - `GET /studio-profile` (Global setting): TTL 24 jam.
  - `GET /bookings/availability` (Per tanggal): TTL 15 menit.
- **Cache Invalidation**: Strategi *Event-driven invalidation*. Saat Admin melakukan `POST/PUT/DELETE` paket, backend menjalankan `redis.del('cache:packages')`.

### 3.3 Error Handling Strategy
Menggunakan *Global Exception Filter* milik NestJS (`@Catch()`). 
- Menangkap error `PrismaClientKnownRequestError` (misal *unique constraint violation*) dan mengonversinya menjadi `409 Conflict` (bukan 500 Server Error).
- Menangkap error `HttpException` dan membungkusnya dalam Envelope format (struktur JSON konsisten) yang mencantumkan `errorCode` spesifik untuk membantu frontend.
- Error yang fatal (`500`) tidak membocorkan stack trace ke *production output*, tapi dicatat (*logged*).

### 3.4 Logging & Observability
- **Structured Logging**: Menggunakan `nestjs-pino` untuk log berformat JSON, mempermudah konsumsi oleh sistem ELK/Datadog kelak.
- **Request IDs**: Middleware menyematkan UUID kustom `x-request-id` untuk mengkorelasikan log request masuk hingga respons keluar.
- **Health Checks**: Endpoint `GET /health` ditenagai oleh `@nestjs/terminus`, mengecek status prisma (`db.ping()`), status redis, status WAHA node.

---

## 4. Diagram Alur Transaksi Utama (Sequence Diagrams)

### 4.1 Alur Checkout Tamu & Verifikasi Transfer Manual Anti-Scam

Menggantikan alur simulasi pada spesifikasi frontend `2026-09-08-dual-payment-mode-design.md`:

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Tamu (Wisudawan)
    participant Web as Next.js (apps/web)
    participant API as NestJS (apps/api)
    participant DB as PostgreSQL (dev-postgres)
    participant Storage as File Storage
    actor Admin as Admin Studio
    participant Queue as Redis (BullMQ)
    participant WAHA as WAHA Engine (dev-waha)

    Customer->>Web: Pilih Paket, Slot Waktu (09:00), & Masukkan Biodata
    Web->>API: POST /bookings (Data Reservasi)
    API->>DB: BEGIN Transaction
    API->>DB: SELECT FOR UPDATE: Cek Bentrok & Lock Slot
    DB-->>API: Slot Tersedia & Dilock Sementara
    API->>DB: INSERT Booking (Status: PENDING_VERIFICATION)
    API->>DB: COMMIT Transaction
    API-->>Web: 201 Created (bookingCode: KYA-2026-081, Rekening BCA Studio)
    
    Customer->>Web: Transfer BCA & Upload Bukti Bayar (Struk)
    Web->>API: POST /bookings/:id/payment-proof (Multipart Form Data)
    API->>Storage: Validasi Magic Byte & Simpan Gambar Bukti
    API->>DB: UPDATE Booking (paymentProofUrl, paymentStatus: WAITING_CONFIRMATION)
    API-->>Web: 200 OK (Bukti berhasil diunggah)

    Admin->>Web: Buka Dashboard & Modal Detail Booking
    Admin->>API: POST /admin/bookings/:id/verify-payment { verifiedAmount: 645000, isFull: true }
    API->>DB: UPDATE Booking (status: CONFIRMED, paymentStatus: PAID_FULL)
    API->>DB: INSERT Invoice (INV-KYA-2026-081)
    API->>Queue: Push Job 'send-booking-confirmation' { bookingId }
    API-->>Admin: 200 OK (Pembayaran Terverifikasi)

    Queue->>API: Worker memproses job 'send-booking-confirmation'
    API->>API: Render Template WA & PDF Invoice
    API->>WAHA: POST /api/sendText & /api/sendFile (Kirim Invoice ke WA Pelanggan)
    WAHA-->>Customer: Pesan WhatsApp & PDF Invoice Resmi Diterima
```

---

### 4.2 Alur State Machine Jendela Layanan 24 Jam Anti-Ban (Mini CRM)

Mencegah pemblokiran nomor WhatsApp studio sesuai spesifikasi `2026-09-08-waha-mini-crm-design.md`:

```mermaid
stateDiagram-v2
    [*] --> PesanMasuk: Pelanggan Mengirim Pesan WhatsApp
    PesanMasuk --> JendelaAktif: Webhook WAHA Diterima (Reset Timer 24 Jam)
    
    state JendelaAktif {
        [*] --> BebasKirim: Durasi <= 24 Jam Sejak Pesan Terakhir
        BebasKirim --> BebasKirim: Admin Kirim Pesan Bebas (Free-form text)
    }

    JendelaAktif --> JendelaTerkunci: Waktu Berlalu > 24 Jam Tanpa Balasan Pelanggan

    state JendelaTerkunci {
        [*] --> CekJenisPesan
        CekJenisPesan --> TolakPesanBebas: Admin Kirim Pesan Bebas (403 Forbidden)
        CekJenisPesan --> IzinkanTemplateResmi: Admin Kirim Template Terverifikasi
        IzinkanTemplateResmi --> KirimBroadcast: Kirim Template Pengingat / Penawaran Resmi
    }

    JendelaTerkunci --> JendelaAktif: Pelanggan Membalas Pesan Kembali
```

---

## 5. Pola Antrian Latar Belakang (Asynchronous Worker Queue)

Untuk menjaga latensi HTTP API tetap di bawah 100ms dan mencegah *timeout*, proses pekerjaan berat (*heavy I/O* / *external network calls*) didelegasikan ke **BullMQ** dengan Redis sebagai broker:

```mermaid
flowchart LR
    subgraph Producers ["API HTTP Controllers & Cron Jobs"]
        P1["VerifyPaymentController"]
        P2["BookingController"]
        P3["CrmBroadcastController"]
        P4["Cron: BookingExpiration"]
    end

    subgraph Redis_Queue ["Redis 7 (dev-redis) + BullMQ"]
        Q1[("Queue: notifications-wa<br/>(Retry: 3x, Backoff: Exponential)")]
        Q2[("Queue: notifications-email<br/>(Retry: 3x)")]
        Q3[("Queue: pdf-generators")]
        DLQ[("Dead Letter Queue (DLQ)<br/>Job Gagal Total")]
    end

    subgraph Consumers ["NestJS Background Workers"]
        W1["WhatsAppNotificationWorker<br/>(Dispatch ke dev-waha)"]
        W2["EmailNotificationWorker<br/>(Dispatch via SMTP)"]
        W3["PdfInvoiceWorker<br/>(Render HTML to PDF Buffer)"]
    end

    P1 -->|Push Job| Q3
    Q3 -->|Buffer Ready (Pass to Notification)| Q1
    Q3 -->|Buffer Ready (Pass to Email)| Q2
    P2 -->|Push Job| Q1
    P3 -->|Push Job| Q1
    P4 -->|Push Cancel| Q1

    Q1 --> W1
    Q2 --> W2
    Q3 --> W3
    
    W1 -.->|Gagal setelah 3x retry| DLQ
    W2 -.->|Gagal setelah 3x retry| DLQ
```

- **Retry Logic & Backoff Strategy**: Pekerjaan seperti mengirim pesan WhatsApp akan diulang maksimal 3x jika server WAHA terputus. Mekanisme pengulangan berbasis eksponensial (retry setelah 5 detik, lalu 15 detik, dst).
- **Dead Letter Queue (DLQ)**: Jika antrian tetap gagal setelah percobaan terakhir, status pekerjaan dipindahkan ke antrian `failed` pada Redis yang akan dipantau sebagai log darurat (*alert*) untuk diperbaiki manual oleh developer, dan tidak hilang.

---

## 6. Pipeline Eksekusi Permintaan (Request Execution Lifecycle)

Setiap request HTTP yang masuk ke `photography-api` melewati pipeline berlapis standar enterprise:

```text
HTTP Request
     │
     ▼
[ 1. Logging & Request ID Interceptor ]  --> Memberi UUID ke setiap request & catat latency
     │
     ▼
[ 2. Cors & Helmet Middleware ]          --> Membatasi origin ke WEB_URL & set security headers
     │
     ▼
[ 3. ThrottlerGuard (Rate Limiting) ]   --> Batasi lonjakan spam request (Redis backed)
     │
     ▼
[ 4. JwtAuthGuard & RolesGuard ]        --> Ekstrak Bearer Token & verifikasi role ('ADMIN'/'STAFF')
     │
     ▼
[ 5. ValidationPipe (Class-Validator) ]  --> Validasi DTO, strip atribut asing (whitelist: true)
     │
     ▼
[ 6. Controller Handler ]               --> Mapping rute URL & parameter
     │
     ▼
[ 7. Service Layer & Prisma Client ]    --> Logika bisnis & transaksi database PostgreSQL
     │
     ▼
[ 8. TransformResponseInterceptor ]     --> Format seragam JSON: { success: true, data: ... }
     │
     ▼
HTTP Response (atau GlobalHttpExceptionFilter jika terjadi error)
```

---

## 7. Standar Format Respons API (Standardized API Envelope)

Semua respons backend wajib menggunakan format pembungkus konsisten:

### Respons Sukses:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pembayaran berhasil dikonfirmasi dan invoice telah diterbitkan",
  "data": {
    "bookingId": "bk-101",
    "invoiceNumber": "INV-KYA-2026-081",
    "status": "CONFIRMED",
    "paymentStatus": "PAID_FULL"
  },
  "timestamp": "2026-09-15T22:30:00.000Z",
  "requestId": "req-9876-1234"
}
```

### Respons Gagal (Error):
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Jendela layanan pesan 24 jam telah terkunci. Gunakan template resmi terdaftar untuk menghubungi pelanggan ini.",
  "errorCode": "WAHA_WINDOW_LOCKED",
  "timestamp": "2026-09-15T22:30:00.000Z",
  "requestId": "req-9876-1234"
}
```
