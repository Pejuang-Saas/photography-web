# ADR-005: Desain Dual-Mode Pembayaran (Manual Verification vs Payment Gateway)

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead
- **Technical Story**: Akomodasi berbagai profil pembeli menggunakan mode verifikasi pembayaran yang hibrida (manual dan gateway).
- **Ticket/Issue**: `[TICKET-ID-PLACEHOLDER]`

---

## 1. Konteks & Permasalahan

Mengacu pada dokumen spesifikasi `docs/frontend/superpowers/specs/2026-09-08-dual-payment-mode-design.md`, sebagian besar mahasiswa wisudawan di Tembalang lebih menyukai transfer langsung ke rekening bank lokal (BCA/Mandiri) tanpa biaya admin gateway (Rp 2.000 - Rp 4.000). Di sisi lain, pelanggan keluarga atau pemesan mendadak menginginkan pembayaran instan (QRIS / Virtual Account otomatis).

**Problem Statement**:
Pembayaran manual rawan pemalsuan bukti bayar (*fake receipt* atau slip palsu) dan membutuhkan intervensi admin. Pembayaran otomatis mahal untuk beberapa kalangan. Kita harus mendesain sistem yang mewadahi keduanya tanpa membingungkan alur bisnis *booking state*.

**Constraints**:
- Bukti transfer manual (gambar/PDF) bisa berukuran besar dan berpotensi berupa *malware*.
- Callback *Payment Gateway* harus tahan terhadap serangan replikasi data (membutuhkan idempoten & verifikasi signature).

**Stakeholder Concerns**:
- **Pelanggan Mahasiswa**: Tidak ingin ada biaya admin tambahan dari Gateway.
- **Admin Keuangan**: Ingin memastikan tidak tertipu dengan tangkapan layar pembayaran yang di-edit.

## 2. Decision Drivers

- **Fleksibilitas Pelanggan**: Menyediakan pilihan hemat vs. instan.
- **Keamanan Finansial**: Validasi eksplisit untuk menghindari penipuan transaksi palsu.
- **Konsistensi State**: Terlepas dari metodenya, status pemesanan di *backend* harus bermuara pada status yang jelas (`PAID`, `REJECTED`, dll).

## 3. Considered Options

| Opsi | Pros (+) | Cons (-) |
|---|---|---|
| **Dual-Mode Terpadu (Manual + Gateway)** | Mewadahi 100% target demografi pelanggan, fleksibel disesuaikan *toggle settings* studio. | Alur bisnis kode *(business logic)* lebih kompleks karena mengurus dua jalur validasi. |
| **Hanya Payment Gateway (Otomatis)** | Tanpa intervensi admin, tidak ada risiko struk palsu. | Harga akhir lebih mahal, kemungkinan konversi *booking* menurun dari segmen mahasiswa. |
| **Hanya Manual Transfer (Upload)** | Tanpa biaya admin tambahan, sistem jauh lebih simpel dibangun. | Lambat (harus tunggu admin), pengalaman *booking* mendadak jadi terhambat, rawan *human error*. |

## 4. Decision Outcome

Kami memilih mengimplementasikan **Pemisahan Mode Pembayaran yang Dapat Dikonfigurasi** dan menyatukan alur *state*-nya di akhir proses.

**Implementasi & Panduan**:
1. **Toggle Settings**: Kolom `studio_settings.is_manual_active` dan `is_gateway_active` mengontrol metode yang ditawarkan di antarmuka *checkout*.
2. **Validasi Berkas Bukti Transfer**:
   - Pemeriksaan MIME Type via *Magic Bytes* (hanya menerima `image/jpeg`, `image/png`, `image/webp`).
   - Batas ukuran file maksimal 5 MB.
3. **Idempotensi Webhook Gateway**: Untuk mode gateway otomatis (Midtrans/Xendit), backend memvalidasi signature HMAC SHA512 dan mencatat `transaction_id` untuk menjamin bahwa callback yang sama tidak pernah memproses pemesanan dua kali.

**Aturan Bisnis Verifikasi Pembayaran Manual (Business Rules):**
1. Saat bukti transfer diunggah: status diset ke `WAITING_CONFIRMATION`.
2. Admin wajib melihat sendiri (secara visual) gambar tersebut, mencocokkannya dengan mutasi rekening Bank.
3. Admin **wajib memasukkan nominal verifikasi riil** (`verifiedAmount`) yang masuk, tidak boleh hanya menekan *Approve*. Jika tidak cocok dengan `expectedAmount`, backend memperingatkan *partial payment*.
4. Jika ditolak: Wajib mengisi `reason` yang otomatis dikirim ke pelanggan via WhatsApp, dan status diubah ke `REJECTED` (memberi kesempatan pelanggan upload ulang tanpa membatalkan reservasi).

**Strategi Kunci Idempotensi (Idempotency Strategy):**
Setiap notifikasi Webhook dari payment gateway diikat dengan tabel `payment_logs` menggunakan *Unique Constraint* pada kombinasi `(gateway_provider, transaction_id)`.
```typescript
async handleGatewayWebhook(payload: WebhookPayload) {
  // 1. Verifikasi Signature (HMAC)
  this.verifySignature(payload);
  
  // 2. Gunakan database transaksi (Unique Constraint mencegah duplikasi)
  await this.prisma.paymentLog.create({
    data: {
      provider: 'MIDTRANS',
      transaction_id: payload.transaction_id,
      order_id: payload.order_id,
      // ...
    }
  }).catch((e) => {
    if (e.code === 'P2002') {
      // P2002 = Unique constraint failed. Event sudah diproses.
      // Early return success (idempotent action)
      return { status: 'already_processed' };
    }
    throw e;
  });

  // 3. Update status pemesanan ke PAID
}
```

## 5. Pros and Cons of the Decision

- **Pros (+)**:
  - Fleksibilitas maksimal untuk pelanggan wisuda dengan kebiasaan pembayaran berbeda.
  - Risiko penipuan struk palsu ditekan karena verifikasi nominal mutasi dilakukan secara sadar (eksplisit) oleh admin.
  - Alur data bersih, *idempotent*, dan selaras 100% dengan modal *checkout* di frontend.
- **Cons (-)**:
  - Membutuhkan manajemen UI khusus bagi admin untuk mengulas gambar transfer manual.
  - Pekerjaan manual yang padat karya bagi staff keuangan jika volume pesanan sedang puncaknya di musim wisuda.

## 6. Related ADRs

- [ADR-002: Pemilihan PostgreSQL 17 & Prisma ORM 6.x](./ADR-002-database-orm.md)
- [ADR-004: Integrasi Engine WAHA & Penegakan Aturan Jendela 24 Jam Anti-Ban](./ADR-004-waha-integration.md)

## 7. References

- [Midtrans Webhook / Notification Documentation](https://docs.midtrans.com/docs/https-notification-webhooks)
- [Stripe Guide to Idempotency](https://stripe.com/docs/api/idempotent_requests)
