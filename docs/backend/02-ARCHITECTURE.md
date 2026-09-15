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
    end

    subgraph Docker_Dev_Network ["Docker Virtual Network: dev-network"]
        subgraph Web_Tier ["Frontend Service"]
            NextApp["photography-web (Next.js 16)<br/>Port Host: 3000 (Internal: 3000)"]
        end

        subgraph API_Tier ["Backend Application Service"]
            NestApp["photography-api (NestJS 11)<br/>Port Host: 3002 (Internal: 3000)"]
        end

        subgraph Infra_Tier ["Shared Infrastructure Services"]
            Postgres["dev-postgres (PostgreSQL 17)<br/>Port Host: 5432 (Internal: 5432)<br/>DB: photography_db"]
            Redis["dev-redis (Redis 7 Alpine)<br/>Port Host: 6379 (Internal: 6379)<br/>Queue & Cache"]
            WAHA["dev-waha (WhatsApp HTTP API)<br/>Port Host: 3001 (Internal: 3000)<br/>Session: default"]
        end
    end

    Browser -->|"HTTP Request (Port 3000)"| NextApp
    Browser -->|"API Calls via CORS (Port 3002)"| NestApp
    NextApp -->|"SSR / Server Action API Fetch"| NestApp
    NestApp -->|"Prisma Client TCP (Port 5432)"| Postgres
    NestApp -->|"BullMQ & Cache (Port 6379)"| Redis
    NestApp -->|"HTTP Client (Port 3000/WAHA)"| WAHA
    WAHA -->|"Webhook Callback (POST /webhooks/waha)"| NestApp
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
│   ├── guards/                 # JwtAuthGuard, RolesGuard
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

---

## 3. Diagram Alur Transaksi Utama (Sequence Diagrams)

### 3.1 Alur Checkout Tamu & Verifikasi Transfer Manual Anti-Scam

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
    API->>DB: BEGIN Transaction: Lock Slot (Date + Time + Location)
    DB-->>API: Slot Tersedia & Transaksi Berhasil
    API->>DB: INSERT Booking (Status: PENDING_VERIFICATION)
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

### 3.2 Alur State Machine Jendela Layanan 24 Jam Anti-Ban (Mini CRM)

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

## 4. Pola Antrian Latar Belakang (Asynchronous Worker Queue)

Untuk menjaga latensi HTTP API tetap di bawah 100ms, seluruh pekerjaan berat (*heavy I/O*) didelegasikan ke **BullMQ** dengan Redis sebagai broker:

```mermaid
flowchart LR
    subgraph Producers ["API HTTP Controllers"]
        P1["VerifyPaymentController"]
        P2["BookingController"]
        P3["CrmBroadcastController"]
    end

    subgraph Redis_Queue ["Redis 7 (dev-redis)"]
        Q1[("Queue: notifications-wa")]
        Q2[("Queue: notifications-email")]
        Q3[("Queue: pdf-generators")]
    end

    subgraph Consumers ["NestJS Background Workers"]
        W1["WhatsAppNotificationWorker<br/>(Dispatch ke dev-waha)"]
        W2["EmailNotificationWorker<br/>(Dispatch via SMTP)"]
        W3["PdfInvoiceWorker<br/>(Render HTML to PDF Buffer)"]
    end

    P1 -->|Push Job| Q3
    Q3 -->|Buffer Ready| Q1
    Q3 -->|Buffer Ready| Q2
    P2 -->|Push Job| Q1
    P3 -->|Push Job| Q1

    Q1 --> W1
    Q2 --> W2
    Q3 --> W3
```

---

## 5. Pipeline Eksekusi Permintaan (Request Execution Lifecycle)

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

## 6. Standar Format Respons API (Standardized API Envelope)

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
  "timestamp": "2026-09-15T22:30:00.000Z"
}
```

### Respons Gagal (Error):
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Jendela layanan pesan 24 jam telah terkunci. Gunakan template resmi terdaftar untuk menghubungi pelanggan ini.",
  "errorCode": "CRM_24H_WINDOW_EXPIRED",
  "timestamp": "2026-09-15T22:30:00.000Z"
}
```
