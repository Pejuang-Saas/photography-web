# 📄 Product Requirements Document (PRD) — Backend Service
## Photography Web & Studio Management Platform (Kaya Story Semarang)

### Version History
| Versi | Tanggal | Penulis | Deskripsi Perubahan |
| :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-15 | System Architect | Inisialisasi dokumen PRD Backend Service Kaya Story |

- **Status**: Ready for Implementation
- **Tech Stack**: NestJS 11, Prisma ORM 6.x, PostgreSQL 17, Redis 7, WAHA (WhatsApp HTTP API), Docker Compose
- **Monorepo Path**: `apps/api` (Backend) $\leftrightarrow$ `apps/web` (Frontend)

---

## 1. Eksekutif & Latar Belakang Sistem

### 1.1 Ringkasan Produk
**Kaya Story Photography** adalah studio foto wisuda dan potret analog modern terkemuka di Tembalang, Semarang. Saat ini, antarmuka pengguna frontend (`apps/web`) telah memiliki sistem manajemen reservasi studio (*Admin Dashboard*), Mini CRM WhatsApp, alur checkout 4-langkah anti-scam, serta template builder WhatsApp & Email, namun masih beroperasi di atas lapisan data simulasi peramban (*LocalStorage Mock Layer*).

Dokumen ini mendefinisikan seluruh kebutuhan fungsional (*Functional Requirements*) dan non-fungsional (*Non-Functional Requirements*) dari **Backend REST API** (`apps/api`), yang menggantikan data simulasi tersebut menjadi arsitektur backend nyata berbasis *micro-service friendly modular monolith* yang aman, konsisten, dan siap produksi skala tinggi.

### 1.2 Tujuan Utama (Business & Technical Objectives)
1. **Pencegahan Bentrok Jadwal (Zero Double-Booking)**: Mengunci slot waktu sesi studio secara atomik (*atomic transaction*) agar dua pelanggan tidak dapat memesan fotografer atau studio di jam yang sama.
2. **Dual Mode Pembayaran yang Akuntabel**: Mendukung pembayaran instan otomatis via Gateway (QRIS/E-Wallet/Virtual Account) maupun verifikasi manual transfer bank lokal (BCA/Mandiri/BRI) dengan bukti transfer.
3. **Automasi Komunikasi Omnichannel**: Mengirimkan invoice resmi dan notifikasi jadwal secara instan melalui integrasi engine **WAHA (WhatsApp)** dan **SMTP Email**.
4. **Perlindungan Anti-Ban WhatsApp**: Menerapkan aturan kepatuhan jendela layanan pelanggan 24 jam (*24-hour messaging window*) pada modul Mini CRM untuk melindungi nomor WhatsApp studio dari pemblokiran Meta.
5. **Zero Local Overhead**: Seluruh backend, prisma migration, database postgres, dan caching redis berjalan sepenuhnya terisolasi di dalam Docker tanpa mengotori host mesin lokal dengan `node_modules`.

### 1.3 Out of Scope (Di Luar Cakupan v1.0.0)
Fitur-fitur berikut tidak termasuk dalam rilis MVP (v1) ini:
- Aplikasi Mobile Native (iOS / Android).
- Sistem loyalitas pelanggan (Loyalty points, referral codes).
- Multi-studio / Multi-branch management (hanya mendukung 1 lokasi di Tembalang).
- Rekonsiliasi akuntansi otomatis dengan Bank (hanya menggunakan Payment Gateway atau validasi manual).
- AI Auto-editing atau Face Recognition untuk pemilihan foto otomatis.

---

## 2. Peran Pengguna (User Personas & RBAC)

| Peran | Deskripsi Hak Akses & Tanggung Jawab |
| :--- | :--- |
| **Guest / Customer** | Pengunjung umum di Landing Page: melihat katalog paket foto, memilih tanggal & slot waktu yang tersedia, memasukkan biodata wisudawan (Nama, Kampus, Fakultas, No WA, Email), memilih addon, melakukan checkout, dan mengunggah bukti transfer. |
| **Admin / Studio Manager** | Akses penuh dashboard `/admin`: memverifikasi atau menolak bukti transfer, mengubah status booking, mencetak & menerbitkan invoice, mengelola katalog paket dan addon, menandai hari libur studio (*blackout dates*), mengoperasikan Mini CRM, dan mengubah profil/rekening studio. |
| **Lead Photographer** | Akses jadwal kalender: melihat penugasan sesi foto, catatan khusus klien (misal: "bawa kebaya ganti, mau tone analog 35mm"), dan mengunggah link file foto mentah/edit (Google Drive link). |
| **System / Webhook Service** | Layanan latar belakang nir-manusia: menerima webhook pembayaran gateway, menerima webhook pesan masuk dari WAHA, dan menjalankan cron-job pengingat sesi (H-1). |

---

## 3. Kebutuhan Fungsional per Modul (Core Functional Modules)

### 3.1 Modul 1: Autentikasi, Otorisasi, & Manajemen Pengguna
**Overview:** Modul ini menangani keamanan akses sistem, otentikasi admin dan fotografer, serta penerbitan token berbasis standar JWT untuk komunikasi stateless antara frontend dan backend.

- **FR-AUTH-001**: Admin login menggunakan email dan password terenkripsi.
  - **Acceptance Criteria**: Password wajib di-hash menggunakan `bcrypt` dengan salt round minimal 10. Jika email/password salah, sistem mengembalikan status 401 Unauthorized tanpa memberi tahu apakah email terdaftar.
- **FR-AUTH-002**: Menghasilkan JWT Access Token (durasi 15 menit) dan Refresh Token (durasi 7 hari) yang disimpan dengan rotasi token.
  - **Acceptance Criteria**: Setiap login sukses menerbitkan dua token. Endpoint refresh token akan mengeluarkan Access Token baru menggunakan Refresh Token yang valid. Refresh Token dicabut saat logout.
- **FR-AUTH-003**: Guard rute berbasis peran (`@Roles('ADMIN', 'PHOTOGRAPHER')`) untuk rute `/admin/*`.
  - **Acceptance Criteria**: Pengguna dengan peran PHOTOGRAPHER tidak bisa mengakses rute khusus ADMIN. Sistem mengembalikan status 403 Forbidden.
- **FR-AUTH-004**: Profil saat ini (`GET /admin/auth/me`) untuk inisialisasi sesi frontend.
  - **Acceptance Criteria**: Mengembalikan data user login tanpa menyertakan field password.

**Business Constraints**: Sesi aktif maksimal hanya 1 perangkat per admin.
**Integration Points**: Terintegrasi dengan guard/middleware global di seluruh controller backend.

### 3.2 Modul 2: Katalog Paket Layanan & Addon Studio
**Overview:** Mengelola seluruh data layanan, harga, deskripsi, serta ketersediaan add-on yang bisa dipesan pelanggan pada halaman booking.

- **FR-PKG-001**: Menyajikan daftar paket foto aktif untuk landing page publik (`GET /packages`).
  - **Acceptance Criteria**: Mendukung filter kategori (`Solo`, `Squad`, `Family`, `Cinematic`). Hanya menampilkan paket yang `isActive=true`.
- **FR-PKG-002**: Struktur atribut paket detail.
  - **Acceptance Criteria**: Harus memiliki atribut: `price`, `durationMinutes`, `maxPeople`, `editedPhotos`, `allRawIncluded`, `slug`, dan `isActive`.
- **FR-PKG-003**: Pengelolaan Addon Studio.
  - **Acceptance Criteria**: Admin dapat menambah variasi addon beserta harga, dan menonaktifkan addon yang kehabisan stok (seperti Frame Kayu 12R).
- **FR-PKG-004**: CRUD Paket & Addon khusus Admin dengan revalidasi otomatis.
  - **Acceptance Criteria**: Endpoint Admin (POST/PUT/DELETE) harus membersihkan cache Redis terkait katalog (`DEL cache:packages`).

**Business Constraints**: Harga tidak bisa diset di bawah nilai operasional minimum.
**Integration Points**: Diperlukan oleh Modul 3 (Kalkulasi slot berdasarkan durasi) dan Modul 5 (Invoice).

### 3.3 Modul 3: Reservasi, Kalender, & Engine Slot Sesi Studio
**Overview:** Core engine aplikasi yang menangani pendaftaran sesi baru, validasi tanggal ketersediaan, serta pencegahan bentrok jadwal (double-booking).

- **FR-BKG-001 (Kalkulasi Ketersediaan Slot)**: Publik `GET /bookings/availability?date=YYYY-MM-DD`.
  - **Acceptance Criteria**: Menghitung sisa slot dari jam 08:00 - 18:00, mengabaikan slot yang sudah `CONFIRMED` atau `PENDING_VERIFICATION`, mempertimbangkan durasi paket, dan merespons `[]` jika tanggal masuk *Blackout Date*.
- **FR-BKG-002 (Pencegahan Double Booking Atomik)**:
  - **Acceptance Criteria**: Database transaction wajib menggunakan *row-level lock* (`SELECT ... FOR UPDATE`) dan/atau *unique constraint*. Jika slot sudah diambil detik terakhir, kembalikan 409 Conflict.
- **FR-BKG-003 (Penomoran Booking Unik)**:
  - **Acceptance Criteria**: Format kode pemesanan otomatis menjadi `KYA-YYYY-XXX` dan ter-increment dengan benar.
- **FR-BKG-004 (Status Siklus Booking)**:
  - **Acceptance Criteria**: Sistem harus melacak status transaksi: `PENDING_VERIFICATION`, `CONFIRMED`, `COMPLETED`, `CANCELLED`.
- **FR-BKG-005 (Blackout Dates Management)**:
  - **Acceptance Criteria**: Admin bisa menandai rentang tanggal libur, dan slot pada tanggal tersebut seketika hilang dari UI booking.

**Business Constraints**: Jam operasional terbatas, dan satu slot hanya untuk satu fotografer (saat ini sistem single studio).
**Integration Points**: Modul 4 (Pembayaran) dan Notifikasi WAHA.

### 3.4 Modul 4: Dual Payment & Verifikasi Transfer Anti-Scam
**Overview:** Sistem penerimaan pembayaran baik melalui unggahan bukti transfer manual yang diaudit admin, maupun gateway instan.

- **FR-PAY-001 (Mode Pembayaran Dinamis)**:
  - **Acceptance Criteria**: Konfigurasi database dapat mengalihkan antara mode manual dan gateway secara *on-the-fly*.
- **FR-PAY-002 (Kalkulasi Pembayaran)**:
  - **Acceptance Criteria**: Harus menghitung subtotal + addon, dan mengizinkan pelanggan memilih Down Payment (DP) 50% atau Lunas.
- **FR-PAY-003 (Upload Bukti Transfer)**:
  - **Acceptance Criteria**: Endpoint `POST` memeriksa MIME type (`image/jpeg`, `image/png`, `image/webp`), ukuran < 5MB. Mengembalikan status sukses dengan URL berkas ke frontend.
- **FR-PAY-004 (Verifikasi Admin)**:
  - **Acceptance Criteria**: Admin menyetujui, mencatat nominal riil, dan status berubah ke `CONFIRMED`. Otomatis memicu Job Queue untuk Invoicing.
- **FR-PAY-005 (Penolakan Bukti Transfer)**:
  - **Acceptance Criteria**: Jika ditolak, status tetap `PENDING_VERIFICATION`, kolom alasan penolakan diisi, dan webhook WhatsApp dikirim agar user re-upload.

**Business Constraints**: Bukti transfer wajib diunggah dalam tempo 1x24 jam sejak booking dibuat.
**Integration Points**: Terintegrasi ke Modul 3 (ubah status) dan Modul 5 (generate invoice).

### 3.5 Modul 5: Penerbitan Invoice Resmi & Dokumen Digital
**Overview:** Engine penghasil PDF dokumen tagihan legal dan resmi secara background (asynchronous) setelah pembayaran lunas atau DP dibayar.

- **FR-INV-001 (Kode Invoice)**:
  - **Acceptance Criteria**: Saat status berubah ke `CONFIRMED`, sistem otomatis men-*generate* nomor seperti `INV-KYA-2026-083`.
- **FR-INV-002 (Kompilasi PDF)**:
  - **Acceptance Criteria**: Men-generate PDF berisikan rincian pesanan lengkap, header studio, tanda tangan LUNAS/DP, dan disimpan ke storage, mereturn URL permanen.

**Business Constraints**: Dokumen tidak dapat diubah (immutable) setelah digenerate.
**Integration Points**: Worker PDF Generator dan Modul 4 (Pembayaran).

### 3.6 Modul 6: Integrasi WAHA (WhatsApp HTTP API) & Mini CRM Anti-Ban
**Overview:** Menyambungkan backend dengan WhatsApp resmi menggunakan engine WAHA untuk pengiriman notifikasi otomatis dan obrolan 2 arah via admin dashboard.

- **FR-CRM-001 (Status Sesi WAHA)**:
  - **Acceptance Criteria**: Admin UI dapat memonitor status container WAHA (STARTING, SCAN_QR_CODE, dll) secara realtime (via polling/SSE).
- **FR-CRM-002 (Inisialisasi & Scan QR)**:
  - **Acceptance Criteria**: Jika terputus, backend mereturn base64 image dari WAHA ke dashboard untuk dipindai ulang.
- **FR-CRM-003 (Ingestion Webhook Chat Masuk)**:
  - **Acceptance Criteria**: Webhook dari WAHA disimpan ke database, memperbarui flag `lastCustomerMessageAt`.
- **FR-CRM-004 (Proteksi Jendela Layanan 24 Jam Anti-Ban)**:
  - **Acceptance Criteria**: Pesan manual admin (`free-form`) akan diblokir dengan 403 jika `lastCustomerMessageAt` > 24 jam. Hanya API template yang diloloskan.
- **FR-CRM-005 (Kategori & Label Dinamis)**:
  - **Acceptance Criteria**: Chat bisa di-tag sesuai siklus booking pelanggan.

**Business Constraints**: Menghindari pemblokiran WhatsApp dengan kepatuhan meta-policy (24h window).
**Integration Points**: Modul 7 (Template) dan Modul 3 (Sinkronisasi profil pelanggan berdasar no HP).

### 3.7 Modul 7: Template Engine (WhatsApp & Email SMTP)
**Overview:** Modul penampung format dasar pesan broadcast/notifikasi agar admin bisa mengubah bahasa/kalimat tanpa mengubah kode.

- **FR-TPL-001 (Parser Tag Variabel)**:
  - **Acceptance Criteria**: Engine men-*replace* placeholder seperti `{{customerName}}`, `{{timeSlot}}`, `{{invoiceNumber}}` dengan nilai asli pelanggan.
- **FR-TPL-002 (Email SMTP Dispatcher)**:
  - **Acceptance Criteria**: Dapat mengatur dan menguji koneksi SMTP dari dashboard, dan menyimpan log pengiriman email berhasil/gagal.
- **FR-TPL-003**: Pengiriman email/wa via BullMQ Queue.
  - **Acceptance Criteria**: Background worker mengirim pesan + file pdf invoice otomatis dengan rate limiting dan auto-retry jika gagal.

**Business Constraints**: Pesan template WA (ketika >24 jam) harus disesuaikan jika API resmi membutuhkan approval meta (sementara WAHA cukup menggunakan struktur pesan biasa).
**Integration Points**: Seluruh proses notifikasi (Booking Sukses, Ingatkan Pembayaran, Tolak Bukti Transfer).

### 3.8 Modul 8: Profil Studio & Pengaturan Global
**Overview:** Penyimpanan metadata global aplikasi, akun bank studio, dan data presentasional frontend.

- **FR-SET-001**: Menyimpan data profil studio (`nama`, `tagline`, `alamatLengkap`, `whatsappCS`, dll).
  - **Acceptance Criteria**: Bisa diedit oleh admin via API `PUT /settings`.
- **FR-SET-002**: Endpoint publik `GET /studio-profile`.
  - **Acceptance Criteria**: Respons di-cache dan digunakan untuk render frontend footer/navbar.

**Integration Points**: Redis Caching, Frontend SSR.

---

## 4. Aturan Bisnis Khusus (Business Rules)
1. **BR-001 (Booking Lock)**: Sebuah slot waktu diblokir sementara (*soft-lock*) selama 15 menit saat pengguna mencapai halaman checkout untuk mencegah *race condition* dengan pengguna lain. Jika checkout tidak selesai dalam 15 menit, lock dilepas otomatis (via Redis TTL).
2. **BR-002 (Tempo Pembayaran)**: Pemesanan yang masuk dan memilih pembayaran manual akan kedaluwarsa secara otomatis dalam 24 jam jika tidak ada bukti transfer yang diunggah. Cron job/Worker akan mengubah statusnya menjadi `CANCELLED`.
3. **BR-003 (Sisa Pembayaran)**: Jika pelanggan memilih DP 50%, sisa pembayaran wajib diselesaikan di studio secara langsung (Tunai/QRIS) pada hari-H pemotretan.
4. **BR-004 (Aturan 24-Jam WA)**: Admin tidak dapat mengirimkan balasan ketik bebas (*free-form*) kepada nomor yang tidak membalas atau chatnya terakhir kali lewat dari 24 jam, guna menjaga keamanan nomor WA dari ban.

---

## 5. Katalog Kode Kesalahan (Error Codes Table)
Sistem menggunakan penomoran error spesifik yang dapat dilacak di frontend:

| HTTP Status | Error Code | Deskripsi Skenario |
| :--- | :--- | :--- |
| `409` | `SLOT_UNAVAILABLE` | Pelanggan mencoba booking di slot waktu yang sudah dipesan. |
| `409` | `LOCK_TIMEOUT` | Gagal mendapatkan *row-level lock* database dalam waktu yang ditentukan. |
| `400` | `PAYMENT_PROOF_INVALID` | Berkas unggahan bukan gambar atau ukurannya melampaui batas (5MB). |
| `400` | `BOOKING_EXPIRED` | Pelanggan mencoba mengunggah bukti bayar pada pesanan yang telah kedaluwarsa. |
| `403` | `WAHA_WINDOW_LOCKED` | Admin mencoba mengirim pesan non-template >24 jam sejak interaksi terakhir pelanggan. |
| `422` | `INVALID_TRANSITION` | Admin mencoba memindahkan status booking yang dilarang (misal dari `COMPLETED` ke `PENDING_VERIFICATION`). |
| `404` | `BOOKING_NOT_FOUND` | ID / Kode pemesanan tidak ada di database. |
| `401` | `UNAUTHORIZED_ACCESS` | Token JWT tidak ada, kadaluwarsa, atau tidak valid. |

---

## 6. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 6.1 Performa & Skalabilitas
- **NFR-PERF-001**: Waktu respons P95 untuk endpoint read (`GET /packages`, `GET /bookings/availability`) wajib di bawah 100ms menggunakan bantuan cache Redis.
- **NFR-PERF-002**: Pengiriman WhatsApp dan perenderan PDF Invoice wajib didelegasikan ke *Background Worker Queue* (BullMQ + Redis) agar tidak memblokir thread HTTP utama.

### 6.2 Keamanan (Security)
- **NFR-SEC-001**: Proteksi Cross-Origin Resource Sharing (CORS) hanya menerima origin yang didefinisikan pada environment variable `WEB_URL`.
- **NFR-SEC-002**: Global Rate Limiting menggunakan `nestjs-throttler` (maksimal 60 request/menit untuk API publik, dan 5 request/menit untuk upload bukti transfer).
- **NFR-SEC-003**: Sanitasi input dan proteksi injeksi SQL 100% menggunakan parameter binding Prisma ORM dan DTO validation pipe.

### 6.3 Ketersediaan & Infrastruktur
- **NFR-INFRA-001**: Terhubung ke Docker network bersama `dev-network` memanfaatkan container `dev-postgres` (Port 5432) dan `dev-redis` (Port 6379).
- **NFR-INFRA-002**: Health check endpoint `/health` memvalidasi latensi koneksi aktif ke PostgreSQL dan Redis secara periodik.
- **NFR-INFRA-003**: Tidak ada pembuatan berkas `node_modules` pada host lokal developer.
