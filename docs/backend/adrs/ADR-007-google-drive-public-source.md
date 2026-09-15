# ADR-007: Google Drive Public Folder as Photo Source

**Status:** Accepted  
**Date:** 2026-09-15  
**Deciders:** Architecture Team, Backend Team  
**Technical Story:** Gallery Feature — Photo Source Discovery  

---

## Context

Fitur Google Drive Gallery mengharuskan kita untuk menampilkan foto dari folder Google Drive milik fotografer ke customer untuk proses seleksi.

- Klien **tidak memiliki** Google Cloud billing account dan tidak ingin membuatnya.
- File harus dapat di-discover dari **public Drive folder** (*Anyone with link → Viewer*).
- Data yang dibutuhkan per foto: `file ID`, `filename`, `MIME type`, `thumbnail URL`, dan `view URL`.
- Sistem **tidak perlu menyimpan file biner** — hanya metadata.
- Discovery tidak boleh terjadi saat customer membuka halaman (sync-first, not scrape-on-demand).

---

## Decision Drivers

- **Zero cost:** Tidak ada risiko tagihan Google Cloud.
- **Zero credential management:** Tidak perlu mengelola API Key, OAuth token, atau Service Account.
- **Isolation:** Modul parser harus dapat diganti (replaceable) tanpa mengubah domain/gallery logic.
- **Reliability yang dapat diterima:** Proses sync berjalan di background (BullMQ), bukan real-time per request user.

---

## Considered Options

| Option | Pros | Cons |
| :--- | :--- | :--- |
| **A: Official Google Drive API v3 + API Key** | Stabil, terdokumentasi resmi, JSON response, handles pagination, mendukung folder besar | Memerlukan Google Cloud Project (walaupun gratis, user hesistant), API Key management, risiko quota limit |
| **B: HTML parsing of public Drive folder page *(CHOSEN)*** | Zero credentials, zero billing risk, setup sederhana | Fragile (Google bisa mengubah HTML kapan saja), rate limiting risk, pagination untuk folder besar kompleks |
| **C: Puppeteer headless browser** | Lebih reliable dibanding raw HTML parsing, sanggup render JavaScript | Memory overhead >200MB tidak dapat diterima untuk VPS 2vCPU/2GB, lambat untuk batch processing |
| **D: Third-party Drive scraper npm packages** | Siap pakai, hemat waktu awal | Maintenance risk, licensing tidak jelas, bisa melakukan hidden API calls yang tidak terduga |

---

## Decision

**Pilih Option B (HTML parsing) dengan mitigasi yang ketat.**

Kami menyadari risikonya, namun benefit dari sisi biaya dan simplifikasi lebih menguntungkan pada tahap ini. Risiko kerapuhan dimitigasi dengan ketat melalui:

1. **Isolasi penuh:** Seluruh logika parsing diisolasi dalam satu file: `apps/api/src/modules/galleries/sources/google-drive-public/google-drive-public.parser.ts`. Jika Google mengubah HTML/JSON structure, hanya file ini yang perlu diperbaiki.

2. **PhotoSource abstraction:** Core gallery domain tidak bergantung langsung pada Google Drive. Gunakan interface:
   ```typescript
   interface PhotoSource {
     discoverFiles(folderId: string): AsyncGenerator<DiscoveredPhoto>;
   }
   ```

3. **Error surfacing:** Jika parse gagal, pesan error disimpan di `SyncJob.errorMessage` dan status menjadi `FAILED`. Admin mendapat feedback yang jelas.

4. **URL patterns stabil:** Thumbnail dan view URL dikonstruksi menggunakan pola URL yang lebih stabil (bukan dari HTML parsing), terpisah dari discovery logic.

---

## Implementation Details

### URL Patterns yang Diterima sebagai Input

Parser harus bisa mengekstrak `folderId` dari berbagai format:
```
https://drive.google.com/drive/folders/{FOLDER_ID}
https://drive.google.com/drive/u/0/folders/{FOLDER_ID}
https://drive.google.com/drive/folders/{FOLDER_ID}?usp=sharing
```

### Konstruksi URL Foto (Hardcoded, Bukan dari HTML)

```typescript
// constants/drive-urls.ts
export const DRIVE_THUMBNAIL_URL = (fileId: string, size = 'w400') =>
  `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;

export const DRIVE_VIEW_URL = (fileId: string) =>
  `https://drive.google.com/file/d/${fileId}/view`;

export const DRIVE_THUMBNAIL_FALLBACK = (fileId: string) =>
  `https://lh3.googleusercontent.com/d/${fileId}`;
```

### Parser Logic (Pseudo-code)

```typescript
// google-drive-public.parser.ts
export class GoogleDrivePublicParser {
  async *parse(folderId: string): AsyncGenerator<DiscoveredPhoto> {
    const html = await this.fetchWithTimeout(
      `https://drive.google.com/drive/folders/${folderId}`,
      { timeout: 30_000 }
    );

    // Extract embedded JSON data from HTML
    // Google Drive embeds file data in AF_initDataCallback patterns
    const jsonBlob = this.extractJsonBlob(html);
    const files = this.parseFileEntries(jsonBlob);

    for (const file of files) {
      if (!this.isImageMimeType(file.mimeType)) continue;
      yield {
        externalId: file.id,
        filename: file.name,
        mimeType: file.mimeType,
        thumbnailUrl: DRIVE_THUMBNAIL_URL(file.id),
        viewUrl: DRIVE_VIEW_URL(file.id),
      };
    }
  }

  private async fetchWithTimeout(url: string, options: { timeout: number }) {
    // Implements timeout + retry with exponential backoff (max 3 retries)
  }

  private extractJsonBlob(html: string): unknown {
    // TERISOLASI: Hanya bagian ini yang perlu diubah jika Google ganti struktur
    // Extract AF_initDataCallback atau _DRIVE_ivd dari script tag
  }

  private isImageMimeType(mime?: string): boolean {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
    return allowed.includes(mime ?? '');
  }
}
```

### Konfigurasi Timeout & Retry

| Parameter | Value | Alasan |
| :--- | :--- | :--- |
| HTTP timeout per request | 30 detik | Folder besar butuh waktu response Google |
| Max retries | 3 | Toleransi fluktuasi jaringan |
| Retry backoff | Exponential (1s, 2s, 4s) | Hindari rate limiting Google |
| AsyncGenerator | Yield per file | Memory-efficient untuk 1000+ foto |

---

## Consequences

| Tipe | Detail |
| :--- | :--- |
| ✅ Positive | Nol biaya operasional, nol credential management |
| ✅ Positive | Abstraksi `PhotoSource` memungkinkan swap ke S3/R2 di masa depan tanpa perubahan domain logic |
| ⚠️ Negative | Risiko breakage jika Google mengubah markup HTML folder public tanpa notifikasi |
| 🛡️ Mitigation | Satu file terisolasi untuk diperbaiki; sync berjalan background (tidak memblokir user); `SyncJob.errorMessage` memberikan feedback jelas |

---

## Related ADRs

- **[ADR-003](./ADR-003-caching-queue.md)** — Sync menggunakan BullMQ queue sehingga parser berjalan secara asinkron di background, tidak memblokir HTTP request.
- **[ADR-008](./ADR-008-client-side-selection-state.md)** — Customer mengakses foto dari DB (bukan langsung ke Drive), sehingga performa gallery tidak tergantung pada kecepatan parser.

---

## References

- Pola integrasi WAHA sebagai referensi isolasi external service abstraction → [ADR-004](./ADR-004-waha-integration.md)
- Library serupa yang menggunakan pendekatan ini: `gdown`, `google-drive-downloader`
- Google Drive URL patterns: [developers.google.com/drive/api/guides/ref-export-formats](https://developers.google.com/drive/api/guides/ref-export-formats) (referensi URL structure)
