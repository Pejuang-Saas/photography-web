# 📄 Product Requirements Document (PRD) — Backend Service
## Photography Web & Studio Management Platform (Kaya Story Semarang)

- **Versi**: 1.0.0
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
- **FR-AUTH-001**: Admin login menggunakan email dan password terenkripsi (`bcrypt` dengan salt round minimal 10).
- **FR-AUTH-002**: Menghasilkan JWT Access Token (durasi 15 menit) dan Refresh Token (durasi 7 hari) yang disimpan dengan rotasi token pada database/Redis.
- **FR-AUTH-003**: Guard rute berbasis peran (`@Roles('ADMIN', 'PHOTOGRAPHER')`) untuk seluruh endpoint yang berada di bawah prefix `/admin/*`.
- **FR-AUTH-004**: Profil admin saat ini (`GET /admin/auth/me`) untuk inisialisasi sesi frontend.

### 3.2 Modul 2: Katalog Paket Layanan & Addon Studio
Sesuai dengan data `INITIAL_PACKAGES` pada `apps/web/lib/mock-data.ts`:
- **FR-PKG-001**: Menyajikan daftar paket foto aktif untuk landing page publik (`GET /packages`) dengan kategori:
  - `Solo` (misal: Solo Kebaya Signature)
  - `Squad` (misal: Duo Bestie Graduation, Squad Circle 4-6 Orang)
  - `Family` (misal: Family Heritage Portrait)
  - `Cinematic` (misal: 35mm Analog Film Experience)
- **FR-PKG-002**: Setiap paket memiliki atribut: `price`, `durationMinutes`, `maxPeople`, `editedPhotos`, `allRawIncluded` (boolean), `slug`, dan `isActive`.
- **FR-PKG-003**: Pengelolaan Addon Studio (Frame Kayu 12R, Express Edit 24 Jam, Extra 5 Edited Photos, Album Eksklusif Kulit) dengan harga dinamis.
- **FR-PKG-004**: CRUD Paket & Addon khusus Admin dengan revalidasi otomatis ke katalog publik.

### 3.3 Modul 3: Reservasi, Kalender, & Engine Slot Sesi Studio
- **FR-BKG-001 (Kalkulasi Ketersediaan Slot)**: Endpoint publik `GET /bookings/availability?date=YYYY-MM-DD` menghitung ketersediaan slot jam operasional (08:00 - 18:00) berdasarkan:
  - Durasi paket yang dipilih.
  - Sesi booking yang sudah berstatus `CONFIRMED` atau `PENDING_VERIFICATION`.
  - Daftar hari/jam libur studio (*Blackout Dates*).
- **FR-BKG-002 (Pencegahan Double Booking Atomik)**: Saat pelanggan melakukan submit booking (`POST /bookings`), backend membuka transaksi database (`prisma.$transaction`) dengan row-level lock atau constraint unik `[sessionDate, timeSlot, location]` untuk mencegah race condition.
- **FR-BKG-003 (Penomoran Booking Unik)**: Format kode pemesanan terstandarisasi: `KYA-YYYY-XXX` (misal: `KYA-2026-081`).
- **FR-BKG-004 (Status Siklus Booking)**:
  - `PENDING_VERIFICATION`: Pelanggan sudah checkout dan mengunggah bukti bayar, menunggu aksi admin.
  - `CONFIRMED`: Pembayaran terverifikasi, jadwal terkunci, invoice terbit.
  - `COMPLETED`: Sesi pemotretan dan penyerahan file foto telah selesai.
  - `CANCELLED`: Dibatalkan oleh pelanggan atau kedaluwarsa tanpa bukti bayar.
- **FR-BKG-005 (Blackout Dates Management)**: Admin dapat menambahkan penanda libur studio (misal: Idul Fitri, Renovasi Studio, Libur Tahun Baru) yang otomatis menutup seluruh ketersediaan slot di tanggal tersebut.

### 3.4 Modul 4: Dual Payment & Verifikasi Transfer Anti-Scam
Mengacu langsung pada spesifikasi frontend `apps/web/docs/superpowers/specs/2026-09-08-dual-payment-mode-design.md`:
- **FR-PAY-001 (Mode Pembayaran Dinamis)**: Sistem mendukung 2 mode yang dapat diaktifkan/dinonaktifkan admin:
  1. *Mode Manual*: Transfer Bank BCA, Mandiri, BRI, BSI, atau Static QRIS.
  2. *Mode Otomatis (Gateway)*: Midtrans / Xendit (Virtual Account, Gopay, ShopeePay, QRIS Dinamis).
- **FR-PAY-002 (Kalkulasi Pembayaran)**: Mendukung pembayaran bertahap (Down Payment / DP minimal 50% atau Lunas 100%).
- **FR-PAY-003 (Upload Bukti Transfer)**: Endpoint `POST /bookings/:id/payment-proof` menerima berkas gambar (JPG, PNG, WebP maksimal 5MB), memvalidasi signature file (anti-malware), dan menyimpannya ke penyimpanan terproteksi.
- **FR-PAY-004 (Verifikasi Admin)**: Admin dapat menyetujui (`POST /admin/bookings/:id/verify-payment`) dengan mencantumkan nominal riil yang masuk ke rekening mutasi bank dan memilih status (`PAID_DP` atau `PAID_FULL`).
- **FR-PAY-005 (Penolakan Bukti Transfer)**: Admin dapat menolak bukti transfer palsu/buram (`POST /admin/bookings/:id/reject-payment`) dengan alasan wajib (*rejection reason*). Sistem otomatis memicu pesan WhatsApp ke pelanggan agar mengunggah ulang bukti transfer yang benar.

### 3.5 Modul 5: Penerbitan Invoice Resmi & Dokumen Digital
- **FR-INV-001**: Terbit otomatis ketika booking dinyatakan `CONFIRMED` dengan kode penomoran resmi: `INV-KYA-YYYY-XXX` (contoh: `INV-KYA-2026-083`).
- **FR-INV-002**: Kompilasi dokumen PDF Invoice beresolusi tinggi memuat:
  - Header Logo Kaya Story Studio Tembalang & Alamat Fisik.
  - Detail Wisudawan: Nama, No WA, Email, Universitas & Fakultas.
  - Rincian Paket, Addon, Durasi Sesi, dan Tanggal/Jam Pemotretan.
  - Rincian Keuangan: Subtotal, Diskon, Total Bayar, Nominal Terbayar, dan Sisa Tagihan (jika DP).
  - Tanda tangan digital / stempel stiker "LUNAS" / "DP DITERIMA".

### 3.6 Modul 6: Integrasi WAHA (WhatsApp HTTP API) & Mini CRM Anti-Ban
Mengacu langsung pada spesifikasi `apps/web/docs/superpowers/specs/2026-09-08-waha-mini-crm-design.md`:
- **FR-CRM-001 (Status Sesi WAHA)**: Endpoint `GET /admin/waha/status` memonitor status container `dev-waha`: `STARTING`, `SCAN_QR_CODE`, `WORKING`, `FAILED`, `STOPPED`.
- **FR-CRM-002 (Inisialisasi & Scan QR)**: Menyediakan QR Code visual untuk proses pairing WhatsApp Web studio.
- **FR-CRM-003 (Ingestion Webhook Chat Masuk)**: Endpoint `POST /webhooks/waha` menerima payload obrolan pelanggan, menyinkronkan data kontak dengan pemesanan pelanggan berdasarkan nomor telepon (`customerPhone`), dan mencatat timestamp pesan terakhir pelanggan (`lastCustomerMessageAt`).
- **FR-CRM-004 (Proteksi Jendela Layanan 24 Jam Anti-Ban)**:
  - *Jendela Aktif ($\le 24$ Jam sejak chat masuk terakhir)*: Admin bebas mengirim pesan teks interaktif apa pun (*free-form text*).
  - *Jendela Terkunci ($> 24$ Jam)*: Backend menolak pengiriman pesan bebas. Admin hanya diperbolehkan mengirim pesan yang menggunakan **Template Resmi Terdaftar** (misal template pengingat H-1 atau invoice resmi) demi mencegah nomor WhatsApp studio di-banned oleh sistem meta anti-spam.
- **FR-CRM-005 (Kategori & Label Dinamis)**: Setiap chat dapat diberi tag: `Prospek Baru`, `Menunggu Transfer`, `Jadwal Dekat`, `Selesai Foto`, `Komplain/Revisi`.

### 3.7 Modul 7: Template Engine (WhatsApp & Email SMTP)
Mengacu pada `2026-09-08-whatsapp-template-builder-design.md` dan `2026-09-08-email-smtp-and-template-builder-design.md`:
- **FR-TPL-001 (Parser Tag Variabel)**: Engine parser mengenali dan mengganti tag variabel dinamis berikut:
  - `{{customerName}}`: Nama lengkap pemesan
  - `{{bookingCode}}`: Kode booking studio (contoh: KYA-2026-081)
  - `{{sessionDate}}`: Tanggal pemotretan terformat (contoh: 25 Agustus 2026)
  - `{{timeSlot}}`: Jam sesi (contoh: 09:00 - 10:00 WIB)
  - `{{packageName}}`: Nama paket yang dipilih
  - `{{totalPrice}}`: Total biaya dalam format Rupiah
  - `{{invoiceNumber}}`: Nomor invoice resmi
  - `{{paymentStatus}}`: Status pembayaran (Lunas / DP Rp xxx)
  - `{{location}}`: Lokasi studio / outdoor
  - `{{rejectionReason}}`: Catatan penolakan bukti bayar
- **FR-TPL-002 (Email SMTP Dispatcher)**: Backend mengonfigurasi koneksi SMTP kustom (`host`, `port`, `secure`, `user`, `password`, `fromName`, `fromEmail`) dengan fasilitas tes koneksi (`POST /admin/settings/email/test-connection`).
- **FR-TPL-003**: Pengiriman otomatis email konfirmasi disertai lampiran file PDF Invoice saat pembayaran diverifikasi.

### 3.8 Modul 8: Profil Studio & Pengaturan Global
- **FR-SET-001**: Menyimpan data profil studio (`nama`, `tagline`, `alamatLengkap`, `koordinatMaps`, `whatsappCS`, `instagram`, `nomorRekeningBCA`, `atasNamaBCA`).
- **FR-SET-002**: Endpoint publik `GET /studio-profile` untuk konsumsi dinamis komponen Navbar, Footer, dan Campus Marquee di frontend.

---

## 4. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 4.1 Performa & Skalabilitas
- **NFR-PERF-001**: Waktu respons P95 untuk endpoint read (`GET /packages`, `GET /bookings/availability`) wajib di bawah 100ms menggunakan bantuan cache Redis.
- **NFR-PERF-002**: Pengiriman WhatsApp dan perenderan PDF Invoice wajib didelegasikan ke *Background Worker Queue* (BullMQ + Redis) agar tidak memblokir thread HTTP utama.

### 4.2 Keamanan (Security)
- **NFR-SEC-001**: Proteksi Cross-Origin Resource Sharing (CORS) hanya menerima origin yang didefinisikan pada environment variable `WEB_URL`.
- **NFR-SEC-002**: Global Rate Limiting menggunakan `nestjs-throttler` (maksimal 60 request/menit untuk API publik, dan 5 request/menit untuk upload bukti transfer).
- **NFR-SEC-003**: Sanitasi input dan proteksi injeksi SQL 100% menggunakan parameter binding Prisma ORM dan DTO validation pipe.

### 4.3 Ketersediaan & Infrastruktur
- **NFR-INFRA-001**: Terhubung ke Docker network bersama `dev-network` memanfaatkan container `dev-postgres` (Port 5432) dan `dev-redis` (Port 6379).
- **NFR-INFRA-002**: Health check endpoint `/health` memvalidasi latensi koneksi aktif ke PostgreSQL dan Redis secara periodik.
- **NFR-INFRA-003**: Tidak ada pembuatan berkas `node_modules` pada host lokal developer.
