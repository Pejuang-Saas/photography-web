# ADR-004: Integrasi Engine WAHA & Penegakan Aturan Jendela 24 Jam Anti-Ban

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead

---

## 1. Konteks & Permasalahan
Mengacu pada spesifikasi frontend `docs/frontend/superpowers/specs/2026-09-08-waha-mini-crm-design.md`, studio foto Kaya Story mengandalkan WhatsApp sebagai saluran komunikasi primer dengan pelanggan (pengiriman bukti booking, invoice, revisi foto, dan CS obrolan).
Namun, terdapat dua risiko besar:
1. **Risiko Pemblokiran Akun (Banned by Meta)**: WhatsApp menerapkan kebijakan ketat anti-spam. Mengirim pesan pemasaran bebas ke nomor pelanggan yang pasif lebih dari 24 jam dapat memicu pemblokiran nomor studio secara permanen.
2. **Ketergantungan Sesi WAHA**: Service WAHA (`dev-waha`) dapat mengalami perubahan status sesi (QR terputus, token kedaluwarsa, atau restart kontainer).

## 2. Keputusan Arsitektur
1. **Pemanfaatan Container Eksisting `dev-waha`**:
   - Backend berkomunikasi langsung dengan `http://dev-waha:3000` di dalam Docker network `dev-network`.
   - Menggunakan session default studio untuk seluruh aktivitas kirim pesan.
2. **Implementasi State Machine Jendela 24 Jam**:
   - Kolom `crm_chats.last_customer_message_at` mencatat waktu tepat ketika pelanggan mengirim pesan masuk via webhook.
   - Saat admin menekan tombol "Kirim Pesan" di Mini CRM, backend menghitung selisih waktu:
     $$\Delta t = \text{NOW}() - \text{last\_customer\_message\_at}$$
   - Jika $\Delta t \le 24\text{ Jam}$: Admin diizinkan mengirim pesan teks bebas (`messageType: FREE_FORM`).
   - Jika $\Delta t > 24\text{ Jam}$: Backend menolak pesan bebas dengan kode error `403 Forbidden (CRM_24H_WINDOW_LOCKED)`. Admin hanya dapat mengirim pesan jika memilih template resmi terverifikasi (`messageType: TEMPLATE`).
3. **Webhook Ingestion Idempotent**:
   - Webhook dari WAHA diverifikasi menggunakan `waha_message_id` unik pada tabel `crm_messages` untuk mencegah duplikasi pencatatan obrolan.

## 3. Konsekuensi
- **Positif (+)**:
  - Nomor WhatsApp studio terlindungi 100% dari potensi flagging dan pemblokiran massal oleh sistem Meta.
  - Seluruh riwayat obrolan pelanggan tersimpan rapi di database PostgreSQL studio dan dapat diakses tim CS secara terpusat.
- **Negatif (-)**:
  - Admin harus menggunakan template resmi jika pelanggan tidak membalas chat selama lebih dari 1 hari.
