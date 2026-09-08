# Spesifikasi Teknis: WhatsApp Message Template Builder & Live Smartphone Simulator

Dokumen ini adalah panduan spesifikasi teknis dan fungsional untuk membangun fitur **Visual Template Builder WhatsApp** di website studio foto **Kaya Story**.

Fitur ini memungkinkan admin studio merancang, menyesuaikan, menyisipkan variabel dinamis secara instan, memeriksa indikator kesehatan pesan (anti-spam), serta melihat pratinjau pesan secara langsung (*live preview*) pada bingkai simulator smartphone WhatsApp tanpa menulis kode kodingan.

---

## 1. Ringkasan & Tujuan Fitur

### 1.1 Latar Belakang & Masalah
* **Personalisasi Pesan Otomatis**: Studio membutuhkan format pesan yang bervariasi untuk berbagai tahap (konfirmasi booking, instruksi DP, verifikasi invoice, pengingat H-1, penyerahan link Google Drive, hingga ucapan terima kasih).
* **Kemudahan untuk Admin Non-Teknis**: Admin harus dapat menyusun kalimat pesan sendiri dan menyisipkan variabel (seperti nama pelanggan, tanggal sesi, link invoice) hanya dengan **mengklik tombol tag/chip variabel** tanpa risiko salah ketik tanda kurung kurawal `{}`.
* **Simulator WhatsApp Real-Time**: Memberikan visualisasi nyata berbentuk layar smartphone WhatsApp sehingga admin tahu persis bagaimana pesan tersebut akan terlihat di layar HP pelanggan.
* **Penyedia Template untuk Proteksi Anti-Ban Mini CRM**: Template yang dibuat di sini akan menjadi sumber **Template Resmi** yang digunakan oleh Mini CRM ketika jendela 24 jam pelanggan telah berakhir.

### 1.2 Lokasi Penempatan Fitur
* **Halaman Utama Builder**: Ditempatkan pada **Menu Settings -> Sub-Menu "Template WhatsApp" (`/admin/settings?tab=whatsapp-templates`)**.
* **Pintasan Akses Cepat**: Pada antarmuka Mini CRM (`/admin/crm`), disediakan tombol **"⚙️ Kelola Template"** yang langsung mengarahkan admin ke halaman builder ini.

---

## 2. Standar Arsitektur: Komponen Global vs Komponen Lokal

### 2.1 Komponen Global (`components/` atau `components/ui/`)
* `Button`: Tombol standar aksi (Simpan, Batal, Kirim Test).
* `Input` & `Textarea`: Area pengetikan teks template dan input nama.
* `Badge`: Label penanda kategori pesan (Transaksional, Pengingat, Foto Selesai).
* `Dialog`: Modal jendela pop-up konfirmasi atau editor penuh.
* `Tooltip`: Penjelasan fungsi variabel saat kursor diarahkan ke tombol tag.

### 2.2 Komponen Lokal Halaman (`app/admin/settings/components/template-builder/`)
* `TemplateListTable.tsx`: Tabel daftar seluruh template yang sudah tersimpan dengan tombol edit, duplikasi, dan status aktif/nonaktif.
* `TemplateEditorWorkspace.tsx`: Kontainer kerja 2 kolom (sisi kiri form editor, sisi kanan simulator smartphone).
* `VariableChipsBar.tsx`: Bilah tombol tag variabel dinamis yang bisa diklik untuk menyisipkan teks otomatis.
* `WhatsappPhoneSimulator.tsx`: Simulator bingkai smartphone WhatsApp dengan gelembung chat hijau realistis.
* `TemplateHealthIndicator.tsx`: Kartu evaluasi kualitas pesan (anti-spam checker) yang menganalisis penggunaan huruf kapital berlebih dan kelengkapan variabel.

---

## 3. Kebutuhan Data (Data Model di `localStorage`)

Semua template disimpan pada `localStorage` dengan kunci **`kaya_message_templates`**, terhubung dengan data layer master.

Setiap template memuat informasi berikut:
* **ID & Nama Template**: Nama pengenal (contoh: *"Pengingat Photoshoot H-1"*, *"Invoice & Verifikasi DP"*).
* **Kode Unik Identifikasi**: Kode kategori pemicu (misal: `NEW_BOOKING`, `PAYMENT_VERIFIED`, `REMINDER_H1`, `PHOTO_DELIVERY`, `CUSTOM_PROMO`).
* **Kategori Pesan**:
  - `TRANSACTIONAL` (Konfirmasi booking & pembayaran).
  - `REMINDER` (Pengingat jadwal H-1 atau hari-H).
  - `DELIVERY` (Pengiriman link drive hasil foto).
  - `FOLLOW_UP` (Follow-up prospek atau re-engagement).
* **Isi Teks Template**: Teks lengkap pesan yang mengandung tag variabel dinamis seperti `{customer_name}`, `{session_date}`, dll.
* **Pemicu Otomatis (Trigger Event)**:
  - *Otomatis saat booking baru masuk*.
  - *Otomatis saat pembayaran diverifikasi admin*.
  - *Manual via tombol Mini CRM*.
* **Status Aktif**: Toggle apakah template ini aktif digunakan dalam sistem atau diarsipkan.

---

## 4. Rincian Antarmuka Template Builder (Tata Letak 2 Kolom)

Antarmuka pembuatan template menggunakan tata letak kerja berdampingan (*side-by-side*):

```
┌────────────────────────────────────────────────────────┬────────────────────────────────────────┐
│ KOLOM KIRI: FORM EDITOR & VARIABLE CHIPS               │ KOLOM KANAN: LIVE SMARTPHONE SIMULATOR │
├────────────────────────────────────────────────────────┼────────────────────────────────────────┤
│ • Nama Template & Pilihan Kategori Pemicu              │ ┌────────────── SMARTPHONE ──────────┐ │
│ • BILAH VARIABLE CHIPS (Klik untuk Sisipkan):          │ │ [Header WhatsApp Kayastory Studio] │ │
│   [+ Nama Klien] [+ Tanggal] [+ Jam] [+ Paket]         │ │                                    │ │
│   [+ No. Invoice] [+ Link Drive] [+ Lokasi Studio]     │ │  ┌─ Gelembung Pesan Hijau ──────┐  │ │
│ • AREA EDITOR TEKS:                                    │ │  │ Halo Kak Anisa Rahmawati! ✨ │  │ │
│   - Tombol Format WhatsApp: [*B*] [_I_] [~S~]          │ │  │ Jadwal foto wisuda Anda:     │  │ │
│   - Textarea dengan penyorotan variabel dinamis        │ │  │ 📅 25 Agustus 2026           │  │ │
│ • INDIKATOR KESEHATAN ANTI-SPAM (🟢 Aman / 🟡 Waspada) │ │  │ 🔗 https://kayastory.id/...  │  │ │
│ • FORM UJI COBA KIRIM PESAN:                           │ │  │ 14:32 //                     │  │ │
│   - Input Nomor WA Tujuan & Tombol "Kirim Test"        │ │  └──────────────────────────────┘  │ │
│ • Tombol: [Batal] [Simpan Template]                    │ └────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┴────────────────────────────────────────┘
```

### 4.1 Kolom Kiri: Formulir Editor & Sisip Variabel

#### 1. Pengaturan Identitas Template
* Input teks nama template yang mudah dipahami (misal: *"Konfirmasi Pelunasan & Tiket Studio"*).
* Pilihan dropdown kategori: Transaksional, Pengingat, Pengiriman Foto, atau Kustom.

#### 2. Bilah Tag Variabel Dinamis (*Variable Chips*)
Admin dapat menyisipkan variabel cukup dengan **mengklik tombol pill** tanpa mengetik manual:
* `[+ Nama Klien]` $\rightarrow$ menyisipkan `{customer_name}`
* `[+ Kode Booking]` $\rightarrow$ menyisipkan `{booking_code}`
* `[+ Nama Paket]` $\rightarrow$ menyisipkan `{package_name}`
* `[+ Tanggal Sesi]` $\rightarrow$ menyisipkan `{session_date}`
* `[+ Jam Sesi]` $\rightarrow$ menyisipkan `{session_time}`
* `[+ Total Biaya]` $\rightarrow$ menyisipkan `{total_price}`
* `[+ Nominal Bayar]` $\rightarrow$ menyisipkan `{payment_amount}`
* `[+ Link Invoice]` $\rightarrow$ menyisipkan `{invoice_url}`
* `[+ Link Google Drive]` $\rightarrow$ menyisipkan `{drive_url}`
* `[+ Lokasi Studio]` $\rightarrow$ menyisipkan `{location}`
* `[+ Nama Fotografer]` $\rightarrow$ menyisipkan `{photographer}`

#### 3. Area Pengetikan & Alat Format WhatsApp
* Kotak teks (`Textarea`) fleksibel yang secara real-time mengirim perubahan teks ke simulator di sebelah kanan.
* **Bilah Tombol Pintas Format Teks WhatsApp**:
  - Tombol **[Tebal]** $\rightarrow$ otomatis membungkus kata dengan tanda bintang (`*teks*`).
  - Tombol **[Miring]** $\rightarrow$ membungkus kata dengan garis bawah (`_teks_`).
  - Tombol **[Coret]** $\rightarrow$ membungkus kata dengan tilde (`~teks~`).
  - Tombol **[Emoji Picker]** $\rightarrow$ membuka palet emoji ramah (📸, 🎓, ✨, 📅, 📍, 🔔, ✅).
* Penghitung jumlah karakter dan perkiraan estimasi panjang pesan.

#### 4. Indikator Kesehatan Pesan (Anti-Spam Health Checker)
Sistem secara otomatis menganalisis isi pesan untuk mencegah nomor studio terdeteksi sebagai akun spam:
* Memeriksa apakah ada variabel yang pengetikannya salah/rusak.
* Memeriksa apakah terdapat penggunaan huruf besar berlebihan (*CAPSLOCK*) yang terkesan berteriak atau seperti pesan penipuan.
* Menampilkan badge evaluasi:
  - 🟢 **Sangat Baik**: *"Pesan ramah, terstruktur sopan, dan aman dari filter spam."*
  - 🟡 **Perhatian**: *"Terlalu banyak huruf kapital atau karakter tanda seru berulang (!!!). Disarankan menggunakan kalimat yang lebih tenang."*

#### 5. Fitur Uji Kirim Pesan (Test Send)
* Di bagian bawah form, tersedia input nomor telepon WhatsApp uji coba (misal: nomor pribadi admin).
* Tombol **"Kirim Pesan Uji Coba"**: Mensimulasikan pengiriman pesan dengan data contoh (dummy data) langsung ke nomor tujuan dan memunculkan toast konfirmasi.

---

### 4.2 Kolom Kanan: Simulator Smartphone WhatsApp Interaktif

Simulator ini memberikan gambaran visual yang nyata:
* **Bingkai Fisik Smartphone**: Menampilkan mockup layar smartphone dengan bar status jam, sinyal, dan baterai.
* **Header WhatsApp Asli**:
  - Tombol kembali panah kiri.
  - Avatar foto logo resmi studio *Kaya Story*.
  - Nama akun: *"Kayastory Photography Studio"*.
  - Status teks hijau: *"online"*.
* **Gelembung Obrolan (Chat Bubble)**:
  - Berwarna hijau muda khas pesan keluar WhatsApp (`#d9fdd3` di mode terang / `#005c4b` di mode gelap).
  - Teks yang diformat dengan tanda bintang otomatis tampil **tebal**, tanda garis bawah tampil *miring*, dan link tampil berwarna biru yang dapat diklik.
* **Penggantian Nilai Contoh Otomatis (Dummy Data Resolver)**:
  - Variabel tidak ditampilkan sebagai kode mentah `{customer_name}`, melainkan langsung digantikan dengan data contoh realistis:
    - `{customer_name}` $\rightarrow$ **Anisa Rahmawati**
    - `{package_name}` $\rightarrow$ **Solo Kebaya Signature**
    - `{session_date}` $\rightarrow$ **Selasa, 25 Agustus 2026**
    - `{session_time}` $\rightarrow$ **09:00 WIB**
    - `{total_price}` $\rightarrow$ **Rp 645.000**
    - `{invoice_url}` $\rightarrow$ `https://kayastory.id/inv/KYA-2026-081`
* **Elemen Akhir Balon Chat**: Menampilkan jam waktu kirim dan centang dua biru (*read receipt*).

---

## 5. Integrasi dengan Sistem Lain di Aplikasi

### 5.1 Keterhubungan dengan Mini CRM (`/admin/crm`)
* Ketika admin sedang berada di Mini CRM dan memilih salah satu kontak yang jendela 24 jamnya sudah kedaluwarsa, pemilih template resmi (*Template Selector*) **hanya menampilkan template yang berstatus aktif dari Template Builder ini**.
* Di bagian bawah pemilih template pada CRM, ada tombol: *"Kelola / Tambah Template Baru"* yang langsung melompat ke sub-menu Template WhatsApp di Settings.

### 5.2 Keterhubungan dengan Verifikasi Pembayaran (`/admin/bookings`)
* Saat admin memverifikasi pembayaran manual di daftar booking dan menekan tombol *"Verifikasi & Terbitkan Invoice"*, pesan konfirmasi WhatsApp yang disimulasikan otomatis mengambil teks dari template berkode `PAYMENT_VERIFIED` yang terakhir kali diedit oleh admin di builder ini.

---

## 6. Skenario Pengujian Mandiri untuk Developer (Testing Guide)

Developer yang mengerjakan fitur ini dapat menguji alurnya dengan langkah berikut:

### Skenario 1: Uji Pembuatan Template dengan Variabel Dinamis
1. Buka `/admin/settings`, pilih sub-menu **Template WhatsApp**.
2. Klik tombol **Buat Template Baru**.
3. Masukkan nama template: *"Konfirmasi Wisuda Undip"*, pilih kategori *Transaksional*.
4. Pada kolom pengetikan teks, ketik kalimat sapaan, lalu klik tombol chip **[+ Nama Klien]**. Pastikan tag `{customer_name}` tersisip di posisi kursor.
5. Perhatikan layar simulator smartphone di sisi kanan: Pastikan teks `{customer_name}` otomatis berganti menjadi nama contoh *"Anisa Rahmawati"*.
6. Sisipkan variabel tanggal, jam, dan link invoice, lalu simpan.
7. Pastikan template baru tersebut muncul di tabel daftar template.

### Skenario 2: Uji Evaluasi Anti-Spam & Simulator Format
1. Buka salah satu template untuk diedit.
2. Blok salah satu kata penting dan klik tombol **[Tebal]** $\rightarrow$ pastikan terbungkus tanda bintang `*kata*` dan pada simulator teks tersebut seketika menjadi tebal.
3. Coba ketik kalimat dengan huruf besar semua: *"PROMO DISKON GILA-GILAAN HARI INI SAJA!!!"*.
4. Perhatikan kartu indikator kesehatan pesan: Status harus berubah menjadi kuning/peringatan anti-spam dengan saran perbaikan.

### Skenario 3: Uji Keterhubungan ke Mini CRM
1. Buka halaman Mini CRM di `/admin/crm`.
2. Pilih kontak dengan status jendela 24 jam kedaluwarsa (banner merah).
3. Buka pemilih template resmi: Pastikan template baru yang tadi dibuat pada Skenario 1 terdaftar dan bisa dipilih.
4. Klik template tersebut $\rightarrow$ pastikan pesan otomatis terisi dengan data customer yang bersangkutan dan siap dikirimkan.

---

## 7. Checklist Pengerjaan Developer

- [ ] Siapkan model data `kaya_message_templates` di penyimpanan `localStorage` lengkap dengan template default bawaan.
- [ ] Buat sub-menu baru `whatsapp-templates` pada halaman `/admin/settings` (pada tata letak navigasi 2 kolom settings).
- [ ] Buat komponen bilah tag variabel dinamis (`VariableChipsBar`) yang menyisipkan placeholder ke dalam teks.
- [ ] Buat komponen simulator smartphone WhatsApp interaktif (`WhatsappPhoneSimulator`) dengan parser variabel contoh (dummy data).
- [ ] Implementasikan indikator kesehatan pesan anti-spam sederhana.
- [ ] Tambahkan simulasi uji coba kirim pesan test ke nomor tujuan.
- [ ] Hubungkan daftar template di builder ini ke pemilih template resmi pada Mini CRM (`/admin/crm`).
- [ ] Jalankan seluruh skenario pengujian mandiri untuk memverifikasi bahwa builder dan simulator bekerja sinkron.
