# Spesifikasi Teknis: Lapisan Mock Data Terpusat & Integrasi Seluruh Aksi Halaman (LocalStorage Data Layer)

Dokumen ini adalah spesifikasi fungsional dan teknis yang menjelaskan **bagaimana seluruh tombol dan aksi di setiap halaman (baik sisi pengunjung maupun admin) terhubung satu sama lain ke dalam satu media penyimpanan lokal (`localStorage`)**. 

Tujuannya adalah menciptakan pengalaman penggunaan yang **100% interaktif dan hidup seolah-olah website sudah memiliki backend dan database sungguhan**, tanpa potongan kode kaku yang membebani developer.

---

## 1. Ringkasan & Prinsip Utama

### 1.1 Objektif Sistem
Setiap aksi yang dilakukan pengguna harus memiliki **efek berantai (*reactive updates*)** ke halaman lainnya:
* Jika pengunjung memesan sesi di Landing Page $\rightarrow$ Notifikasi lonceng di admin bertambah, kalender terisi, metrik omset di dashboard bertambah, dan transaksi masuk ke daftar booking.
* Jika admin menambah atau mengubah harga paket di menu Paket $\rightarrow$ Kartu paket di Landing Page langsung menampilkan harga dan nama baru tersebut.
* Jika admin mengubah nama studio atau alamat di menu Settings $\rightarrow$ Teks di footer dan header Landing Page ikut berubah.
* Jika admin menyetujui pembayaran manual $\rightarrow$ Invoice resmi otomatis terbit di menu Invoices dan status booking menjadi terkonfirmasi.

### 1.2 Aturan Lingkungan (Environment Rules): Tombol Reset Mock Data
* Tombol **"Reset ke Data Awal Pabrik"** disediakan di menu Admin Settings untuk mengembalikan seluruh data ke kondisi awal saat demonstrasi atau pengujian.
* **Syarat Khusus**: Tombol ini **hanya boleh tampil pada mode pengembangan (`development`)**. Jika aplikasi dijalankan di mode produksi (`production`), tombol reset ini wajib disembunyikan agar tidak disalahgunakan oleh pengguna umum.

### 1.3 Keterhubungan Antar Dokumen Spesifikasi
Dokumen ini merupakan arsitektur induk (*Master Data Layer Spec*) yang menjadi pondasi bagi spesifikasi fitur lainnya di aplikasi Kaya Story:
* 📄 **Spesifikasi Subsistem Pembayaran**: [`2026-09-08-dual-payment-mode-design.md`](./2026-09-08-dual-payment-mode-design.md) — Rincian detail konfigurasi Gateway (Midtrans/Xendit), manajemen rekening manual, upload & verifikasi bukti transfer, serta modal booking multi-step di sisi pengunjung.
* 📄 **Spesifikasi Subsistem WAHA & Mini CRM**: [`2026-09-08-waha-mini-crm-design.md`](./2026-09-08-waha-mini-crm-design.md) — Integrasi engine WhatsApp HTTP API (WAHA), pembacaan data chat dari sesi aktif, sistem kategori chat dinamis, serta proteksi anti-ban (24-Hour Messaging Window).
* 📄 **Spesifikasi Template Builder WhatsApp**: [`2026-09-08-whatsapp-template-builder-design.md`](./2026-09-08-whatsapp-template-builder-design.md) — Antarmuka visual penyusunan template pesan WhatsApp, tombol tag variabel dinamis, live smartphone simulator, dan checker kesehatan anti-spam.
* 📄 **Spesifikasi Email SMTP & Template Builder**: [`2026-09-08-email-smtp-and-template-builder-design.md`](./2026-09-08-email-smtp-and-template-builder-design.md) — Konfigurasi server SMTP, pengiriman otomatis invoice resmi ke email customer, serta Email Template Builder modular dengan live responsive preview (Desktop & Mobile).

---

## 2. Standar Arsitektur: Komponen Global vs Komponen Lokal

Untuk menjaga keteraturan kode:
* **Komponen Global (`components/` atau `components/ui/`)**:
  - Modal konfirmasi hapus / peringatan (`ConfirmDialog`).
  - Komponen notifikasi toast (`sonner` toast).
  - Elemen UI dasar: `Button`, `Input`, `Badge`, `Card`, `DropdownMenu`, `Tabs`.
* **Komponen Lokal Halaman**:
  - Komponen form tambah/edit paket (`PackageFormModal.tsx`) ditaruh di folder lokal paket.
  - Komponen dialog blokir tanggal (`BlackoutDateDialog.tsx`) ditaruh di folder lokal kalender.
  - Komponen modal detail invoice (`InvoiceDetailModal.tsx`) ditaruh di folder lokal invoice.

---

## 3. Peta Entitas Data Terpusat (`localStorage`)

Semua data disimpan dalam bentuk kumpulan objek di `localStorage` dengan penamaan kunci yang terstandarisasi:

| Kunci LocalStorage | Nama Entitas | Penjelasan Isi Data |
| :--- | :--- | :--- |
| `kaya_packages` | **Daftar Paket Foto** | Berisi seluruh paket (Solo, Duo, Squad, Family). Menyimpan nama, harga, durasi sesi, kuota foto diedit, fasilitas, dan status aktif/nonaktif. |
| `kaya_bookings` | **Data Pemesanan & Transaksi** | Berisi seluruh riwayat booking customer (nama, WA, email, paket, tanggal, jam, total bayar, status DP/Lunas, status sesi, dan foto bukti bayar). *(Detail alur checkout & verifikasi di [`2026-09-08-dual-payment-mode-design.md`](./2026-09-08-dual-payment-mode-design.md))* |
| `kaya_invoices` | **Daftar Invoice Resmi** | Terbit otomatis saat status booking dinyatakan `CONFIRMED`. Menyimpan nomor invoice, tanggal terbit, nominal, dan riwayat pengiriman WhatsApp. |
| `kaya_studio_profile` | **Profil & Informasi Studio** | Nama studio, alamat fisik di Semarang, nomor kontak WhatsApp, link media sosial, dan jam operasional harian. |
| `kaya_notifications` | **Pusat Notifikasi Admin** | Daftar pemberitahuan masuk (misal: booking baru dari customer, bukti bayar diunggah, dll.) beserta status sudah dibaca atau belum. |
| `kaya_calendar_blocks` | **Jadwal Libur Studio** | Daftar tanggal atau rentang waktu di mana studio tutup/libur (blackout dates) sehingga customer tidak bisa memesan di hari tersebut. |
| `kaya_payment_settings` | **Pengaturan Pembayaran** | Pilihan mode aktif (Payment Gateway vs Transfer Manual), kunci API Midtrans/Xendit, dan daftar rekening bank studio. *(Detail konfigurasi form di [`2026-09-08-dual-payment-mode-design.md`](./2026-09-08-dual-payment-mode-design.md))* |
| `kaya_waha_session` | **Status Sesi Engine WAHA** | Menyimpan status koneksi WhatsApp studio (terputus, memindai QR, terhubung), nomor aktif studio, dan timestamp sesi. *(Detail di [`2026-09-08-waha-mini-crm-design.md`](./2026-09-08-waha-mini-crm-design.md))* |
| `kaya_crm_chats` | **Riwayat Obrolan Mini CRM** | Menyimpan riwayat pesan masuk dan keluar yang dibaca dari sesi aktif, penanda waktu, status pengiriman, serta countdown timer 24-Hour Messaging Window. |
| `kaya_crm_categories` | **Kategori Obrolan Kustom** | Daftar label/kategori percakapan klien yang dapat dibuat dan diatur warnanya oleh admin (misal: Tanya Paket, Booking DP, Lunas, Selesai). |
| `kaya_message_templates` | **Template Pesan WhatsApp** | Koleksi template pesan kustom yang dibuat admin di Template Builder (variabel dinamis, kategori pesan, teks template, dan simulator WhatsApp). *(Detail di [`2026-09-08-whatsapp-template-builder-design.md`](./2026-09-08-whatsapp-template-builder-design.md))* |
| `kaya_email_settings` | **Pengaturan Server SMTP** | Host, port, akun otentikasi pengirim studio, nama pengirim, dan saklar pengiriman invoice otomatis. *(Detail di [`2026-09-08-email-smtp-and-template-builder-design.md`](./2026-09-08-email-smtp-and-template-builder-design.md))* |
| `kaya_email_templates` | **Template Email Responsif** | Koleksi template email berbasis blok modular (invoice resmi, galeri drive foto, pengingat jadwal H-1, promo) yang bisa dirancang admin. |
| `kaya_email_logs` | **Riwayat Pengiriman Email** | Log catatan pengiriman email simulasi ke pelanggan studio. |

---

## 4. Pemetaan Aksi dan Reaksi Berantai per Halaman

### 4.1 Halaman Depan / Pengunjung (Landing Page & Galeri)

#### Aksi 1: Menampilkan Paket Foto Secara Dinamis
* **Perilaku**: Daftar paket di Landing Page tidak boleh di-hardcode lagi. Bagian ini harus membaca langsung data dari `kaya_packages`.
* **Reaksi**: Jika ada paket yang statusnya dinonaktifkan atau diubah harganya oleh admin, tampilan di landing page seketika mengikuti perubahan tersebut.

#### Aksi 2: Pelanggan Menyelesaikan Checkout Booking (4 Langkah Anti-Scam)
* **Alur Checkout Pelanggan**:
  1. **Langkah 1 (Data & Jadwal)**: Input data diri pemesan dan slot tanggal/jam.
  2. **Langkah 2 (Preview Order & Anti-Scam)**: Tinjauan slip resmi rincian booking, pilihan DP 50% vs Lunas, disertai kartu keaslian studio (alamat fisik Semarang, link IG resmi, dan garansi bebas reschedule).
  3. **Langkah 3 (Pembayaran)**: Simulasi Payment Gateway ATAU instruksi transfer BCA & upload bukti struk dengan pratinjau foto.
  4. **Langkah 4 (Sukses & WhatsApp CS)**: Layar sukses dengan kode booking unik serta tombol hijau konfirmasi langsung ke WhatsApp CS studio 1-klik.
* **Efek Berantai di Sisi Admin**:
  - Entitas `kaya_bookings` menerima 1 data booking baru di urutan teratas.
  - Entitas `kaya_notifications` menerima 1 notifikasi baru (contoh: *"Reservasi Baru dari [Nama Pelanggan] - Paket [Nama Paket]"*).
  - Ikon lonceng di Topbar Admin otomatis menambah angka merah (*unread count*).
  - Kalender admin (`/admin/calendar`) langsung menampilkan blok jadwal pemotretan tersebut.
  - Angka statistik "Total Pemesanan" dan grafik omset di Dashboard Admin otomatis bertambah.

---

### 4.2 Halaman Dashboard Ringkasan (`/admin`)

#### Aksi & Tampilan Interaktif:
1. **Kartu Metrik Statistik Real-Time**:
   - **Total Pendapatan**: Dihitung otomatis dari seluruh transaksi booking yang berstatus lunas (`PAID_FULL`) ditambah nominal pembayaran uang muka (`PAID_DP`).
   - **Total Booking Aktif**: Menghitung jumlah sesi yang berstatus terkonfirmasi (`CONFIRMED`).
   - **Menunggu Verifikasi**: Menghitung jumlah booking manual yang belum diverifikasi admin (`PENDING_VERIFICATION`).
2. **Grafik Omset Bulanan (Recharts)**:
   - Nilai diagram batang/garis dihitung dinamis dengan mengelompokkan data booking berdasarkan bulan pemesanan.
3. **Tabel "Booking Terbaru"**:
   - Menampilkan 5 transaksi paling mutakhir dari `kaya_bookings`.
   - Mengklik salah satu baris langsung membuka modal detail pemesanan.

---

### 4.3 Halaman Manajemen Booking (`/admin/bookings`)

#### Aksi 1: Filter & Pencarian Cepat
* Admin dapat mencari berdasarkan nama pemesan, nomor invoice, nomor WA, atau kode reservasi.
* Tab filter status: *Semua*, *Menunggu Verifikasi*, *Terkonfirmasi*, *Selesai*, dan *Dibatalkan*.

#### Aksi 2: Tambah Booking Manual dari Admin (`NewBookingModal`)
* **Perilaku**: Tombol *"Tambah Booking Manual"* membuka formulir untuk admin menginput pesanan walk-in (pelanggan yang datang langsung ke studio).
* **Reaksi**: Booking tersimpan ke `kaya_bookings` dengan status langsung terkonfirmasi, dan nomor invoice langsung terbit.

#### Aksi 3: Verifikasi Pembayaran Manual (`BookingDetailModal`)
* **Perilaku**: Admin memeriksa foto bukti transfer yang diunggah customer.
* **Jika Diverifikasi**:
  - Status booking berubah dari `PENDING_VERIFICATION` menjadi `CONFIRMED`.
  - Status pembayaran menjadi `PAID_FULL` atau `PAID_DP`.
  - Sistem otomatis membuat entitas baru di `kaya_invoices` lengkap dengan nomor invoice resmi.
  - Toast sukses muncul dan notifikasi verifikasi tercatat.
* **Jika Ditolak**:
  - Status booking berubah menjadi `REJECTED` disertai catatan alasan penolakan.

#### Aksi 4: Ubah Status Sesi & Reschedule Jadwal
* Admin dapat memindahkan jadwal pemotretan (mengubah tanggal dan jam). Sesi di kalender otomatis berpindah posisi.
* Admin dapat mengubah status sesi menjadi `COMPLETED` saat photoshoot selesai dilakukan.

---

### 4.4 Halaman Kalender Jadwal Studio (`/admin/calendar`)

#### Aksi 1: Visualisasi Jadwal Sesi Pemotretan
* Menampilkan seluruh booking yang sudah `CONFIRMED` ke dalam kotak tanggal dan jam yang bersangkutan.
* Setiap blok sesi menampilkan: Jam, Nama Pelanggan, Nama Paket, dan Nama Fotografer yang bertugas.
* Mengklik salah satu sesi akan membuka popup ringkas detail reservasi.

#### Aksi 2: Pengelolaan Hari Libur Studio (Blackout Dates)
* **Perilaku**: Tombol *"Atur Hari Libur"* memungkinkan admin menandai tanggal tertentu sebagai hari tutup studio (misal: Hari Raya atau Renovasi Studio).
* **Reaksi**: Tanggal tersebut tersimpan di `kaya_calendar_blocks` dan otomatis dinonaktifkan (*disabled*) pada kalender pemesanan di Landing Page, sehingga pelanggan tidak bisa memilih tanggal tersebut.

---

### 4.5 Halaman Manajemen Paket Layanan (`/admin/packages`)

#### Aksi 1: Tambah Paket Foto Baru
* **Perilaku**: Tombol *"Tambah Paket Foto"* membuka modal formulir: Nama Paket, Kategori (Solo, Squad, Family, Cinematic), Harga, Durasi Menit, Batas Maksimal Orang, Kuota Edit Foto, dan Daftar Fasilitas.
* **Reaksi**: Paket baru tersimpan di `kaya_packages` dan langsung muncul sebagai kartu paket baru di Landing Page.

#### Aksi 2: Edit & Penyesuaian Harga Paket
* **Perilaku**: Tombol *"Edit"* pada kartu paket membuka form untuk memperbarui harga atau rincian layanan.
* **Reaksi**: Data di `kaya_packages` diperbarui dan seketika tercermin di landing page.

#### Aksi 3: Aktifkan / Nonaktifkan Paket
* Terdapat toggle switch On/Off per paket. Paket yang dinonaktifkan tetap ada di admin untuk arsip, tetapi disembunyikan dari pilihan customer di landing page.

---

### 4.6 Halaman Manajemen Invoice (`/admin/invoices`)

#### Aksi & Tampilan:
1. **Daftar Invoice Otomatis**:
   - Tidak perlu input manual. Setiap kali ada booking yang berstatus `CONFIRMED`, baris invoice baru otomatis terdaftar di halaman ini.
2. **Aksi Lihat / Pratinjau Invoice**:
   - Membuka modal preview invoice resmi bergaya cetak lengkap dengan rincian biaya, status lunas/DP, dan data studio.
3. **Aksi Cetak / Download PDF**:
   - Memicu fungsi cetak dokumen bawaan browser (`window.print()`).
4. **Aksi Kirim Ulang via WhatsApp**:
   - Menampilkan notifikasi toast sukses bahwa format pesan WhatsApp telah siap dan memperbarui log waktu pengiriman terakhir.

---

### 4.7 Halaman Pengaturan Studio: Struktur Menu & Sub-Menu (`/admin/settings`)

> 🌟 **HIGHLIGHT ARSITEKTUR SETTINGS**: Halaman pengaturan tidak boleh dijadikan satu halaman panjang (*single long page*) yang membingungkan. Pengaturan wajib dipecah ke dalam **Struktur Menu & Sub-Menu Navigasi (Tata Letak 2 Kolom)**:
> * **Kolom Kiri**: Sidebar Navigasi Vertikal untuk memilih Sub-Menu Pengaturan.
> * **Kolom Kanan**: Panel Konten Dinamis yang menampilkan formulir sesuai sub-menu yang dipilih.

#### Daftar Struktur Sub-Menu Pengaturan:

| No | Sub-Menu ID | Judul Sub-Menu | Ikon | Isi Pengaturan & Logika Mock |
| :---: | :--- | :--- | :---: | :--- |
| **1** | `profil-studio` | **Profil & Lokasi Studio** | 🏢 `Building2` | Nama studio, alamat fisik di Semarang, nomor telepon WhatsApp, link akun Instagram, dan jam operasional harian. Tersimpan di `kaya_studio_profile` dan otomatis mengupdate teks di footer Landing Page. |
| **2** | `metode-pembayaran` | **Metode Pembayaran** | 💳 `CreditCard` | Pengaturan **Dual Mode (Opsi 1: Payment Gateway vs Opsi 2: Transfer Manual)**, konfigurasi Midtrans/Xendit, dan manajemen daftar rekening bank studio. *(Rincian lengkap pada [`2026-09-08-dual-payment-mode-design.md`](./2026-09-08-dual-payment-mode-design.md))*. |
| **3** | `whatsapp-waha` | **Koneksi Engine WAHA** | 💬 `MessageSquare` | Status koneksi WhatsApp QR Code (WAHA tanpa input Base URL/Key di frontend), info nomor terhubung, tombol refresh status, dan putus sesi. *(Detail di [`2026-09-08-waha-mini-crm-design.md`](./2026-09-08-waha-mini-crm-design.md))*. |
| **4** | `whatsapp-templates` | **Template WhatsApp Builder** | 📝 `Sparkles` | **Visual Template Builder WhatsApp** dengan simulator smartphone live, bilah tag variabel dinamis, analisis anti-spam, dan form uji coba kirim pesan test. *(Detail di [`2026-09-08-whatsapp-template-builder-design.md`](./2026-09-08-whatsapp-template-builder-design.md))*. |
| **5** | `email-smtp` | **Notifikasi Email SMTP** | 📧 `Mail` | Pengaturan server SMTP (Host, Port, Username, Password, Pengirim) untuk pengiriman invoice otomatis, beserta **Visual Email Template Builder responsif**. *(Detail di [`2026-09-08-email-smtp-and-template-builder-design.md`](./2026-09-08-email-smtp-and-template-builder-design.md))*. |
| **6** | `pemeliharaan-data` | **Pemeliharaan & Simulator Data** | 🛠️ `Sliders` | Tampilan status sistem, monitoring ukuran data di `localStorage`, status environment (`development` vs `production`), dan tombol **"Reset Mock Data ke Awal"** (hanya aktif pada mode development). |

#### Rincian Aksi per Sub-Menu:
* **Pada Sub-Menu `profil-studio`**:
  - Formulir informasi dasar studio. Saat disimpan, teks nama studio dan alamat di seluruh website ikut ter-update.
* **Pada Sub-Menu `metode-pembayaran`**:
  - Pengaturan mode pembayaran eksklusif (jika Gateway aktif, Manual non-aktif, dan sebaliknya).
* **Pada Sub-Menu `whatsapp-waha`**:
  - Pindai QR code dan pantau kesehatan koneksi WAHA.
* **Pada Sub-Menu `whatsapp-templates`**:
  - Merancang kalimat template pesan dengan tombol tag variabel dinamis dan live preview di smartphone simulator.
* **Pada Sub-Menu `pemeliharaan-data` (Fitur Khusus Reset Data)**:
  - **Aturan Lingkungan**: Tombol warna merah *"Reset ke Data Awal Pabrik"* **hanya dirender jika `process.env.NODE_ENV === 'development'`**.
  - Jika diklik, memunculkan modal konfirmasi untuk membersihkan seluruh data booking, paket, dan pengaturan di `localStorage`, lalu memulihkan data default awal pabrik.

---

### 4.8 Topbar & Pusat Notifikasi (`/admin/components/topbar.tsx`)

#### Aksi & Perilaku:
1. **Lonceng Notifikasi & Unread Counter**:
   - Ikon lonceng menampilkan badge merah berisi angka notifikasi yang belum dibaca (`read: false`).
   - Setiap kali terjadi booking baru atau pengunggahan bukti bayar oleh customer, angka lonceng langsung bertambah 1.
2. **Dropdown Daftar Notifikasi**:
   - Mengklik lonceng membuka daftar notifikasi terbaru dengan penanda waktu (misal: *"5 menit yang lalu"*).
   - Mengklik salah satu notifikasi akan menandai notifikasi tersebut telah dibaca dan langsung mengarahkan/membuka modal detail booking yang bersangkutan.
3. **Tombol "Tandai Semua Telah Dibaca"**:
   - Mengubah seluruh status notifikasi menjadi sudah dibaca dan menghilangkan angka merah badge.

---

### 4.9 Halaman Mini CRM WhatsApp (`/admin/crm`)
* **Pusat Percakapan & Hub Kontak**: Membaca riwayat pesan obrolan dari sesi aktif WhatsApp studio yang tersimpan di `kaya_crm_chats`.
* **Pengelompokan Kategori Dinamis**: Admin dapat menandai kontak dengan label/kategori kustom (Tanya Paket, Booking DP, Lunas, Selesai) dan memfilter daftar obrolan berdasarkan kategori tersebut (`kaya_crm_categories`).
* **Proteksi Anti-Ban (24-Hour Messaging Window)**:
  - **Jendela Aktif (<24 jam)**: Input pengetikan pesan teks bebas terbuka normal.
  - **Jendela Kedaluwarsa (>24 jam)**: Input pengetikan pesan bebas dikunci otomatis demi mencegah nomor dilaporkan sebagai spam, dan admin hanya dapat mengirimkan **Template Pesan Resmi Studio**.
* **Akses Cepat dari Detail Booking**: Pada modal detail reservasi (`BookingDetailModal`), terdapat tombol sorotan *"Buka Obrolan WhatsApp CRM"* yang seketika mengarahkan admin ke ruang obrolan pelanggan tersebut di halaman CRM.
*(Rincian lengkap arsitektur ini tertera pada [`2026-09-08-waha-mini-crm-design.md`](./2026-09-08-waha-mini-crm-design.md))*.

---

## 5. Mekanisme Sinkronisasi Antar Tab (Real-Time Simulator)

Agar pengalaman pengujian terasa seperti aplikasi nyata dengan koneksi internet:
* Tim developer wajib memasang pendengar event penyimpanan browser (*Storage Event Listener*).
* **Contoh Skenario**:
  - Developer membuka dua jendela browser berdampingan: Tab Kiri membuka Landing Page Pengunjung (`/`), Tab Kanan membuka Dashboard Admin (`/admin/bookings`).
  - Ketika di Tab Kiri pengunjung menyelesaikan pemesanan, Tab Kanan di sebelahnya **otomatis langsung menampilkan baris booking baru dan notifikasi lonceng tanpa perlu refresh halaman manual**.
* Hal ini dicapai dengan mendengarkan perubahan pada event `window.addEventListener('storage', ...)` yang secara alami disediakan oleh browser.

---

## 6. Skenario Pengujian Mandiri Menyeluruh (End-to-End Testing Guide)

Developer dapat menguji keterhubungan seluruh sistem dengan alur berikut:

### Skenario A: Uji Keterhubungan Paket (Admin -> Landing Page)
1. Buka menu `/admin/packages`, klik **Tambah Paket Foto**.
2. Masukkan nama paket baru: *"Paket Spesial Wisuda 35mm"*, tentukan harga Rp 850.000, lalu simpan.
3. Buka halaman depan `/` (Landing Page).
4. Pastikan paket baru tersebut langsung muncul di bagian daftar paket dengan harga dan rincian yang persis sama.

### Skenario B: Uji Alur Booking Lengkap (Landing Page -> Admin)
1. Di Landing Page, pesan paket yang baru saja dibuat di Skenario A.
2. Selesaikan alur checkout hingga muncul nomor booking di layar sukses.
3. Buka halaman `/admin`:
   - Pastikan angka Total Pemesanan dan grafik pendapatan bertambah.
   - Periksa lonceng notifikasi di topbar: Harus ada notifikasi baru pesanan masuk.
4. Buka halaman `/admin/calendar`:
   - Pastikan jadwal sesi pemotretan tersebut sudah tertera rapi pada tanggal dan jam yang tadi dipilih.
5. Buka halaman `/admin/bookings` dan setujui pembayarannya:
   - Status berubah menjadi Terkonfirmasi.
   - Buka halaman `/admin/invoices`: Pastikan invoice resmi untuk pelanggan tersebut sudah otomatis terbit.

### Skenario C: Uji Tombol Reset Data
1. Buka halaman `/admin/settings`.
2. Jika server berjalan di mode dev, pastikan kartu/tombol warna merah **"Reset Mock Data"** tampil.
3. Klik tombol reset dan konfirmasi.
4. Pastikan data paket tambahan tadi terhapus dan sistem kembali ke daftar paket bawaan pabrik.

---

## 7. Checklist Implementasi untuk Tim Developer

- [ ] Siapkan berkas utilitas helper terpusat untuk membaca dan menyimpan data `localStorage` secara aman (kebal terhadap SSR).
- [ ] Ubah data paket di Landing Page agar membaca dari `localStorage` (`kaya_packages`), bukan data statis.
- [ ] Buat fungsi CRUD paket foto di `/admin/packages` (tambah paket baru, edit harga, toggle aktif/nonaktif).
- [ ] Sambungkan modal checkout pemesanan di Landing Page agar menambahkan data ke `kaya_bookings` dan memicu notifikasi ke `kaya_notifications`.
- [ ] Perbarui kalkulasi metrik analitik dan grafik di `/admin` agar menghitung data riil dari `kaya_bookings`.
- [ ] Tambahkan sinkronisasi event `storage` pada context admin agar perubahan antar tab langsung terdeteksi otomatis.
- [ ] Hubungkan aksi verifikasi booking di `/admin/bookings` agar otomatis menerbitkan entitas invoice di `/admin/invoices`.
- [ ] Terapkan tombol "Reset Mock Data" di `/admin/settings` dengan pengkondisian `process.env.NODE_ENV === 'development'`.
- [ ] Jalankan seluruh skenario pengujian mandiri end-to-end untuk memverifikasi bahwa semua halaman terintegrasi mulus.
