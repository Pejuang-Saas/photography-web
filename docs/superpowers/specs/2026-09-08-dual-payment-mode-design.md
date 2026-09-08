# Spesifikasi Teknis: Fitur Dual Payment Mode & Alur Checkout Booking (Frontend Mock)

Dokumen spesifikasi teknis ini disusun sebagai panduan implementasi komprehensif bagi **tim developer pemula** untuk mengimplementasikan fitur pengaturan pembayaran dua mode (*Payment Gateway* vs *Transfer Manual*) dan alur checkout pemesanan paket foto di website **Kaya Story**.

---

## 1. Ringkasan & Tujuan Fitur

### 1.1 Latar Belakang
Studio foto Kaya Story membutuhkan fleksibilitas dalam menerima pembayaran dari pelanggan:
1. **Mode 1: Payment Gateway (Otomatis)** — Menggunakan penyedia gateway seperti Midtrans atau Xendit. Pembayaran diverifikasi secara otomatis oleh sistem tanpa intervensi manual.
2. **Mode 2: Transfer Manual (Konfirmasi Admin)** — Pelanggan mentransfer langsung ke rekening bank atau e-wallet studio, kemudian mengunggah bukti transfer yang wajib diverifikasi dan disetujui secara manual oleh admin studio.

### 1.2 Batasan & Lingkup Pekerjaan (Scope)
* **Fokus Penuh pada Frontend (Client-side)**: Tidak melibatkan pembuatan database atau backend server sungguhan.
* **Mock State & Persistensi LocalStorage**: Seluruh status pengaturan dan transaksi disimpan di browser `localStorage` agar dapat diuji secara interaktif antar tab tanpa hilang saat halaman di-refresh.
* **Mutual Exclusion**: Mode 1 dan Mode 2 bersifat saling mematikan (*mutually exclusive*). Jika Mode 1 aktif, Mode 2 mati, dan sebaliknya.

---

## 2. Standar Arsitektur: Komponen Global vs Komponen Lokal

> ⚠️ **PENTING UNTUK DEVELOPER**: Patuhi pemisahan folder komponen di bawah ini. Jangan mencampur komponen spesifik halaman ke dalam folder global, dan jangan membuat duplikasi komponen jika sudah ada komponen global yang bisa digunakan ulang!

### 2.1 Komponen Global (`@/components/ui/` & `@/components/`)
Komponen yang bersifat umum, tidak terikat pada logika bisnis halaman tertentu, dan digunakan di banyak tempat:

| Nama Komponen | Lokasi File | Fungsi |
| :--- | :--- | :--- |
| `Button` | `@/components/ui/button.tsx` | Tombol standar dengan varian (primary, outline, ghost, danger). |
| `Input` | `@/components/ui/input.tsx` | Input teks dan angka standar dengan focus ring seragam. |
| `Dialog` / `Modal` | `@/components/ui/dialog.tsx` | Struktur dasar popup modal (backdrop blur, header, body, footer, tombol close). |
| `Badge` | `@/components/ui/badge.tsx` | Penanda status berwarna (contoh: status Lunas, Menunggu Verifikasi, DP). |
| `Calendar` | `@/components/ui/calendar.tsx` | Komponen penanggalan interaktif untuk memilih tanggal sesi foto. |
| `ImagePreviewModal` | `@/components/image-preview-modal.tsx` | Modal global untuk memperbesar gambar foto bukti transfer saat diklik. |

### 2.2 Komponen Lokal / Khusus Fitur
Komponen yang hanya relevan untuk halaman atau fitur tertentu wajib ditaruh di folder lokal fitur tersebut:

#### A. Komponen Lokal Sisi Admin (`app/admin/settings/components/` & `app/admin/components/`)
* `PaymentSettingsCard.tsx` — Kartu utama pengaturan metode pembayaran di tab Settings.
* `GatewayConfigForm.tsx` — Formulir konfigurasi API Key Midtrans / Xendit.
* `ManualAccountsManager.tsx` — Daftar dan pengelola rekening bank/e-wallet studio.
* `ManualAccountDialog.tsx` — Modal popup untuk menambah atau mengedit rekening studio.
* `BookingDetailModal.tsx` *(revisi)* — Modal detail booking di admin yang dilengkapi penampil struk transfer dan tombol verifikasi/tolak.

#### B. Komponen Lokal Sisi Pengunjung (`app/components/booking/`)
* `BookingMultiStepModal.tsx` — Kontainer utama modal pemesanan bertahap di landing page.
* `StepCustomerSchedule.tsx` — Langkah 1: Input nama, nomor WA, email, tanggal, dan slot jam.
* `StepPaymentOption.tsx` — Langkah 2: Ringkasan paket dan pilihan skema bayar (DP 50% vs Lunas 100%).
* `StepGatewayPayment.tsx` — Langkah 3A: Tampilan simulasi popup payment gateway.
* `StepManualPayment.tsx` — Langkah 3B: Tampilan rekening studio dan formulir upload bukti transfer.
* `StepBookingSuccess.tsx` — Langkah 4: Layar konfirmasi sukses dengan kode booking.

---

## 3. Struktur Data & State Management (TypeScript & LocalStorage)

### 3.1 Kunci LocalStorage yang Digunakan
1. `'kaya_payment_settings'` : Menyimpan konfigurasi aktif pembayaran studio.
2. `'kaya_bookings'` : Menyimpan riwayat semua pemesanan customer (sinkron dengan data admin).

### 3.2 Definisi Tipe Data (`types/payment.ts`)
Buat file baru di `types/payment.ts` dengan struktur berikut:

```typescript
// Pilihan mode pembayaran (hanya salah satu yang boleh aktif)
export type PaymentMode = 'GATEWAY' | 'MANUAL';

// Pilihan provider gateway
export type GatewayProvider = 'MIDTRANS' | 'XENDIT';

// Pilihan lingkungan gateway
export type GatewayEnvironment = 'SANDBOX' | 'PRODUCTION';

// Konfigurasi Payment Gateway
export interface GatewayConfig {
  provider: GatewayProvider;
  environment: GatewayEnvironment;
  // Kebutuhan Midtrans
  merchantId?: string;
  clientKey?: string;
  serverKey?: string;
  // Kebutuhan Xendit
  publicKey?: string;
  secretKey?: string;
}

// Rekening Bank / E-Wallet Manual Studio
export interface ManualBankAccount {
  id: string;
  bankName: string;      // Contoh: "BCA", "Mandiri", "GoPay", "QRIS"
  accountNumber: string; // Nomor rekening atau nomor HP e-wallet
  accountHolder: string; // Nama atas nama pemilik rekening
  isActive: boolean;     // Status apakah rekening ini aktif digunakan
  isPrimary?: boolean;   // Penanda rekening utama
}

// Model Pengaturan Pembayaran Keseluruhan
export interface StudioPaymentSettings {
  activeMode: PaymentMode;
  allowDownPayment: boolean; // default: true (mengizinkan DP 50%)
  gateway: GatewayConfig;
  manualAccounts: ManualBankAccount[];
}

// Status Pembayaran Transaksi
export type PaymentStatus =
  | 'UNPAID'               // Belum dibayar
  | 'WAITING_CONFIRMATION' // Khusus Manual: Customer sudah upload bukti, tunggu approval admin
  | 'PAID_DP'              // Pembayaran uang muka (DP 50%) terverifikasi
  | 'PAID_FULL'            // Pembayaran lunas 100% terverifikasi
  | 'REJECTED';            // Bukti pembayaran ditolak admin

// Status Sesi Booking Studio
export type BookingStatus =
  | 'PENDING_VERIFICATION' // Menunggu verifikasi admin (khusus alur manual)
  | 'CONFIRMED'            // Jadwal resmi terkonfirmasi
  | 'COMPLETED'            // Sesi foto selesai
  | 'CANCELLED';           // Dibatalkan
```

### 3.3 Data Awal Default (`lib/mock-payment-settings.ts`)
```typescript
import { StudioPaymentSettings } from '@/types/payment';

export const INITIAL_PAYMENT_SETTINGS: StudioPaymentSettings = {
  activeMode: 'MANUAL', // Default awal: Manual Transfer
  allowDownPayment: true,
  gateway: {
    provider: 'MIDTRANS',
    environment: 'SANDBOX',
    merchantId: 'M-KYA-89021',
    clientKey: 'SB-Mid-client-XXXXX123',
    serverKey: 'SB-Mid-server-YYYYY456',
    publicKey: 'xnd_public_test_abc123',
    secretKey: 'xnd_secret_test_def456',
  },
  manualAccounts: [
    {
      id: 'acc-1',
      bankName: 'Bank BCA',
      accountNumber: '8030-8819-20',
      accountHolder: 'Bima Satria (Studio Owner)',
      isActive: true,
      isPrimary: true,
    },
    {
      id: 'acc-2',
      bankName: 'Bank Mandiri',
      accountNumber: '136-00-1289-4412',
      accountHolder: 'Kayastory Photography Studio',
      isActive: true,
      isPrimary: false,
    },
    {
      id: 'acc-3',
      bankName: 'QRIS All Payment',
      accountNumber: 'NMID: ID1020039481928',
      accountHolder: 'Kayastory Studio Semarang',
      isActive: true,
      isPrimary: false,
    },
  ],
};
```

---

## 4. Rincian Fitur Halaman Admin (`/admin/settings` & `/admin/bookings`)

### 4.1 Pengaturan Metode Pembayaran di `/admin/settings`

#### Komponen: `PaymentSettingsCard.tsx`
Menampilkan pemilih mode pembayaran eksklusif:
1. **Radio Group / Segmented Switcher**:
   - Pilihan: **"Mode 1: Payment Gateway (Otomatis)"** vs **"Mode 2: Transfer Manual (Verifikasi Admin)"**.
   - Saat salah satu mode dipilih, state `activeMode` berubah di `localStorage`.

2. **Perilaku Visual Saling Mematikan (*Mutual Exclusion*)**:
   - Bagian mode yang **sedang aktif** memiliki border terang/aksen, teks jelas, dan interaktif.
   - Bagian mode yang **tidak aktif** memiliki styling:
     ```tsx
     className={activeMode !== 'GATEWAY' ? 'opacity-40 pointer-events-none grayscale select-none' : ''}
     ```
   - Terdapat label badge penanda status: `"Aktif"` (hijau) atau `"Non-Aktif"` (abu-abu).

#### Form Opsi 1: Payment Gateway (`GatewayConfigForm.tsx`)
* **Pilihan Provider**: Dropdown `<select>` dengan opsi **Midtrans** dan **Xendit**.
* **Pilihan Mode**: Radio toggle **Sandbox / Test Mode** vs **Production / Live Mode**.
* **Input Dinamis**:
  - *Jika Midtrans dipilih*:
    - Field `Merchant ID`: Input teks (contoh: `M-KYA-89021`).
    - Field `Client Key`: Input teks.
    - Field `Server Key`: Input bertipe password dengan tombol toggle intip password (*Eye / EyeOff icon*).
  - *Jika Xendit dipilih*:
    - Field `Public Key`: Input teks (contoh: `xnd_public_...`).
    - Field `Secret Key`: Input bertipe password dengan tombol toggle intip password.
* **Tombol Simpan**: Mengubah state dan menampilkan notifikasi `toast.success("Pengaturan Payment Gateway berhasil disimpan")`.

#### Form Opsi 2: Transfer Manual (`ManualAccountsManager.tsx`)
* Menampilkan daftar kartu rekening yang tersimpan.
* Setiap kartu menampilkan: Logo/Nama Bank, Nomor Rekening, Nama Pemilik Rekening, dan Badge `Aktif` / `Utama`.
* **Aksi per Rekening**:
  - Switcher On/Off untuk mengaktifkan atau menonaktifkan rekening tertentu.
  - Tombol Edit (membuka dialog ubah data).
  - Tombol Hapus (dengan konfirmasi).
* **Tombol Tambah Rekening**: Membuka modal popup `ManualAccountDialog.tsx` dengan field: Nama Bank/E-wallet, Nomor Rekening, Atas Nama, dan checkbox *"Jadikan Rekening Utama"*.

---

### 4.2 Verifikasi Pembayaran Manual di `/admin/bookings`

#### Perbedaan Tampilan Status Booking:
* **Booking via Gateway**:
  - Badge Pembayaran: Hijau (`LUNAS` atau `DP 50%`).
  - Keterangan: `Otomatis via Midtrans/Xendit`.
  - Tidak memerlukan tombol verifikasi manual.
* **Booking via Manual**:
  - Badge Pembayaran: Oranye/Amber (`Menunggu Verifikasi`).
  - Keterangan: `Transfer Manual (BCA/Mandiri)`.
  - Terdapat tombol aksi sorotan: **"Periksa Bukti Bayar"**.

#### Modal Detail & Verifikasi: `BookingDetailModal.tsx`
Ketika baris booking diklik:
1. **Bagian Informasi Bukti Bayar**:
   - Menampilkan Nama Rekening Pengirim.
   - Menampilkan Bank Tujuan.
   - Menampilkan thumbnail gambar **Bukti Transfer (Struk)**. Saat gambar diklik, buka `ImagePreviewModal` untuk zoom resolusi penuh.
2. **Opsi Verifikasi**:
   - Radio pilihan: *"Verifikasi sebagai LUNAS"* atau *"Verifikasi sebagai DP 50%"*.
   - Input nominal yang diterima (otomatis terisi nominal tagihan, namun bisa diedit admin jika ada pembulatan).
3. **Tombol Keputusan**:
   - **Tombol Hijau "Verifikasi Pembayaran"**:
     - Mengubah booking `status` -> `'CONFIRMED'`.
     - Mengubah `paymentStatus` -> `'PAID_FULL'` atau `'PAID_DP'`.
     - Menghasilkan nomor invoice resmi (contoh: `INV-KYA-2026-781`).
     - Menampilkan toast sukses: *"Pembayaran berhasil diverifikasi. Notifikasi WhatsApp terkirim ke customer."*
   - **Tombol Merah "Tolak Pembayaran"**:
     - Membuka kolom input teks alasan penolakan (misal: *"Nominal tidak cocok"* atau *"Foto struk buram/tidak terbaca"*).
     - Mengubah `paymentStatus` -> `'REJECTED'`.
     - Menampilkan toast peringatan.

---

## 5. Rincian Fitur Sisi Pengunjung (Landing Page Modal Multi-Step)

### 5.1 Pemicu Modal
Pada komponen kartu paket (`PackageCard.tsx`), tombol CTA diganti dari link WhatsApp langsung menjadi pemicu pembuka modal:
```tsx
<button onClick={() => handleOpenBooking(pkg)}>
  Pilih Paket Ini
</button>
```

### 5.2 Alur 4 Langkah Checkout Modal (`BookingMultiStepModal.tsx`)

#### Langkah 1: Data Diri & Jadwal (`StepCustomerSchedule.tsx`)
* **Input Formulir**:
  - `Nama Pemesan`: Wajib diisi (minimal 3 huruf).
  - `Nomor WhatsApp`: Wajib diisi (format angka 10–14 digit).
  - `Email`: Wajib diisi (validasi format email).
  - `Tanggal Pemotretan`: Menggunakan komponen `Calendar`. Tanggal di masa lalu tidak dapat dipilih.
  - `Pilihan Slot Jam`: Pilihan tombol pill: `09:00`, `11:00`, `13:00`, `15:00`, `17:00`.
  - `Catatan Khusus` (opsional): Area teks untuk permintaan khusus (contoh: *"Bawa 1 anjing peliharaan"*).
* Tombol: *"Lanjut ke Pembayaran ->"* (hanya aktif jika semua input wajib valid).

#### Langkah 2: Skema Pembayaran (`StepPaymentOption.tsx`)
* Menampilkan ringkasan: Nama Paket, Tanggal & Jam Sesi, serta Total Biaya Paket.
* **Pilihan Radio Skema Pembayaran**:
  - Bayar DP 50%: Nominal dihitung otomatis `totalPrice / 2`. Terdapat teks bantuan: *"Sisa 50% dilunasi langsung di studio saat sesi foto."*
  - Bayar Lunas 100%: Membayar keseluruhan biaya sesi di awal.
* Tombol: *"Lanjut Bayar"*.

#### Langkah 3A: Eksekusi Mode Payment Gateway (`StepGatewayPayment.tsx`)
*(Tampil otomatis jika `activeMode === 'GATEWAY'`)*
* Menampilkan kartu tagihan dengan logo provider (`Midtrans` atau `Xendit`).
* Pilihan metode simulasi: QRIS, BCA Virtual Account, atau Kartu Kredit.
* **Panel Khusus Testing Frontend**:
  - Tombol Hijau: **[Simulasikan Bayar Berhasil]**
    - Langsung membuat data booking baru di `localStorage` dengan `status: 'CONFIRMED'`, `paymentStatus: isDP ? 'PAID_DP' : 'PAID_FULL'`.
    - Pindah ke Langkah 4 (Sukses).
  - Tombol Merah: **[Simulasikan Gagal / Batal]**
    - Menampilkan pesan error: *"Simulasi Pembayaran Gagal: Saldo tidak mencukupi atau transaksi dibatalkan."* dengan tombol *"Coba Lagi"*.

#### Langkah 3B: Eksekusi Mode Transfer Manual (`StepManualPayment.tsx`)
*(Tampil otomatis jika `activeMode === 'MANUAL'`)*
* Menampilkan daftar rekening studio yang aktif (Nomor Rekening, Nama Bank, Atas Nama, dan tombol *"Salin Nomor"*).
* Menampilkan nominal pasti yang harus ditransfer (DP atau Lunas).
* **Form Konfirmasi Transfer**:
  - Input teks: `Nama Pemilik Rekening Pengirim` (contoh: *"Budi Santoso"*).
  - Input file: `Unggah Bukti Struk Transfer` (menerima file `.jpg`, `.jpeg`, `.png`, `.webp`, maksimal 5MB).
  - Menampilkan **preview foto struk** secara langsung di dalam modal menggunakan `FileReader` (base64 string).
* Tombol: *"Kirim Bukti Pembayaran"*.
  - Menyimpan data booking baru di `localStorage` dengan `status: 'PENDING_VERIFICATION'`, `paymentStatus: 'WAITING_CONFIRMATION'`, dan data foto bukti transfer.
  - Pindah ke Langkah 4 (Sukses).

#### Langkah 4: Layar Sukses & Konfirmasi (`StepBookingSuccess.tsx`)
* Menampilkan ikon centang animasi dan **Nomor Referensi Booking** (contoh: `#KYA-2026-904`).
* **Pesan Kondisional**:
  - *Jika via Gateway*:
    - Judul: *"Pembayaran Terkonfirmasi Otomatis! 🎉"*
    - Pesan: *"Slot jadwal pemotretan kamu telah resmi terkunci. Invoice resmi telah diterbitkan."*
    - Tombol: *"Buka WhatsApp Studio"* & *"Tutup"*.
  - *Jika via Manual*:
    - Judul: *"Bukti Pembayaran Berhasil Dikirim! ⏳"*
    - Pesan: *"Admin studio kami akan memverifikasi bukti transfer kamu dalam 1x24 jam. Kami akan mengirim konfirmasi invoice melalui WhatsApp."*
    - Tombol: *"Konfirmasi Cepat ke WA Admin"* & *"Tutup"*.

---

## 6. Validasi Form & Error Handling

### 6.1 Validasi Input Pengunjung
```typescript
export function validateBookingForm(data: {
  name?: string;
  phone?: string;
  email?: string;
  sessionDate?: string;
  sessionTime?: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.name || data.name.trim().length < 3) {
    errors.name = 'Nama lengkap minimal 3 karakter.';
  }

  const phoneClean = (data.phone || '').replace(/[^0-9]/g, '');
  if (phoneClean.length < 10 || phoneClean.length > 14) {
    errors.phone = 'Nomor WhatsApp tidak valid (10-14 digit angka).';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = 'Format email tidak valid.';
  }

  if (!data.sessionDate) {
    errors.sessionDate = 'Silakan pilih tanggal sesi foto.';
  }

  if (!data.sessionTime) {
    errors.sessionTime = 'Silakan pilih slot jam sesi foto.';
  }

  return errors;
}
```

### 6.2 Safe LocalStorage Helper
```typescript
export function getStoredData<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Gagal membaca key ${key} dari localStorage:`, error);
    return fallback;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Gagal menyimpan key ${key} ke localStorage:`, error);
  }
}
```

---

## 7. Panduan Pengujian Mandiri (Testing Guide)

Bagi developer yang mengimplementasikan fitur ini, lakukan pengujian mandiri dengan skenario berikut:

### Skenario 1: Pengujian Mode Payment Gateway
1. Buka browser di URL `http://localhost:3000/admin/settings`.
2. Pada kartu **Metode Pembayaran**, pilih **Mode 1: Payment Gateway**.
3. Pilih provider **Midtrans**, mode **Sandbox**, pastikan kolom Key terisi, lalu klik **Simpan Pengaturan Gateway**. Pastikan muncul notifikasi sukses.
4. Buka tab baru di browser pada halaman utama `http://localhost:3000/`.
5. Scroll ke bagian Paket Foto, klik tombol **Pilih Paket** pada salah satu paket.
6. Isi formulir data diri lengkap dan pilih tanggal serta jam sesi -> Klik **Lanjut ke Pembayaran**.
7. Pilih opsi **Bayar DP 50%** -> Klik **Lanjut Bayar**.
8. Perhatikan bahwa yang muncul adalah popup simulasi Payment Gateway. Klik tombol hijau **[Simulasikan Bayar Berhasil]**.
9. Periksa layar sukses: Harus muncul kode booking dan status terkonfirmasi otomatis.
10. Kembali ke tab admin `http://localhost:3000/admin/bookings`: Booking baru harus langsung muncul di urutan teratas dengan badge hijau **PAID_DP (Lunas DP)** dan status **CONFIRMED**.

### Skenario 2: Pengujian Mode Transfer Manual & Verifikasi Admin
1. Di halaman `http://localhost:3000/admin/settings`, ubah mode ke **Mode 2: Transfer Manual**. Pastikan rekening Bank BCA berstatus aktif.
2. Buka tab landing page `http://localhost:3000/`, klik **Pilih Paket**.
3. Isi data pemesan dan pilih jadwal -> Pilih **Bayar Lunas 100%** -> Klik **Lanjut Bayar**.
4. Perhatikan bahwa yang muncul adalah instruksi transfer rekening Bank BCA.
5. Masukkan nama pengirim (contoh: *"Rian Pratama"*), pilih file gambar struk transfer apa saja dari komputer Anda. Pastikan preview gambar langsung tampil.
6. Klik tombol **Kirim Bukti Pembayaran**. Periksa layar sukses: Harus muncul pesan *"Menunggu verifikasi admin"*.
7. Buka tab `http://localhost:3000/admin/bookings`:
   - Booking baru harus berstatus **Menunggu Verifikasi** (badge oranye).
   - Klik baris booking tersebut untuk membuka modal detail.
   - Pastikan foto struk transfer yang Anda unggah tadi tampil dengan jelas.
   - Klik tombol hijau **Verifikasi Pembayaran**.
   - Periksa bahwa status booking langsung berubah menjadi hijau **LUNAS / CONFIRMED** dan nomor invoice resmi berhasil diterbitkan.

---

## 8. Ringkasan Checklist Pengerjaan Developer

- [ ] Buat file tipe data di `types/payment.ts`.
- [ ] Buat data awal mock di `lib/mock-payment-settings.ts`.
- [ ] Buat custom hook `usePaymentSettings()` untuk read/write ke `localStorage`.
- [ ] Implementasikan kartu pengaturan di `app/admin/settings/components/PaymentSettingsCard.tsx` beserta form Midtrans/Xendit dan rekening manual.
- [ ] Hubungkan `BookingDetailModal.tsx` di admin agar menampilkan bukti bayar manual dan aksi verifikasi/tolak.
- [ ] Implementasikan modal checkout pengunjung `app/components/booking/BookingMultiStepModal.tsx` beserta step 1 sampai 4.
- [ ] Ganti event tombol *"Pilih Paket"* di `app/components/package-card.tsx` agar memicu modal booking.
- [ ] Lakukan uji coba menyeluruh sesuai skenario testing di atas.
