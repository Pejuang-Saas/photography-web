# Spesifikasi Teknis: Fitur Dual Payment Mode & Alur Checkout Booking (Frontend Mock)

Dokumen ini adalah panduan spesifikasi teknis dan fungsional untuk tim developer. Dokumen ini menjelaskan **apa saja yang harus dibuat, bagaimana perilaku antarmukanya (UI/UX), serta aturan alur datanya** tanpa membebani dengan potongan kode kaku, sehingga developer memiliki kebebasan implementasi sesuai standar yang disepakati.

---

## 1. Ringkasan & Tujuan Fitur

### 1.1 Latar Belakang
Studio foto Kaya Story membutuhkan sistem fleksibel untuk mengatur metode pembayaran di website:
1. **Mode 1: Payment Gateway (Otomatis)** — Pembayaran otomatis menggunakan penyedia seperti Midtrans atau Xendit. Transaksi langsung terkonfirmasi otomatis saat pembayaran sukses disimulasikan.
2. **Mode 2: Transfer Manual (Konfirmasi Admin)** — Pelanggan mentransfer uang secara manual ke rekening bank atau e-wallet studio, lalu mengunggah foto bukti transfer. Pembayaran wajib diperiksa dan disetujui secara manual oleh admin studio.

### 1.2 Batasan & Lingkup Pengerjaan (Scope)
* **Fokus Penuh Frontend (Client-side)**: Belum menyentuh database atau backend server.
* **Simulasi Interaktif via LocalStorage**: Data pengaturan dan data booking baru disimpan di `localStorage` browser agar pengujian berjalan nyata dan tidak hilang saat halaman di-refresh.
* **Saling Mematikan (*Mutually Exclusive*)**: Hanya ada satu mode yang aktif dalam satu waktu. Jika Mode 1 dipilih, seluruh pengaturan Mode 2 otomatis terkunci/non-aktif, begitu pula sebaliknya.

### 1.3 Keterhubungan dengan Dokumen Spesifikasi Mock Data Layer
Spesifikasi pembayaran ini merupakan subsistem yang terintegrasi langsung dengan:
📄 **Spesifikasi Induk**: [`2026-09-08-unified-mock-data-layer-design.md`](./2026-09-08-unified-mock-data-layer-design.md)

* **Entitas Pengaturan (`kaya_payment_settings`)**: Menyimpan konfigurasi activeMode (GATEWAY vs MANUAL), API Key Midtrans/Xendit, dan daftar rekening manual.
* **Entitas Pemesanan (`kaya_bookings`)**: Transaksi dari checkout modal (baik simulasi gateway maupun transfer manual) otomatis ditambahkan ke entitas ini.
* **Entitas Notifikasi (`kaya_notifications`)**: Setiap kali ada customer yang melakukan booking atau upload bukti transfer manual, notifikasi lonceng admin otomatis terpicu.
* **Entitas Invoice (`kaya_invoices`)**: Ketika admin memverifikasi pembayaran manual, invoice resmi otomatis diterbitkan ke entitas ini.
* **Reset Data (Dev Mode)**: Pengaturan pembayaran dan daftar rekening akan ikut ter-reset ke kondisi awal saat tombol reset di development mode diklik.

---

## 2. Standar Arsitektur: Komponen Global vs Komponen Lokal

Tim developer **wajib mematuhi aturan penempatan komponen** berikut agar struktur proyek tetap bersih dan tidak terjadi duplikasi:

### 2.1 Kapan Harus Menjadi Komponen Global? (`components/` atau `components/ui/`)
Komponen yang dibuat **harus menjadi komponen global** jika:
* Digunakan di lebih dari satu halaman (reusable).
* Tidak membawa logika bisnis khusus studio foto (bersifat umum).

**Daftar Komponen Global yang Harus Digunakan/Dibuat**:
* **Tombol (`Button`)**: Komponen tombol standar dengan varian warna dan ukuran yang konsisten.
* **Input Teks (`Input`)**: Field input seragam untuk teks, email, password, dan nomor telepon.
* **Modal Dialog (`Dialog` / `Modal`)**: Struktur dasar popup (backdrop gelap, kotak konten di tengah layar, tombol close).
* **Badge Status (`Badge`)**: Label berwarna untuk menandai status (contoh: status Lunas, Menunggu Verifikasi, DP).
* **Pemilih Tanggal (`Calendar` / `DatePicker`)**: Komponen kalender interaktif untuk memilih tanggal sesi foto.
* **Pratinjau Gambar (`ImagePreviewModal`)**: Popup global untuk memperbesar gambar foto (misal: saat admin mengklik bukti transfer).

### 2.2 Kapan Harus Menjadi Komponen Lokal?
Komponen **harus menjadi komponen lokal** jika:
* Hanya dipakai di halaman tersebut saja (spesifik fitur).
* Mengandung logika bisnis yang unik untuk alur halaman tersebut.

**Daftar Komponen Lokal yang Harus Dibuat**:
* **Di Folder Admin (`app/admin/settings/components/` & `app/admin/components/`)**:
  - `PaymentSettingsCard`: Kartu utama pengaturan metode pembayaran di halaman Settings.
  - `GatewayConfigForm`: Formulir khusus konfigurasi API Key Midtrans / Xendit.
  - `ManualAccountsManager`: Bagian pengelola daftar rekening bank/e-wallet studio.
  - `ManualAccountDialog`: Modal popup untuk menambah atau mengedit rekening studio.
  - `BookingDetailModal` *(update)*: Modal detail booking yang menampilkan struk transfer dan tombol aksi verifikasi/tolak.
* **Di Folder Pengunjung (`app/components/booking/`)**:
  - `BookingMultiStepModal`: Kontainer modal pemesanan di landing page.
  - `StepCustomerSchedule`: Tampilan langkah 1 (input data diri dan jadwal sesi).
  - `StepOrderPreview`: Tampilan langkah 2 (Preview Order Booking resmi, pilihan DP 50% vs Lunas, serta kartu sinyal anti-scam: alamat fisik studio Semarang, link IG resmi, dan garansi reschedule).
  - `StepGatewayPayment`: Tampilan langkah 3A (simulasi popup payment gateway).
  - `StepManualPayment`: Tampilan langkah 3B (informasi rekening BCA studio, salin nomor rekening, dan form upload bukti struk).
  - `StepBookingSuccess`: Tampilan langkah 4 (layar sukses, kode booking resmi, dan tombol konfirmasi langsung ke WhatsApp CS 1-klik).

---

## 3. Gambaran Kebutuhan Data (Data Model)

Meskipun tanpa database, developer perlu menyepakati struktur data yang disimpan di `localStorage`:

### 3.1 Data Pengaturan Pembayaran Studio
Disimpan dengan key `kaya_payment_settings`, berisi:
* **Mode Aktif**: Menandai apakah studio sedang memakai mode `GATEWAY` atau `MANUAL`.
* **Izin Down Payment (DP)**: Boolean untuk mengizinkan customer memilih bayar DP 50% (default: aktif).
* **Konfigurasi Gateway**:
  - Pilihan provider: `MIDTRANS` atau `XENDIT`.
  - Pilihan environment: `SANDBOX` / `TEST` atau `PRODUCTION` / `LIVE`.
  - Field untuk Midtrans: Merchant ID, Client Key, Server Key.
  - Field untuk Xendit: Public Key, Secret Key.
* **Daftar Rekening Manual**:
  - Koleksi daftar rekening studio.
  - Setiap rekening memiliki info: Nama Bank/E-Wallet (BCA, Mandiri, QRIS, GoPay, dll.), Nomor Rekening / No. HP, Nama Pemilik Rekening (a.n.), status aktif/nonaktif, dan penanda rekening utama.

### 3.2 Data Transaksi Booking Customer
Disimpan dengan key `kaya_bookings`, terhubung dengan daftar booking di admin:
* Informasi Pelanggan: Nama lengkap, nomor WhatsApp, email, dan catatan khusus.
* Informasi Sesi: Paket yang dipilih, tanggal pemotretan, dan slot jam yang dipilih.
* Informasi Keuangan:
  - Total harga paket.
  - Jenis pembayaran yang dipilih: `DP 50%` atau `Lunas 100%`.
  - Nominal yang harus/telah dibayar.
* Status Transaksi:
  - **Status Sesi**: `PENDING_VERIFICATION` (khusus manual) atau `CONFIRMED` (resmi terjadwal).
  - **Status Pembayaran**:
    - `PAID_FULL` : Lunas 100%.
    - `PAID_DP` : Sudah bayar uang muka (DP 50%).
    - `WAITING_CONFIRMATION` : Khusus manual, customer sudah upload struk dan menunggu admin.
    - `REJECTED` : Khusus manual, bukti transfer ditolak oleh admin.
* Informasi Khusus Manual Transfer:
  - Nama pemilik rekening pengirim.
  - Foto bukti transfer (disimpan sebagai data gambar base64 atau URL string preview).
  - Catatan penolakan (jika ditolak oleh admin).

---

## 4. Spesifikasi Halaman Admin (`/admin/settings` & `/admin/bookings`)

### 4.1 Pengaturan Metode Pembayaran: Sub-Menu `metode-pembayaran` (`/admin/settings`)

> 🌟 **HIGHLIGHT PENEMPATAN SUB-MENU**: Seluruh formulir pengaturan pembayaran di bawah ini ditempatkan secara khusus pada **Menu Settings -> Sub-Menu "Metode Pembayaran"** (pada layout navigasi 2 kolom halaman pengaturan). Hal ini memastikan halaman tidak bercampur baur dengan pengaturan profil studio atau WhatsApp.

#### Perilaku Antarmuka (UI Behavior):
1. **Pilihan Mode Utama (Switcher / Radio Eksklusif)**:
   - Admin disuguhkan 2 kartu/opsi utama:
     - **Opsi 1: Payment Gateway (Otomatis)**
     - **Opsi 2: Transfer Manual (Verifikasi Admin)**
   - **Aturan Saling Mematikan**: Saat admin memilih salah satu mode, area form mode lainnya **wajib menjadi non-aktif** (tampilan dibuat redup/abu-abu dan input di dalamnya terkunci tidak bisa diklik).
   - Terdapat label status yang jelas di masing-masing opsi: label hijau *"Aktif"* untuk mode terpilih, dan label abu-abu *"Non-Aktif"* untuk mode yang mati.

2. **Isi Form Opsi 1 (Payment Gateway)**:
   - **Dropdown Provider**: Admin bisa memilih antara **Midtrans** atau **Xendit**.
   - **Radio Pilihan Mode**: Pilihan antara mode simulasi (**Sandbox / Test**) atau mode nyata (**Production / Live**).
   - **Formulir Kunci API Dinamis**:
     - Jika Midtrans dipilih: Tampilkan input **Merchant ID**, **Client Key**, dan **Server Key**.
     - Jika Xendit dipilih: Tampilkan input **Public Key** dan **Secret Key**.
     - Khusus field secret/server key, sediakan ikon mata untuk menyembunyikan atau melihat teks kunci API.
   - **Tombol Simpan**: Menyimpan pengaturan ke local storage dan memunculkan toast notifikasi sukses.

3. **Isi Form Opsi 2 (Transfer Manual)**:
   - **Daftar Rekening Tersimpan**: Menampilkan kartu-kartu rekening studio yang sudah didaftarkan (misal: BCA, Mandiri, QRIS Studio).
   - Setiap kartu menampilkan: Nama Bank, Nomor Rekening, Nama Pemilik, badge Rekening Utama, dan toggle On/Off untuk mengaktifkan/menonaktifkan rekening tersebut.
   - **Aksi Kelola Rekening**:
     - Tombol *"Tambah Rekening Baru"*: Membuka popup dialog untuk memasukkan nama bank, nomor rekening, atas nama, dan opsi jadikan rekening utama.
     - Tombol untuk mengubah (edit) dan menghapus rekening.
   - **Tombol Simpan**: Menyimpan daftar rekening ke local storage.

---

### 4.2 Verifikasi Pembayaran Manual (`/admin/bookings`)

#### Perilaku Antarmuka:
1. **Pembedaan Visual Daftar Booking**:
   - Jika booking berasal dari **Payment Gateway**: Badge pembayaran berwarna hijau (`Lunas` atau `DP 50%`) dengan keterangan provider. Baris ini tidak memerlukan tombol verifikasi manual karena sudah otomatis valid.
   - Jika booking berasal dari **Transfer Manual**: Badge pembayaran berwarna kuning/oranye (`Menunggu Verifikasi`). Tampilkan tombol sorotan khusus: *"Periksa Bukti Bayar"*.

2. **Modal Detail & Verifikasi Pembayaran (`BookingDetailModal`)**:
   Ketika admin mengklik booking yang menunggu verifikasi:
   - **Bagian Tinjauan Bukti Bayar**:
     - Menampilkan nama rekening pengirim dan bank tujuan yang dipilih customer.
     - Menampilkan foto struk transfer yang diunggah customer. Jika foto diklik, gambar membesar di layar penuh (*Image Preview Modal*).
   - **Pilihan Verifikasi**:
     - Pilihan radio apakah diverifikasi sebagai DP 50% atau Pelunasan Penuh.
     - Field nominal uang yang diterima.
   - **Aksi Keputusan Admin**:
     - **Tombol "Verifikasi Pembayaran" (Warna Hijau)**:
       - Mengubah status sesi menjadi `CONFIRMED`.
       - Mengubah status pembayaran menjadi `PAID_FULL` atau `PAID_DP`.
       - Menerbitkan nomor invoice resmi secara otomatis.
       - Menampilkan notifikasi toast bahwa invoice telah dikonfirmasi dan terkirim ke customer.
     - **Tombol "Tolak Pembayaran" (Warna Merah)**:
       - Membuka kolom isian alasan penolakan (misal: nominal transfer kurang atau bukti tidak terbaca).
       - Mengubah status pembayaran menjadi `REJECTED`.
       - Menampilkan notifikasi bahwa pembayaran ditolak.

---

## 5. Spesifikasi Sisi Pengunjung (Landing Page Modal Multi-Step)

### 5.1 Pemicu Modal Pemesanan
Pada setiap kartu paket di landing page (`PackageCard`), tombol *"Pilih Paket"* tidak lagi langsung membuka link WhatsApp, melainkan membuka **Modal Checkout Pemesanan Bertahap**.

### 5.2 Alur 4 Langkah Checkout Modal

#### **Langkah 1: Formulir Data Diri & Jadwal Sesi**
* **Elemen yang Harus Ada**:
  - Input teks: Nama Lengkap pemesan.
  - Input nomor telepon: Nomor WhatsApp aktif.
  - Input email: Alamat email untuk pengiriman konfirmasi invoice.
  - Kalender interaktif: Memilih tanggal sesi foto (tanggal yang sudah lewat wajib tidak bisa dipilih).
  - Pilihan slot jam: Tombol opsi waktu (misal: 09:00, 11:00, 13:00, 15:00, 17:00).
  - Catatan tambahan (opsional): Area teks untuk pesan khusus dari pemesan.
* **Perilaku**: Tombol *"Lanjut ke Pembayaran"* hanya aktif jika semua data wajib terisi dengan benar.

---

#### **Langkah 2: Preview Order Booking & Sinyal Kepercayaan (Anti-Scam)**
Langkah ini dirancang khusus agar customer merasa aman dan percaya bahwa studio ini resmi dan kredibel sebelum melakukan transaksi:
* **Tampilan Slip Ringkasan Pesanan**:
  - Nama paket yang dipilih beserta daftar fasilitasnya.
  - Tanggal dan slot jam sesi pemotretan yang terkunci.
  - Data diri pemesan (Nama dan Nomor WhatsApp).
* **Pilihan Skema Pembayaran**:
  - Opsi A: **Bayar DP 50%** — Menampilkan nominal uang muka dengan catatan sisa pelunasan dibayar di studio pada hari-H pemotretan.
  - Opsi B: **Bayar Lunas 100%** — Membayar penuh total biaya paket di awal.
* **Elemen Penguat Kepercayaan (Anti-Scam Signals Tanpa QRIS)**:
  - 🏠 **Alamat Fisik Studio**: Menampilkan lokasi fisik studio: *"Studio Kayastory: Jl. Tirto Agung No. 12, Tembalang, Semarang (dapat dikunjungi langsung)"*.
  - 📸 **Instagram Resmi**: Tautan profil Instagram resmi `@kayastory.id` agar pelanggan dapat memeriksa portofolio foto klien asli.
  - 🛡️ **Badge Jaminan Studio**:
    - *"100% Garansi Slot Jadwal Terkunci"*.
    - *"Bebas Reschedule / Ganti Jadwal (maksimal H-3 sesi)"*.
    - *"Garansi Uang Kembali jika sesi dibatalkan oleh pihak studio"*.
* **Perilaku**: Pelanggan meninjau seluruh data dengan tenang, lalu menekan tombol *"Lanjut ke Pembayaran ->"*.

---

#### **Langkah 3: Eksekusi Pembayaran (Bercabang Sesuai Mode di Admin)**
Sistem memeriksa mode pembayaran apa yang saat itu sedang aktif di pengaturan admin:

##### **Jika Mode 1 (Payment Gateway) yang Aktif**:
* Tampilkan dialog simulasi antarmuka Payment Gateway (mirip pop-up Midtrans Snap atau invoice Xendit).
* Tampilkan ringkasan nominal dan pilihan mock metode (Virtual Account BCA/Mandiri, Kartu Kredit).
* **Kebutuhan Khusus Pengujian Frontend**:
  - Sediakan tombol hijau **[Simulasikan Bayar Berhasil]**: Begitu diklik, sistem langsung mencatat booking ke local storage dengan status `CONFIRMED` dan pembayaran otomatis lunas/DP, lalu langsung melangkah ke Langkah 4 (Sukses).
  - Sediakan tombol merah **[Simulasikan Gagal / Batal]**: Memberikan pesan kesalahan simulasi dan memberi kesempatan untuk mencoba bayar lagi.

##### **Jika Mode 2 (Transfer Manual) yang Aktif**:
* **Kartu Rekening Bank Studio**:
  - Bank BCA: `8030-8819-20` atas nama **Bima Satria (Studio Owner & Lead Photographer)**.
  - Tombol praktis: **"Salin Nomor Rekening"** (dengan animasi toast feedback saat nomor berhasil disalin).
* Menampilkan nominal pasti yang wajib ditransfer (DP 50% atau Lunas).
* **Formulir Konfirmasi Bukti**:
  - Input teks: `Nama Pemilik Rekening Pengirim` (nama yang tertera di mutasi bank customer).
  - Input file: `Unggah Bukti Struk Transfer` (menerima file foto .jpg, .png, .webp).
  - **Area Preview Gambar**: Begitu file dipilih, foto struk langsung tampil di layar agar customer yakin bukti yang diunggah sudah benar.
* **Perilaku**: Saat tombol *"Kirim Bukti Pembayaran"* diklik, booking disimpan ke local storage dengan status `PENDING_VERIFICATION` dan pembayaran `WAITING_CONFIRMATION`, lalu melangkah ke Langkah 4.

---

#### **Langkah 4: Layar Sukses & Konfirmasi WhatsApp CS 1-Klik**
* **Elemen yang Harus Ada**:
  - Animasi centang sukses dan **Nomor Kode Booking Resmi** (contoh: `#KYA-2026-904`).
  - **Pesan Status Berbeda Sesuai Metode**:
    - *Jika via Gateway*: Tampilkan pesan sukses bahwa jadwal sesi foto sudah resmi terkonfirmasi otomatis, disertai tombol melihat invoice dan link WhatsApp studio.
    - *Jika via Manual*: Tampilkan pesan bahwa bukti transfer telah diterima dan sedang menunggu verifikasi admin studio dalam 1x24 jam.
* **Tombol Aksi Utama (Penghilang Ragu Customer)**:
  - **Tombol Hijau "Konfirmasi Cepat ke WhatsApp CS Studio"**:
    - Langsung membuka chat WhatsApp resmi studio dengan pesan template otomatis yang sudah memuat:
      > *"Halo Admin Kayastory! Saya sudah transfer untuk Booking #[KODE_BOOKING] a.n. [NAMA_CUSTOMER] sebesar [NOMINAL]. Mohon bantu verifikasinya ya kak, ini bukti transfernya. Terima kasih! 📸"*
    - Memberikan rasa aman maksimal karena customer langsung terhubung dengan admin manusia secara personal.
  - Tombol sekunder: *"Tutup dan Kembali ke Beranda"*.

---

## 6. Aturan Validasi & Penanganan Error

Untuk memastikan kualitas form dan mencegah error crash:

1. **Validasi Input Pengunjung**:
   - Nama pemesan minimal 3 huruf.
   - Nomor WhatsApp harus angka dan berjumlah antara 10 hingga 14 digit.
   - Format penulisan email harus benar (memiliki tanda `@` dan domain yang tepat).
   - Tanggal sesi foto tidak boleh memilih tanggal masa lalu.
   - Jam sesi foto wajib dipilih salah satu.
   - Bukti transfer manual harus berformat file gambar dengan ukuran maksimal 5MB.

2. **Penanganan Data LocalStorage**:
   - Selalu gunakan penanganan *try-catch* saat membaca data dari `localStorage`.
   - Jika `localStorage` dalam keadaan kosong (pertama kali dibuka), aplikasi tidak boleh error, melainkan harus menggunakan nilai default data mock awal yang sudah disiapkan.

---

## 7. Panduan Pengujian Mandiri untuk Developer (Testing Guide)

Developer yang mengerjakan fitur ini dapat menguji hasil kerjanya dengan 2 alur pengujian berikut:

### Pengujian 1: Alur Payment Gateway (Otomatis)
1. Masuk ke halaman `/admin/settings`.
2. Aktifkan **Mode 1: Payment Gateway**, pilih provider Midtrans (Sandbox), lalu klik simpan. Pastikan form Mode 2 menjadi non-aktif/redup.
3. Buka tab baru di halaman landing page `/`, klik tombol **Pilih Paket** pada salah satu paket foto.
4. Lengkapi formulir data diri dan pilih jadwal $\rightarrow$ Pilih opsi **Bayar DP 50%** $\rightarrow$ Klik lanjut bayar.
5. Pastikan yang muncul adalah popup simulasi Payment Gateway. Klik tombol **[Simulasikan Bayar Berhasil]**.
6. Pastikan muncul layar sukses dengan nomor booking.
7. Buka tab `/admin/bookings`: Pastikan booking baru langsung masuk di posisi teratas dengan badge hijau **PAID_DP** dan status **CONFIRMED** tanpa perlu diverifikasi manual.

### Pengujian 2: Alur Transfer Manual & Verifikasi Admin
1. Di halaman `/admin/settings`, ubah mode ke **Mode 2: Transfer Manual**. Pastikan form Mode 1 menjadi non-aktif/redup.
2. Buka landing page `/`, pesan paket $\rightarrow$ Pilih opsi **Bayar Lunas 100%**.
3. Di langkah pembayaran, pastikan nomor rekening studio tampil dengan benar.
4. Isi nama pengirim dan pilih foto struk transfer. Pastikan pratinjau foto struk langsung terlihat.
5. Klik **Kirim Bukti Pembayaran** dan pastikan muncul layar sukses dengan pesan "Menunggu verifikasi admin".
6. Buka tab `/admin/bookings`:
   - Pastikan booking baru masuk dengan badge kuning **Menunggu Verifikasi**.
   - Buka modal detail booking tersebut dan periksa apakah foto struk transfer tampil dengan jelas.
   - Klik tombol **Verifikasi Pembayaran**.
   - Pastikan status booking seketika berubah menjadi hijau **LUNAS (CONFIRMED)** dan nomor invoice terbit.

---

## 8. Checklist Pengerjaan Developer

- [ ] Siapkan model data pengaturan pembayaran dan booking (disimpan di `localStorage`).
- [ ] Buat komponen global yang dibutuhkan jika belum ada (`Calendar`, `ImagePreviewModal`, dll.).
- [ ] Buat kartu pengaturan pembayaran di `/admin/settings` dengan toggle eksklusif (Mode Gateway vs Manual).
- [ ] Lengkapi form pengaturan Midtrans/Xendit dan pengelola rekening studio di admin.
- [ ] Sesuaikan modal detail booking di `/admin/bookings` agar memiliki penampil struk transfer dan tombol verifikasi/tolak.
- [ ] Buat modal pemesanan bertahap (`BookingMultiStepModal`) di sisi pengunjung (Langkah 1 sampai Langkah 4).
- [ ] Sambungkan tombol "Pilih Paket" di landing page agar membuka modal pemesanan.
- [ ] Jalankan kedua skenario pengujian mandiri untuk memastikan alur berfungsi lancar dari sisi pengunjung hingga admin.
