# Spesifikasi Teknis: Integrasi Engine WAHA & Mini CRM dengan Proteksi Anti-Ban (24-Hour Window)

Dokumen ini adalah panduan spesifikasi teknis dan fungsional untuk mengintegrasikan **WAHA (WhatsApp HTTP API)** dan membangun fitur **Mini CRM** di website studio foto **Kaya Story**.

Fokus dokumen ini adalah memberikan gambaran **kebutuhan fitur, aturan keamanan anti-ban, perilaku antarmuka (UI/UX), sinkronisasi riwayat pesan dari sesi aktif, serta sistem kategori obrolan dinamis** yang ramah dipahami oleh tim developer pemula tanpa potongan kode kaku.

---

## 1. Ringkasan & Tujuan Fitur

### 1.1 Latar Belakang & Masalah yang Diselesaikan
* **Penyederhanaan Koneksi WAHA**: Admin studio tidak boleh dibebani dengan konfigurasi teknis seperti `Base URL` atau `API Key`. Kredensial tersebut harus dikunci aman di *environment variables* server backend. Admin di dashboard hanya berinteraksi dengan tombol **Generate QR Code**, **Lihat Status Koneksi**, **Refresh Status**, dan **Putus Sesi (Logout)**.
* **Membaca Riwayat Chat dari Sesi Aktif**: Mini CRM dapat membaca riwayat obrolan pesan masuk dan keluar secara otomatis dari sesi WhatsApp yang sedang aktif.
* **Pengelompokan Percakapan dengan Kategori Kustom**: Admin dapat membuat, mengedit warna, dan menetapkan kategori/label pada setiap percakapan klien (misal: *Prospek Baru*, *Tanya Paket*, *Booking DP*, *Lunas*, *Selesai*).
* **Proteksi Anti-Ban (24-Hour Messaging Window)**: Mengatur aturan keamanan pengiriman pesan untuk mencegah nomor WhatsApp studio diblokir atau dilaporkan sebagai spam oleh pelanggan.

### 1.2 Highlight Peta Relasi & Keterhubungan Dokumen Spesifikasi

> 🔗 **HIGHLIGHT INTEGRASI 5 DOKUMEN SPESIFIKASI**:
> Fitur WAHA & Mini CRM ini berinteraksi langsung dengan **4 dokumen spesifikasi lainnya** dalam arsitektur website Kaya Story:

| Dokumen Terkait | Hubungan & Aliran Data dengan Fitur WAHA & Mini CRM Ini |
| :--- | :--- |
| **1.** 📄 [`Master Data Layer`](./2026-09-08-unified-mock-data-layer-design.md) *(Dokumen Induk)* | Mengelola persistensi `kaya_crm_chats`, `kaya_waha_session`, dan `kaya_crm_categories`, serta sinkronisasi event antar tab browser. |
| **2.** 📄 [`Dual Payment & Anti-Scam`](./2026-09-08-dual-payment-mode-design.md) | Menerima kontak masuk saat customer mengklik tombol *"Konfirmasi ke WA CS"* setelah transfer, dan menghubungkan obrolan dengan kartu rincian booking pelanggan. |
| **3. WAHA & Mini CRM** *(Dokumen Ini)* | **Pusat Komunikasi & Anti-Ban**: Mengelola obrolan pelanggan, pengelompokan kategori dinamis, dan proteksi penguncian chat jika jendela 24 jam telah lewat. |
| **4.** 📄 [`WhatsApp Template Builder`](./2026-09-08-whatsapp-template-builder-design.md) | Menyediakan daftar **Template Resmi** yang otomatis muncul dan bisa dipilih di Mini CRM ketika jendela pesan 24 jam customer sedang terkunci. |
| **5.** 📄 [`Email SMTP & Template Builder`](./2026-09-08-email-smtp-and-template-builder-design.md) | Saluran komunikasi cadangan: Jika nomor WhatsApp customer tidak aktif atau di luar jendela 24 jam, admin dapat memantau status pengiriman email invoice. |

---

## 2. Standar Arsitektur: Komponen Global vs Komponen Lokal

### 2.1 Komponen Global yang Digunakan (`components/` atau `components/ui/`)
* `Badge`: Label penanda kategori kustom dan status 24 jam (hijau/merah).
* `Dialog` / `Modal`: Modal pembuatan kategori kustom dan modal pemindaian QR Code.
* `DropdownMenu`: Menu pilihan untuk mengubah kategori chat secara cepat.
* `ScrollArea`: Area gulir percakapan chat dan daftar kontak.

### 2.2 Komponen Lokal Halaman
* **Di Folder Pengaturan Admin (`app/admin/settings/components/`)**:
  - `WahaConnectionCard.tsx`: Kartu kelola koneksi WAHA (QR Code, status koneksi, refresh, putus sesi).
* **Di Folder Mini CRM (`app/admin/crm/components/`)**:
  - `CrmContactList.tsx`: Panel kiri untuk daftar kontak, pencarian, dan filter kategori.
  - `CrmChatBox.tsx`: Panel tengah untuk riwayat gelembung obrolan dan area input pesan.
  - `CrmAntiBanBanner.tsx`: Banner penanda status jendela percakapan 24 jam.
  - `CrmTemplateSelector.tsx`: Tombol pilihan template pesan resmi saat jendela 24 jam terkunci.
  - `CrmCustomerDetail.tsx`: Panel kanan untuk menampilkan ringkasan data pemesanan pelanggan.
  - `CategoryManagerDialog.tsx`: Modal dialog untuk menambah, mengedit warna, dan menghapus kategori obrolan.

---

## 3. Integrasi Engine WAHA di Menu Pengaturan (`/admin/settings`)

Pengaturan WAHA ditempatkan pada **Menu Settings -> Sub-Menu "Otomasi WhatsApp" (`whatsapp-waha`)**:

### 3.1 Aturan Keamanan Backend
* Parameter sensitif seperti `WAHA_BASE_URL` dan `WAHA_API_KEY` disimpan pada `.env` di backend dan **tidak pernah ditampilkan** sebagai kolom input form di layar admin.
* Frontend berkomunikasi dengan WAHA melalui perantara endpoint internal aplikasi.

### 3.2 Tampilan & Alur Antarmuka untuk Admin
1. **Saat Sesi Terputus (*Disconnected*)**:
   - Menampilkan status *"WhatsApp Belum Terhubung"* dengan badge abu-abu/merah.
   - Disediakan tombol utama warna hitam: **"Hubungkan WhatsApp (Generate QR)"**.
   - Saat diklik, modal popup menampilkan gambar QR Code resmi dari WAHA beserta countdown batas waktu pemindaian (misal: 45 detik) dan tombol refresh QR.
2. **Saat Sesi Sedang Memindai (*Scanning / Authenticating*)**:
   - Menampilkan indikator loading animasi: *"Menghubungkan ke perangkat WhatsApp..."*.
3. **Saat Sesi Terhubung (*Connected*)**:
   - Menampilkan badge hijau berdenyut: *"Terhubung & Aktif"*.
   - Menampilkan informasi akun: Nomor WhatsApp studio terhubung (misal: `+62 858-7654-3210`), nama profil WhatsApp studio, dan nama sesi aktif (`session-kayastory-main`).
   - **Tombol Aksi**:
     - Tombol **"Cek Status Sesi"**: Memeriksa kesehatan koneksi ke engine WAHA.
     - Tombol merah **"Putuskan Koneksi (Logout)"**: Mengakhiri sesi WhatsApp dengan dialog konfirmasi aman.

---

## 4. Mekanisme Sinkronisasi & Pembacaan Data Chat dari Sesi Aktif

Mini CRM dirancang untuk membaca riwayat obrolan secara otomatis:

1. **Sinkronisasi Obrolan (*Read Chat from Session*)**:
   - Sistem membaca daftar kontak dan riwayat pesan terakhir dari nomor-nomor yang pernah berinteraksi dengan akun WhatsApp studio.
   - Setiap pesan memuat informasi: ID percakapan, isi teks pesan, arah pesan (masuk dari customer vs keluar dari studio), timestamp waktu, dan status pengiriman (terkirim, diterima, dibaca/centang dua biru).
2. **Pencocokan Otomatis dengan Data Booking**:
   - Sistem secara otomatis mencocokkan nomor telepon pelanggan pada chat dengan data di `kaya_bookings`.
   - Jika nomor cocok, kontak di CRM langsung menampilkan nama pemesan resmi dan link rincian paket wisuda yang dipesan.

---

## 5. Sistem Kategori & Tagging Obrolan yang Dapat Diatur Admin

Admin memiliki kendali penuh untuk mengatur label/kategori agar follow-up klien wisuda menjadi sangat teratur.

### 5.1 Pengelolaan Kategori Dinamis (`CategoryManagerDialog`)
* Disediakan tombol **"Kelola Kategori"** di bagian atas halaman CRM.
* Admin dapat:
  - Menambah kategori baru dengan nama kustom (misal: *"Tanya Price List"*, *"Booking DP"*, *"Pelunasan"*, *"Foto Siap Ambil"*, *"Prioritas Wisuda Undip"*).
  - Memilih palet warna badge untuk setiap kategori (Hijau, Biru, Kuning/Amber, Ungu, Merah/Rose, Abu-abu).
  - Mengubah nama kategori atau menghapusnya jika sudah tidak relevan.

### 5.2 Penggunaan Kategori pada Obrolan
* **Penyematan Label 1-Klik**: Pada panel kontak atau di header chat aktif, terdapat dropdown tombol untuk mengganti kategori pelanggan saat itu juga (contoh: dari kategori *"Tanya Price List"* dipindahkan ke *"Booking DP"* begitu pelanggan transfer uang muka).
* **Filter Kontak Cepat**: Di atas daftar obrolan, terdapat bilah filter kategori (tombol pill). Admin dapat mengklik salah satu kategori untuk hanya menampilkan kontak yang berlabel kategori tersebut.

---

## 6. Proteksi Anti-Ban: Kebijakan Jendela Pesan 24 Jam (24-Hour Messaging Window)

Aturan ini diterapkan untuk melindungi nomor WhatsApp studio agar tidak dianggap spammer oleh Meta/WhatsApp:

### 6.1 Logika Jendela Waktu (24-Hour Window)
* **Kapan Jendela Terbuka (Aktif)?**
  - Dihitung dari waktu pesan terakhir yang **dikirim oleh customer ke studio**.
  - Jika pesan terakhir customer masuk dalam kurun waktu kurang dari 24 jam $\rightarrow$ **Jendela Aktif (Aman)**.
* **Kapan Jendela Kedaluwarsa (Tertutup)?**
  - Jika sudah lebih dari 24 jam sejak customer terakhir membalas/mengirim pesan $\rightarrow$ **Jendela Kedaluwarsa (Beresiko Spam)**.

### 6.2 Perilaku Antarmuka (Mode Aman - Anti-Ban Ketat)

```
                       [ Customer Kirim Chat Terakhir ]
                                      │
                                      ▼
                        Waktu < 24 Jam sejak chat masuk?
                                     / \
                                    /   \
                             [ YA ]       [ TIDAK ]
                              /               \
                             ▼                 ▼
             🟢 Jendela AKTIF                  🔴 Jendela KEDALUWARSA
             - Banner Hijau Aman               - Banner Merah Proteksi
             - Input Chat Bebas Terbuka        - Input Chat Bebas DIKUNCI
             - Bebas balas pesan apa saja      - HANYA bisa kirim via Template Resmi
```

#### Kondisi A: Jendela Aktif (🟢 Aman)
* Di atas kolom pengetikan pesan, tampil banner tipis warna hijau:  
  *"🟢 Jendela Percakapan Aktif — Sisa waktu interaksi: [Jam:Menit]. Anda bebas mengirim pesan teks biasa."*
* Input teks bebas dan tombol kirim pesan dapat digunakan secara normal.

#### Kondisi B: Jendela Kedaluwarsa (🔴 Terkunci demi Keamanan)
* Di atas kolom pengetikan pesan, tampil banner peringatan warna merah/amber:  
  *"🔴 Jendela Percakapan 24 Jam Telah Berakhir — Untuk mencegah nomor dilaporkan sebagai spam dan diblokir oleh WhatsApp, pengetikan pesan bebas dikunci sementara."*
* **Kolom input teks bebas dalam keadaan *disabled* (tidak bisa diketik)**.
* Di bawah banner, disajikan **Pilihan Template Pesan Resmi Studio**:
  - 🔘 **Template Konfirmasi Booking & Tagihan**
  - 🔘 **Template Pengingat Jadwal Sesi (H-1)**
  - 🔘 **Template Pengiriman Link Foto Google Drive**
  - 🔘 **Template Sapaan & Follow-up Ramah**
* Admin memilih salah satu template resmi $\rightarrow$ teks otomatis terisi $\rightarrow$ klik kirim.
* **Pemulihan Jendela Otomatis**: Begitu customer membalas pesan template tersebut, sistem mendeteksi pesan masuk baru, timer langsung ter-reset ke 24 jam penuh, dan kolom input teks bebas seketika terbuka kembali!

---

## 7. Desain Tata Letak Mini CRM (`/admin/crm`)

Antarmuka Mini CRM menggunakan **Tata Letak 3 Kolom Modern**:

```
┌─────────────────────────┬───────────────────────────────────────┬───────────────────────────────┐
│ KOLOM 1: DAFTAR KONTAK  │ KOLOM 2: RUANG OBROLAN & ANTI-BAN     │ KOLOM 3: RINCIAN BOOKING      │
├─────────────────────────┼───────────────────────────────────────┼───────────────────────────────┤
│ • Pencarian Kontak      │ • Header: Nama Klien & Badge Kategori │ • Kartu Profil Pelanggan      │
│ • Filter Kategori Pill  │ • Gelembung Chat (Masuk/Keluar)       │ • Paket Sesi Wisuda           │
│ • Daftar Chat Item:     │ • BANNER 24-HOUR WINDOW (🟢 / 🔴)     │ • Tanggal & Jam Foto          │
│   - Nama Klien          │ • Area Input Pesan Bebas (jika aktif) │ • Status Pembayaran (DP/Lunas)│
│   - Cuplikan Chat       │   ATAU                                │ • Tombol Cepat Buka Invoice   │
│   - Badge Kategori      │ • Selector Template Resmi (jika lock) │                               │
│   - Indikator 24H Dot   │ • Tombol Kirim Pesan                  │                               │
└─────────────────────────┴───────────────────────────────────────┴───────────────────────────────┘
```

### Akses Cepat dari Menu Booking (`/admin/bookings`)
Pada modal detail pemesanan (`BookingDetailModal`), terdapat tombol sorotan:  
**"💬 Buka Obrolan WhatsApp CRM"**  
Saat tombol ini diklik, admin langsung dialihkan ke halaman `/admin/crm` dan obrolan dengan customer tersebut langsung aktif terpilih di layar.

---

## 8. Skenario Pengujian Mandiri untuk Developer (Testing Guide)

Developer pemula dapat menguji seluruh fungsi Mini CRM dengan skenario berikut:

### Skenario 1: Uji Koneksi WAHA di Menu Pengaturan
1. Buka halaman `/admin/settings`, pilih sub-menu **Otomasi WhatsApp**.
2. Pastikan tidak ada kolom input teknis Base URL/API Key.
3. Klik tombol **Hubungkan WhatsApp (Generate QR)** $\rightarrow$ pastikan modal QR Code muncul.
4. Simulasikan koneksi berhasil $\rightarrow$ pastikan status berubah menjadi hijau *"Terhubung & Aktif"* beserta nomor studio.

### Skenario 2: Uji Kategori & Filter Chat di Mini CRM
1. Buka halaman `/admin/crm`.
2. Klik tombol **Kelola Kategori**, tambahkan kategori baru: *"Wisuda Kilat"* dengan warna ungu, lalu simpan.
3. Pilih salah satu obrolan customer di daftar sebelah kiri, ubah kategorinya menjadi *"Wisuda Kilat"*.
4. Klik tombol filter *"Wisuda Kilat"* di bilah atas $\rightarrow$ pastikan hanya obrolan berlabel tersebut yang tampil.

### Skenario 3: Uji Proteksi Jendela 24 Jam (Anti-Ban)
1. Pilih kontak yang waktu chat terakhirnya **kurang dari 24 jam**:
   - Pastikan banner hijau aktif.
   - Ketikkan pesan bebas di kolom chat, lalu kirim $\rightarrow$ pesan berhasil terkirim.
2. Pilih kontak yang waktu chat terakhirnya **lebih dari 24 jam**:
   - Pastikan banner merah peringatan anti-ban aktif.
   - Periksa bahwa kolom input teks bebas terkunci (*disabled*).
   - Klik salah satu **Template Pesan Resmi** (misal: Pengingat H-1) $\rightarrow$ pesan template berhasil dikirim.
3. Simulasikan customer membalas pesan tersebut $\rightarrow$ perhatikan bahwa banner langsung berubah menjadi hijau dan input teks bebas otomatis terbuka kembali.

---

## 9. Checklist Pengerjaan Developer

- [ ] Siapkan entitas data mock untuk sesi WAHA (`kaya_waha_session`), riwayat obrolan (`kaya_crm_chats`), dan kategori kustom (`kaya_crm_categories`).
- [ ] Buat kartu koneksi WAHA di `/admin/settings` (sub-menu `whatsapp-waha`) tanpa kolom input Base URL/API Key.
- [ ] Buat halaman utama Mini CRM di `/admin/crm` dengan tata letak 3 kolom.
- [ ] Implementasikan dialog kelola kategori obrolan (tambah, ubah warna, hapus).
- [ ] Terapkan logika proteksi 24-Hour Window pada panel obrolan (kunci input teks jika > 24 jam dan sediakan pemilih template resmi).
- [ ] Tambahkan tombol pintas "Buka Obrolan CRM" pada modal detail booking di `/admin/bookings`.
- [ ] Jalankan skenario pengujian mandiri untuk memverifikasi kelancaran alur dari pengaturan WAHA hingga proteksi anti-ban di CRM.
