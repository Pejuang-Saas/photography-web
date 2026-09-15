# ADR-005: Desain Dual-Mode Pembayaran (Manual Verification vs Payment Gateway)

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead

---

## 1. Konteks & Permasalahan
Mengacu pada dokumen spesifikasi `docs/frontend/superpowers/specs/2026-09-08-dual-payment-mode-design.md`:
Sebagian besar mahasiswa wisudawan di Tembalang (Undip, Polines, dsb.) lebih menyukai transfer langsung ke rekening bank lokal (BCA/Mandiri) tanpa biaya admin gateway (Rp 2.000 - Rp 4.000). Di sisi lain, pelanggan keluarga atau pemesan mendadak menginginkan pembayaran instan (QRIS / Virtual Account otomatis).
Selain itu, transfer manual rawan pemalsuan bukti bayar (*fake receipt / slip palsu*).

## 2. Keputusan Arsitektur
1. **Pemisahan Mode Pembayaran yang Dapat Dikonfigurasi**:
   - Kolom `studio_settings.is_manual_active` dan `is_gateway_active` mengontrol metode yang ditawarkan di antarmuka checkout.
2. **Audit Trail Verifikasi Manual**:
   - Saat bukti transfer diunggah: status diset ke `WAITING_CONFIRMATION`.
   - Admin wajib memasukkan `verifiedAmount` riil berdasarkan cek mutasi m-banking sebelum menekan "Konfirmasi Pembayaran".
   - Jika admin menolak bukti bayar: wajib mengisi `reason` yang otomatis dikirim ke pelanggan via WhatsApp, dan status diubah ke `REJECTED` (memberi kesempatan pelanggan upload ulang tanpa membatalkan reservasi).
3. **Idempotensi Webhook Gateway**:
   - Untuk mode gateway otomatis (Midtrans/Xendit): backend memvalidasi signature HMAC SHA512 dan mencatat `transaction_id` untuk menjamin bahwa callback yang sama tidak pernah memproses pemesanan dua kali (*idempotency*).
4. **Validasi Berkas Bukti Transfer**:
   - Pemeriksaan MIME Type via Magic Bytes (hanya menerima `image/jpeg`, `image/png`, `image/webp`).
   - Batas ukuran file maksimal 5 MB.

## 3. Konsekuensi
- **Positif (+)**:
  - Fleksibilitas maksimal untuk pelanggan wisuda dengan kebiasaan pembayaran berbeda.
  - Risiko penipuan struk palsu ditekan karena verifikasi nominal mutasi dilakukan eksplisit oleh admin.
  - Alur data bersih dan selaras 100% dengan modal checkout 4-langkah di frontend.
