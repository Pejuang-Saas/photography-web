# Spesifikasi Teknis: Konfigurasi Server Email SMTP & Visual Email Template Builder Responsif

Dokumen ini adalah panduan spesifikasi teknis dan fungsional untuk mengimplementasikan **Konfigurasi Server SMTP** dan **Visual Email Template Builder** di website studio foto **Kaya Story**.

Fitur ini memiliki dua tujuan utama:
1. **Fungsi Inti Transaksional**: Mengirimkan invoice resmi digital dan tiket konfirmasi pemesanan foto ke alamat email pelanggan secara otomatis.
2. **Fungsi Fleksibilitas Ekstensibel**: Memberikan kebebasan bagi admin studio untuk merancang berbagai template email lain (seperti pengingat jadwal H-1, penyerahan link Google Drive hasil foto, permintaan review Google Maps, hingga pengumuman promo) menggunakan **Editor Blok Modular** dengan **Simulator Pratinjau Email Responsif (Desktop & Mobile)**.

---

## 1. Ringkasan & Tujuan Fitur

### 1.1 Latar Belakang & Masalah
* **Kesan Profesional Studio Mewah**: Email yang dikirimkan ke pelanggan tidak boleh berupa teks polos sederhana. Email harus menggunakan format HTML responsif yang elegan (memiliki header logo studio, tabel rincian biaya yang rapi, tombol aksi CTA berdesain mewah, serta footer resmi).
* **Kemudahan Menyusun Template bagi Admin**: Admin tidak perlu memahami kode HTML email tabel yang rumit. Sistem menyediakan editor berbasis blok visual di mana admin cukup mengisi teks, memilih tombol, dan menyisipkan variabel dinamis dengan mengklik tag chip.
* **Pratinjau Dua Layar (Desktop vs Mobile)**: Karena lebih dari 70% pelanggan membuka email dari smartphone mereka, builder menyediakan tombol toggle untuk melihat tampilan email di layar laptop maupun layar HP sebelum disimpan.

### 1.2 Lokasi Penempatan Fitur
* **Penempatan**: Berada di **Menu Settings -> Sub-Menu "Notifikasi Email SMTP" (`/admin/settings?tab=email-smtp`)**.
* Di dalam sub-menu ini, antarmuka dibagi menjadi 2 tab teratur:
  1. **Tab 1: Konfigurasi Server SMTP** (Pengaturan koneksi host, port, kredensial, dan tes kirim).
  2. **Tab 2: Template Builder Email** (Daftar template dan ruang kerja penyusunan blok visual email).

---

## 2. Standar Arsitektur: Komponen Global vs Komponen Lokal

### 2.1 Komponen Global (`components/` atau `components/ui/`)
* `Button`: Tombol simpan, tombol uji kirim, dan tombol hapus.
* `Input` & `Textarea`: Input parameter server, subjek email, dan paragraf teks.
* `Badge`: Label penanda status (Transaksional, Promo, Aktif).
* `Switch` / `Checkbox`: Toggle aktivasi kirim email otomatis.
* `Tabs`: Pengalih tampilan sub-tab dan pengalih pratinjau Desktop/Mobile.

### 2.2 Komponen Lokal Halaman (`app/admin/settings/components/email/`)
* `SmtpConfigCard.tsx`: Formulir pengaturan koneksi server SMTP dan kartu uji coba kirim email.
* `EmailTemplateList.tsx`: Tabel daftar template email yang tersimpan beserta tombol aksi kelola.
* `EmailBlockEditor.tsx`: Formulir penyusun blok email modular (Subjek, Header, Paragraf, Tombol CTA, Footer).
* `EmailVariableChips.tsx`: Bilah tombol tag variabel dinamis (`{customer_name}`, `{invoice_number}`, dll.).
* `EmailResponsiveSimulator.tsx`: Simulator email yang merender tampilan email HTML nyata dengan pengalih rasio Desktop (600px) vs Mobile (360px).

---

## 3. Kebutuhan Data (Data Model di `localStorage`)

### 3.1 Kunci LocalStorage yang Digunakan
1. `kaya_email_settings` : Menyimpan pengaturan koneksi server SMTP dan identitas pengirim.
2. `kaya_email_templates` : Menyimpan daftar seluruh template email (template invoice bawaan dan template kustom baru).
3. `kaya_email_logs` : Menyimpan riwayat simulasi pengiriman email ke pelanggan.

### 3.2 Rincian Informasi yang Disimpan
* **Konfigurasi SMTP (`kaya_email_settings`)**:
  - `smtpHost`: Alamat server SMTP (contoh: `smtp.gmail.com`).
  - `smtpPort`: Nomor port server (contoh: `587` untuk TLS atau `465` untuk SSL).
  - `smtpUser`: Alamat email otentikasi (contoh: `studio@kayastory.id`).
  - `smtpPassword`: Kata sandi aplikasi / app password (tersembunyi).
  - `senderName`: Nama identitas pengirim yang muncul di inbox customer (*"Kayastory Photography Studio"*).
  - `autoSendInvoice`: Boolean apakah email invoice otomatis dikirim saat pembayaran disetujui admin.
* **Template Email (`kaya_email_templates`)**:
  - `id` & `name`: Nama template pengenal (contoh: *"Pengiriman Invoice Resmi"*, *"Galeri Foto Siap Unduh"*).
  - `code`: Kode unik (misal: `INVOICE_OFFICIAL`, `PHOTO_DELIVERY_DRIVE`, `REMINDER_H1`, `REVIEW_REQUEST`, `CUSTOM_BROADCAST`).
  - `subject`: Judul subjek email yang mendukung variabel dinamis (contoh: `[Invoice #{invoice_number}] Konfirmasi Reservasi Foto Wisuda Kak {customer_name}`).
  - `heading`: Judul besar di bagian atas badan email (misal: *"Pembayaran Anda Berhasil Diverifikasi! 🎓"*).
  - `bodyText`: Kalimat pengantar atau pesan utama.
  - `includeBookingTable`: Boolean apakah email wajib menyertakan tabel rincian pesanan (Paket, Tanggal, Jam, Lokasi, Total Biaya).
  - `ctaButton`: Objek tombol aksi utama:
    - `text`: Label teks tombol (contoh: *"Unduh Invoice Resmi (PDF)"* atau *"Buka Google Drive Foto"*).
    - `urlVariable`: Tautan tujuan yang bisa menggunakan variabel dinamis (`{invoice_url}` atau `{drive_url}`).
    - `buttonColor`: Pilihan warna tombol (Aksen Amber Gold `#d9a521`, Hitam Elegan `#18181b`, atau Hijau Zamrud `#059669`).
  - `footerText`: Pesan penutup dan alamat studio.
  - `isActive`: Status apakah template ini aktif digunakan.

---

## 4. Rincian Antarmuka Fitur Email (`/admin/settings` -> `email-smtp`)

### 4.1 Tab 1: Konfigurasi Server SMTP & Pengirim
* **Formulir Kredensial Server**:
  - Input Host SMTP, Port, Username Email, dan Password (dengan ikon mata untuk intip kata sandi).
  - Input Nama Pengirim (*Sender Name*) yang tampil di kotak masuk pelanggan.
* **Opsi Otomasi Transaksional**:
  - Checkbox toggle: *"Kirim invoice resmi secara otomatis saat admin memverifikasi pembayaran"*.
  - Checkbox toggle: *"Kirim notifikasi email salinan ke tim studio setiap ada reservasi baru masuk"*.
* **Kartu Uji Coba Pengiriman Email (Test Send)**:
  - Input alamat email tujuan uji coba (misal: email pribadi admin).
  - Tombol **"Kirim Email Uji Coba"**: Mengirimkan email simulasi yang memuat status koneksi server dan memunculkan toast notifikasi sukses.

---

### 4.2 Tab 2: Visual Email Template Builder (Tata Letak 2 Kolom)

Saat admin membuat template baru atau mengedit template yang sudah ada, antarmuka membuka ruang kerja 2 kolom:

```
┌────────────────────────────────────────────────────────┬────────────────────────────────────────┐
│ KOLOM KIRI: EDITOR BLOK MODULAR & VARIABEL             │ KOLOM KANAN: SIMULATOR EMAIL RESPONSIF │
├────────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ • Nama Template & Kode Pemicu                          │ [ Toggle View: 💻 Desktop  | 📱 Mobile ] │
│ • Subjek Email: [Invoice #{invoice_number}] ...        │ ┌────────────────────────────────────┐ │
│ • BILAH VARIABLE CHIPS:                                │ │ Pengirim: Kayastory Studio         │ │
│   [+ Nama Klien] [+ Tanggal] [+ Paket] [+ No. Invoice] │ │ Subjek: [Invoice #KYA-081] ...     │ │
│ • BLOK 1: JUDUL & HEADER LOGO                          │ ├────────────────────────────────────┤ │
│   - Input Judul Email (Heading)                        │ │         [ LOGO KAYASTORY ]         │ │
│ • BLOK 2: TEKS UTAMA (BODY MESSAGE)                    │ │ Halo Kak Anisa Rahmawati! ✨       │ │
│   - Textarea dengan variabel dinamis                   │ │ Pembayaran Anda telah terverifikasi│ │
│ • BLOK 3: TABEL RINCIAN TRANSAKSI                      │ │ ┌────────────────────────────────┐ │ │
│   - Toggle [Aktifkan Tabel Rincian Booking]            │ │ │ Paket: Solo Kebaya Signature   │ │ │
│ • BLOK 4: TOMBOL AKSI CTA UTAMA                        │ │ │ Tanggal: 25 Agustus 2026       │ │ │
│   - Label Tombol & Pilihan Tautan URL                  │ │ └────────────────────────────────┘ │ │
│ • BLOK 5: FOOTER STUDIO                                │ │      [ UNDUH INVOICE RESMI ]       │ │
│ • Tombol: [Batal] [Simpan Template]                    │ │ Alamat: Jl. Tirto Agung, Semarang  │ │
│                                                        │ └────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┴────────────────────────────────────────┘
```

#### Rincian Blok Modular di Kolom Kiri:
1. **Subjek Email**: Dilengkapi tombol sisipkan variabel dinamis agar subjek terasa personal di inbox pelanggan (misal: menyebutkan nama klien dan nomor booking).
2. **Blok Header**: Logo resmi Kayastory Studio dengan garis pembatas emas/amber minimalis.
3. **Blok Teks Utama**: Paragraf pesan yang dapat disisipi tag variabel dinamis melalui bilah *Variable Chips*.
4. **Blok Tabel Booking (Opsional)**: Saklar On/Off untuk menyertakan kotak ringkasan formal (Rincian Paket, Jadwal Sesi Foto, Lokasi Studio, Nominal Diterima, dan Status Lunas/DP). Sangat ideal untuk email invoice.
5. **Blok Tombol CTA (Call to Action)**: Pengaturan teks tombol, warna latar tombol, dan tautan tujuan (bisa mengarah ke link unduh invoice atau Google Drive).
6. **Blok Footer**: Informasi penutup, alamat studio di Tembalang Semarang, nomor CS WhatsApp, dan tautan Instagram resmi.

#### Rincian Simulator di Kolom Kanan:
* **Pengalih Mode Tampilan (Responsive Toggle)**:
  - 💻 **Tampilan Desktop (600px)**: Menampilkan email dalam lebar kartu standar komputer dengan margin elegan.
  - 📱 **Tampilan Mobile (360px)**: Menampilkan email dalam rasio layar smartphone, memastikan ukuran huruf dan tombol CTA tetap nyaman ditekan jari (*thumb-friendly*).
* **Penyelesai Nilai Contoh Nyata (Dummy Data Resolver)**:
  - Semua tag variabel langsung otomatis berubah menjadi data contoh nyata (misal: `{customer_name}` menjadi *"Anisa Rahmawati"*, `{package_name}` menjadi *"Solo Kebaya Signature"*), sehingga admin tidak perlu membayangkan hasilnya.

---

## 5. Keterhubungan dengan Alur Transaksi Aplikasi

### 5.1 Penerbitan Invoice di Manajemen Booking (`/admin/bookings`)
* Ketika admin memverifikasi pembayaran manual pelanggan dan menekan tombol *"Verifikasi Pembayaran"*, sistem tidak hanya memperbarui status menjadi `CONFIRMED`, melainkan juga:
  1. Memeriksa pengaturan `autoSendInvoice` di `kaya_email_settings`.
  2. Jika aktif, sistem mengeksekusi template email berkode `INVOICE_OFFICIAL` untuk dikirimkan ke alamat email pelanggan yang tersimpan.
  3. Mencatat log pengiriman email di `kaya_email_logs`.

### 5.2 Pengiriman Galeri Foto
* Ketika admin selesai mengunggah file foto klien ke Google Drive, admin dapat memilih opsi *"Kirim Link Galeri via Email"*. Sistem otomatis menggunakan template email berkode `PHOTO_DELIVERY_DRIVE` dengan menyematkan URL drive pelanggan.

---

## 6. Skenario Pengujian Mandiri untuk Developer (Testing Guide)

Developer pemula dapat menguji seluruh fungsi email dengan langkah berikut:

### Skenario 1: Uji Konfigurasi SMTP & Tes Kirim
1. Buka `/admin/settings`, pilih sub-menu **Notifikasi Email SMTP**.
2. Masukkan parameter server SMTP (misal: host Gmail dan email pengirim).
3. Masukkan email pribadi di kolom uji coba, lalu klik **Kirim Email Uji Coba**. Pastikan toast notifikasi sukses muncul.

### Skenario 2: Uji Pembuatan Template Email Kustom
1. Di halaman yang sama, klik tab **Template Builder Email**.
2. Klik tombol **Buat Template Baru**.
3. Beri nama template: *"Pengingat Jadwal H-1 via Email"*, subjek: `[Pengingat H-1] Photoshoot Wisuda Kak {customer_name}`.
4. Sisipkan variabel nama klien, tanggal sesi, dan jam di blok teks utama menggunakan tombol tag chip.
5. Aktifkan saklar **Sertakan Tabel Rincian Booking**.
6. Atur tombol CTA: Teks *"Panduan Persiapan Sesi"*, warna amber.
7. Simpan template dan pastikan template baru muncul di tabel daftar template.

### Skenario 3: Uji Pratinjau Responsif Desktop vs Mobile
1. Buka salah satu template dalam mode edit.
2. Klik tombol **Desktop**: Pastikan tampilan simulator melebar dengan layout kartu email klasik.
3. Klik tombol **Mobile**: Pastikan lebar mengecil ke ukuran smartphone, tombol CTA memenuhi lebar layar (*full-width*), dan tabel rincian tetap tertata rapi tanpa terpotong horizontal.

---

## 7. Checklist Pengerjaan Developer

- [ ] Siapkan model data di `localStorage` untuk `kaya_email_settings`, `kaya_email_templates`, dan `kaya_email_logs`.
- [ ] Buat kartu pengaturan konfigurasi SMTP di sub-menu `email-smtp` pada halaman pengaturan.
- [ ] Buat antarmuka daftar template email dengan kemampuan aktivasi dan duplikasi template.
- [ ] Bangun komponen `EmailBlockEditor` dengan dukungan subjek, header, teks, tabel, dan tombol CTA.
- [ ] Bangun komponen `EmailResponsiveSimulator` dengan toggle Desktop vs Mobile dan parser data contoh.
- [ ] Sambungkan aksi verifikasi booking di `/admin/bookings` agar memicu pengiriman email invoice otomatis.
- [ ] Jalankan seluruh skenario pengujian mandiri untuk memastikan fitur email bekerja mulus.
