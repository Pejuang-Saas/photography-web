# ADR-004: Integrasi Engine WAHA & Penegakan Aturan Jendela 24 Jam Anti-Ban

- **Status**: Diterima (Accepted)
- **Tanggal**: 2026-09-15
- **Pembuat Keputusan**: Antigravity AI & Tech Lead
- **Technical Story**: Integrasi WhatsApp terpercaya untuk sistem Mini CRM dengan pencegahan pemblokiran dari Meta.
- **Ticket/Issue**: `[TICKET-ID-PLACEHOLDER]`

---

## 1. Konteks & Permasalahan

Mengacu pada spesifikasi frontend `docs/frontend/superpowers/specs/2026-09-08-waha-mini-crm-design.md`, studio foto Kaya Story mengandalkan WhatsApp sebagai saluran komunikasi primer dengan pelanggan (pengiriman bukti booking, invoice, revisi foto, dan CS obrolan).

**Problem Statement**:
WhatsApp menerapkan kebijakan ketat anti-spam. Mengirim pesan pemasaran bebas ke nomor pelanggan yang pasif lebih dari 24 jam dapat memicu pemblokiran nomor studio secara permanen. Selain itu, ketergantungan pada *service* WAHA pihak ketiga mengharuskan kita memitigasi isu perubahan status (QR terputus, sesi kadaluarsa, dsb).

**Constraints**:
- Segala bentuk komunikasi bisnis keluar harus diverifikasi jika telah melewati batas waktu 24 jam sejak interaksi pelanggan terakhir.
- Tidak boleh ada pesan duplikat dari *webhook* (kejadian retries atau duplikat callback).

**Stakeholder Concerns**:
- **Manajemen Studio**: Nomor studio adalah aset krusial, pemblokiran berarti terhentinya saluran operasional penting.
- **Tim CS**: Butuh kemudahan dalam menghubungi klien tanpa sering terjebak aturan *template* yang kaku, jadi perhitungan waktu harus akurat.

## 2. Decision Drivers

- **Keamanan Akun (Anti-Ban)**: Mengikuti standar kebjakan Meta tentang Customer Service window.
- **Idempotensi Webhook**: Validasi duplikat agar pesan yang masuk dari webhook tidak tercatat ganda pada CRM.
- **Ketersediaan dan Isolasi**: Terisolasinya *engine* WAHA (sebagai *microservice* terpisah) yang dipanggil via HTTP.

## 3. Considered Options

| Opsi | Pros (+) | Cons (-) |
|---|---|---|
| **WAHA API (Self-hosted HTTP) + State Machine** | Kontrol penuh, tidak ada *vendor lock-in* Baileys langsung, mudah diskalakan, webhook andal. | Harus mem-maintenance sesi secara mandiri jika terputus. |
| **Baileys Library Langsung (di Node.js)** | Tanpa biaya server tambahan, sangat cepat. | Membebani proses NestJS, *memory leaks* umum terjadi, jika aplikasi *restart* sesi bisa rentan putus. |
| **Official WhatsApp Cloud API** | Bebas risiko diban asal pakai template sah, infrastruktur Meta. | Harga per percakapan (Conversation-based pricing) terlalu mahal untuk operasional studio UMKM. |

## 4. Decision Outcome

Kami memilih **Pemanfaatan Container Eksisting `dev-waha`** dipadukan dengan **Implementasi State Machine Jendela 24 Jam**.

**Implementasi & Panduan**:
1. **Komunikasi WAHA**: Backend berkomunikasi langsung dengan `http://dev-waha:3000` di dalam Docker network `dev-network`. Menggunakan sesi *default*.
2. **State Machine Jendela 24 Jam**:
   - Kolom `crm_chats.last_customer_message_at` mencatat waktu tepat ketika pelanggan mengirim pesan masuk via *webhook*.
   - Saat admin menekan tombol "Kirim Pesan" di Mini CRM, backend menghitung selisih waktu.
   - Jika $\Delta t \le 24\text{ Jam}$: Admin diizinkan mengirim pesan bebas.
   - Jika $\Delta t > 24\text{ Jam}$: Backend menolak pesan bebas dengan kode error `403 Forbidden (CRM_24H_WINDOW_LOCKED)`.
3. **Webhook Ingestion Idempotent**: Webhook diverifikasi menggunakan `waha_message_id` unik untuk mencegah duplikasi pencatatan.

**Logika State Machine Jendela 24 Jam (TypeScript):**
```typescript
import { ForbiddenException } from '@nestjs/common';
import * as dayjs from 'dayjs';

export class ChatService {
  async sendMessage(chatId: string, messageType: 'FREE_FORM' | 'TEMPLATE', content: string) {
    const chat = await this.prisma.crmChat.findUnique({ where: { id: chatId } });
    
    // Hitung delta waktu dari pesan pelanggan terakhir
    const now = dayjs();
    const lastMessageAt = dayjs(chat.last_customer_message_at);
    const hoursSinceLastMessage = now.diff(lastMessageAt, 'hour', true);

    const isWithin24hWindow = hoursSinceLastMessage <= 24;

    if (!isWithin24hWindow && messageType === 'FREE_FORM') {
      throw new ForbiddenException(
        'CRM_24H_WINDOW_LOCKED', 
        'Pelanggan pasif > 24 jam. Gunakan template resmi terverifikasi.'
      );
    }

    // Lanjutkan proses pengiriman ke WAHA API via Message Queue
    await this.wahaQueue.add('send-message', {
      to: chat.phone_number,
      content,
      type: messageType
    });
  }
}
```

## 5. Pros and Cons of the Decision

- **Pros (+)**:
  - Nomor WhatsApp studio terlindungi 100% dari potensi *flagging* dan pemblokiran massal oleh sistem Meta.
  - Seluruh riwayat obrolan pelanggan tersimpan rapi di database PostgreSQL studio dan dapat diakses tim CS secara terpusat melalui Mini CRM.
  - *Webhook* yang idempoten menjamin data bersih tanpa anomali.
- **Cons (-)**:
  - Admin harus menggunakan template resmi jika pelanggan tidak membalas chat selama lebih dari 1 hari, yang sedikit mengurangi fleksibilitas operasional.
  - Tergantung pada ketahanan uptime kontainer WAHA lokal.

## 6. Related ADRs

- [ADR-003: Caching & Asynchronous Task Queue Menggunakan Redis 7 & BullMQ](./ADR-003-caching-queue.md)

## 7. References

- [WhatsApp Business API Policy - 24H Window](https://developers.facebook.com/docs/whatsapp/pricing/#customer-service-window)
- [WAHA (WhatsApp HTTP API) Official Docs](https://waha.devlike.pro/)
