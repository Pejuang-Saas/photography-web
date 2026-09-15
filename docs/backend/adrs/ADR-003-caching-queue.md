# ADR-003: Caching & Asynchronous Task Queue Menggunakan Redis 7 & BullMQ

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead

---

## 1. Konteks & Permasalahan
Operasi backend studio foto melibatkan sejumlah tugas berat yang memiliki latensi tinggi (*high latency I/O*):
1. **Rendering Dokumen PDF Invoice**: Membutuhkan pemrosesan layout HTML ke PDF (1.5 - 3 detik).
2. **Koneksi HTTP Dispatch ke WAHA (WhatsApp API)**: Komunikasi socket dan pengiriman media ke server WhatsApp (1 - 4 detik).
3. **Pengiriman Email SMTP dengan Attachment**: Negosiasi handshake TLS ke server SMTP (2 - 5 detik).
4. **Pembacaan Slot Jadwal**: Ribuan pengunjung landing page memeriksa ketersediaan tanggal yang sama berulang kali.

Jika seluruh tugas ini dijalankan secara sinkronus (*blocking* di dalam controller HTTP), pengguna akan mengalami loading lama saat checkout atau verifikasi pembayaran, serta rentan mengalami HTTP Timeout (504).

## 2. Keputusan Arsitektur
Kami memilih **Redis 7** (menggunakan kontainer eksisting `dev-redis` pada `dev-network`) sebagai infrastruktur ganda untuk **Cache Layer** dan **BullMQ Queue Broker**:
1. **Queueing Terisolasi**:
   - `Queue: notifications-wa`: Mengelola antrian pengiriman teks & file PDF ke WAHA.
   - `Queue: notifications-email`: Mengelola antrian SMTP pengiriman invoice.
   - `Queue: pdf-renderer`: Mengelola kompilasi PDF tanpa membebani thread HTTP utama.
2. **Retry & Backoff Strategy**: Setiap kegagalan koneksi ke WAHA atau SMTP otomatis diulang (*exponential backoff retry*) hingga 3 kali.
3. **In-Memory Caching**: Cache katalog paket foto (`GET /packages`) dan profil studio di memori Redis dengan TTL (Time-To-Live) 1 jam, yang otomatis di-invalidate saat admin melakukan update.

## 3. Konsekuensi
- **Positif (+)**:
  - Latensi respons HTTP checkout dan verifikasi pembayaran turun drastis ke < 80ms.
  - Sistem memiliki toleransi kegagalan (*fault-tolerance*): jika WAHA restart, pesan antrian tidak hilang dan akan terkirim begitu WAHA aktif kembali.
- **Negatif (-)**:
  - Membutuhkan penanganan status monitoring antrian (misal menggunakan Bull-Board dashboard untuk admin teknis).
