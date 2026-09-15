# 05 - GALLERY PRD (Product Requirements Document)

**Version:** 1.0.0
**Status:** Ready for Implementation
**Feature:** Google Drive Public Gallery & Customer Photo Selection

## Deskripsi Singkat
Fitur **Google Drive Public Gallery & Customer Photo Selection** memungkinkan fotografer untuk membagikan foto hasil sesi pemotretan kepada pelanggan (wisudawan/klien) tanpa perlu menyimpan file biner (gambar) di dalam server atau VPS utama. Sistem ini akan melakukan *parsing* metadata foto langsung dari *public folder* Google Drive. Pelanggan dapat melihat galeri menggunakan tautan publik, memilih foto favorit mereka, dan mengirimkan (*submit*) daftar pilihan tersebut kembali ke fotografer.

---

## 1. Latar Belakang & Tujuan

### Konteks Bisnis
Setelah sesi foto selesai (status `Booking` = `COMPLETED`), *workflow* berlanjut ke tahap pengiriman foto (Photo Delivery). Fotografer biasanya mengunggah ribuan foto ke platform cloud. Mengelola penyimpanan gambar secara internal membutuhkan kapasitas VPS yang besar dan manajemen infrastruktur *storage* yang rumit.

### Tujuan Utama (Goals)
1. **Zero Binary Storage on VPS:** Server utama tidak akan menyimpan file `.jpg`, `.png`, dsb. Semua gambar disajikan langsung dari Google Drive CDN.
2. **Google Drive as Source of Truth:** Folder Google Drive berfungsi sebagai repositori utama. Jika fotografer menghapus foto di Drive, *sync engine* akan memperbarui statusnya di *database*.
3. **No Google Cloud Billing Required:** Fitur ini menghindari penggunaan Google Drive API resmi yang membutuhkan OAuth *consent screen* dan *billing GCP*. Sistem menggunakan teknik *HTML parsing* dari halaman folder publik Google Drive (`Anyone with the link -> Viewer`).
4. **Seamless Customer Experience:** Pelanggan mendapatkan pengalaman memilih foto yang cepat dan responsif tanpa *login* (menggunakan *session token*).

---

## 2. User Personas

1. **Photographer / Admin Studio**
   * Membuat galeri baru dan menautkan URL folder Google Drive.
   * Menjalankan proses sinkronisasi (*sync*) untuk menarik metadata foto ke sistem.
   * Memantau progres sinkronisasi dan mengelola batasan pemilihan foto (*max selections*).
   * Melihat hasil akhir pilihan foto dari pelanggan.
2. **Customer / Wisudawan**
   * Mengakses galeri menggunakan tautan publik rahasia (*public token URL*).
   * Melihat *thumbnail* dan foto secara penuh.
   * Menandai (memilih) foto yang diinginkan.
   * Mengirimkan draf pilihan ke fotografer (Finalisasi / *Submit*).
3. **System / BullMQ Worker**
   * Berjalan di *background* untuk melakukan ekstraksi HTML halaman Google Drive.
   * Melakukan *upsert* data metadata foto ke PostgreSQL dengan efisien.

---

## 3. Functional Requirements (FR) & Acceptance Criteria (AC)

### Module 1: Gallery Management (CRUD)

* **FR-GAL-001:** Sistem memungkinkan Admin untuk membuat (*create*) galeri dengan memberikan nama, URL Folder Google Drive, URL *booking* (opsional), dan batas maksimal pemilihan (*max_selections*). Sistem akan mengekstrak *folder ID* secara otomatis dari URL.
* **FR-GAL-002:** Setiap galeri yang dibuat harus memiliki `public_token` (*cuid*, bukan *numeric ID* yang dapat ditebak) sebagai URL akses pelanggan.
* **FR-GAL-003:** Galeri memiliki siklus hidup (Status Lifecycle): `DRAFT` &rarr; `ACTIVE` &rarr; `ARCHIVED`.
* **FR-GAL-004:** Admin dapat melihat daftar (termasuk *pagination* dan *search*), memperbarui (*update*), dan menghapus (*delete*) galeri.

**Acceptance Criteria:**
1. *Given* admin memasukkan URL Drive `https://drive.google.com/drive/folders/1aBcDeFg?usp=sharing`, *When* di-submit, *Then* sistem menyimpan `1aBcDeFg` sebagai `driveFolderId`.
2. *Given* sebuah galeri baru dibuat, *Then* sistem menghasilkan field `publicToken` yang *URL-safe* (contoh: `clh123abc0000...`).
3. *Given* galeri berstatus `DRAFT`, *When* pelanggan mengakses URL publik, *Then* sistem mengembalikan error `404 Not Found` atau `403 Forbidden` (Gallery Inactive).

### Module 2: Google Drive Public Parser

* **FR-DRV-001:** Ekstraksi ID Folder dari berbagai pola URL Drive (mis. `folders/ID`, `?id=ID`, dll).
* **FR-DRV-002:** Melakukan penemuan file gambar (*discovery*) dalam folder publik menggunakan teknik *HTML parsing*. Proses ini harus terisolasi dalam *service* `google-drive-public.parser.ts`.
* **FR-DRV-003:** Mengekstrak informasi per-file: `drive_file_id`, `filename`, `mimeType`, `thumbnailUrl` (format `drive.google.com/thumbnail?id=X&sz=w400`), dan `viewUrl`.
* **FR-DRV-004:** Mendukung *pagination* Google Drive atau *scrolling* data besar (*async generator pattern*) jika folder memuat ratusan file.
* **FR-DRV-005:** Menerapkan *timeout* 30 detik untuk *HTTP request* ke Drive dan maksimal *retry* 3 kali jika terjadi kegagalan parsial.
* **FR-DRV-006:** Hanya memproses *MIME types* berupa gambar (`image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/heic`). File di luar tipe tersebut akan diabaikan.
* **FR-DRV-007:** Mengembalikan pesan *error* terstruktur apabila folder Drive bersifat *private*, URL tidak valid, atau folder kosong.

**Acceptance Criteria:**
1. *Given* folder Drive dikonfigurasi sebagai *Private*, *When* parser mencoba mengaksesnya, *Then* sistem melempar error `DRIVE_FOLDER_PRIVATE`.
2. *Given* folder Drive berisi 100 foto dan 5 dokumen PDF, *When* di-parse, *Then* parser hanya mengembalikan metadata untuk 100 foto gambar.
3. *Given* parser mengembalikan metadata gambar, *Then* `thumbnailUrl` harus bisa dirender langsung di browser tanpa autentikasi.

### Module 3: Sync Engine (BullMQ)

* **FR-SYN-001:** *Endpoint* `POST /admin/galleries/:id/sync` akan men-trigger *background job* menggunakan BullMQ.
* **FR-SYN-002:** Status *SyncJob* memiliki alur: `PENDING` &rarr; `RUNNING` &rarr; `COMPLETED` / `FAILED`.
* **FR-SYN-003:** Logika pembaruan data (*Upsert*):
    * File baru (berdasarkan `drive_file_id`) &rarr; Lakukan `INSERT`.
    * File sudah ada &rarr; Lakukan `UPDATE` metadata (mis. nama file berubah).
    * File tidak ada di hasil parsing tapi ada di DB &rarr; Tandai `is_active = false`.
* **FR-SYN-004:** *SyncJob* melacak metrik: `total_files`, `synced_files`, `new_files`, `removed_files`, dan `error_message`.
* **FR-SYN-005:** *Frontend* admin akan melakukan *polling* ke `GET /admin/galleries/:id/sync/latest` setiap 2 detik untuk memperbarui *progress bar*.
* **FR-SYN-006:** Cegah sinkronisasi ganda: Jika ada *job* berstatus `RUNNING` atau `PENDING` untuk suatu galeri, tolak *request* *sync* baru.
* **FR-SYN-007:** Pekerja (*worker*) sama sekali tidak men-download atau memproses *binary file* gambar.

**Acceptance Criteria:**
1. *Given* galeri dengan ID `G1` sedang disinkronisasi (status `RUNNING`), *When* admin menekan tombol "Sync" lagi, *Then* API mengembalikan error `SYNC_ALREADY_RUNNING` (409 Conflict).
2. *Given* ada foto yang sebelumnya di-sync namun dihapus oleh fotografer dari Drive, *When* proses sync baru selesai, *Then* foto tersebut di-update menjadi `isActive: false` di database.

> [!NOTE] Sequence Flow: Proses Sync
> ```mermaid
> sequenceDiagram
>     participant Admin (FE)
>     participant API (NestJS)
>     participant DB (PostgreSQL)
>     participant Worker (BullMQ)
>     participant GDrive (Google Drive)
> 
>     Admin (FE)->>API: POST /admin/galleries/1/sync
>     API->>DB: Check active SyncJob
>     API->>DB: Create SyncJob (PENDING)
>     API->>Worker: Add Job to Queue (gallery_sync)
>     API-->>Admin (FE): 202 Accepted (SyncJobID)
>     
>     Worker->>GDrive: GET HTML Content (Folder URL)
>     Worker->>DB: Update SyncJob (RUNNING)
>     GDrive-->>Worker: Raw HTML Response
>     Worker->>Worker: Parse HTML (Extract Metadata)
>     Worker->>DB: Bulk Upsert Photos
>     Worker->>DB: Mark missing photos as isActive=false
>     Worker->>DB: Update SyncJob (COMPLETED, metrics)
> ```

### Module 4: Photo Metadata API (Public)

* **FR-PHO-001:** *Endpoint* `GET /g/:token/photos` menyediakan daftar foto dengan fitur *pagination* (`page` dan `limit`). *Default limit* adalah 50, dan maksimal 100 per *request*.
* **FR-PHO-002:** Respons per-foto hanya menyertakan properti publik: `id`, `filename`, `driveFileId`, `thumbnailUrl`, `viewUrl`, dan `isActive`.
* **FR-PHO-003:** Untuk pelanggan (publik), API **hanya** mengembalikan foto dengan `is_active = true`.
* **FR-PHO-004:** Terdapat *endpoint* terpisah untuk Admin untuk melihat seluruh foto (termasuk yang `inactive`).

### Module 5: Customer Selection System

* **FR-SEL-001:** `POST /g/:token/selections` membuat objek `Selection` baru dan mengembalikan `session_token`. *Token* ini akan disimpan oleh *browser frontend* di `localStorage` agar sesi persisten.
* **FR-SEL-002:** `PUT /g/:token/selections/:sessionToken` digunakan untuk menambah atau menghapus foto yang dipilih (*add/remove*). Sistem melakukan simpan-otomatis (*auto-save draft*).
* **FR-SEL-003:** `POST /g/:token/selections/:sessionToken/submit` mematikan sesi pemilihan. Mengubah status `Selection` menjadi `SUBMITTED` dan merekam `submitted_at`.
* **FR-SEL-004:** `GET /g/:token/selections/:sessionToken` memungkinkan pelanggan memuat ulang (*resume*) sesi draf mereka saat mereka menutup dan membuka kembali *browser*.
* **FR-SEL-005:** Sistem akan memvalidasi *limit* dari `maxSelections` (jika galeri memilikinya) pada saat `submit`.
* **FR-SEL-006:** Seleksi yang sudah `SUBMITTED` terkunci (tidak bisa di-`PUT` kembali).
* **FR-SEL-007:** Admin memiliki *dashboard endpoint* untuk melihat daftar pelanggan (nama, email) yang sudah *submit* beserta daftar fotonya.

**Acceptance Criteria:**
1. *Given* galeri memiliki `maxSelections: 10`, *When* pelanggan mencoba submit dengan 11 foto, *Then* API menolak dengan `SELECTION_MAX_EXCEEDED` (400 Bad Request).
2. *Given* selection berstatus `SUBMITTED`, *When* pelanggan mencoba `PUT` untuk menambah foto, *Then* API menolak dengan `SELECTION_ALREADY_SUBMITTED` (403 Forbidden).

### Module 6: Security

* **FR-SEC-001:** Akses publik menggunakan `public_token` (*CUID*) sehingga tidak bisa di-enumerasi / ditebak (*IDOR prevention*).
* **FR-SEC-002:** Kredensial *Admin* (JWT) diwajibkan untuk mengakses rute berawalan `/admin/*`.
* **FR-SEC-003:** Proses manipulasi *Selection* diproteksi dan diverifikasi agar foto yang dipilih memang berasal dari galeri yang sama (*Cross-gallery selection prevention*).
* **FR-SEC-004:** Implementasi *Rate Limiting* (30 *requests/minute* per IP) untuk *endpoint* publik `/g/:token/*` untuk mencegah eksploitasi API.
* **FR-SEC-005:** `session_token` bersifat rahasia (*CUID*).

---

## 4. Non-Functional Requirements (NFR)

1. **Environment constraints:** VPS berkapasitas `2vCPU, 2GB RAM`. Sistem dirancang hemat memori; *parsing HTML* harus menggunakan *stream* atau *regex* yang optimal untuk menghindari *Out Of Memory* (OOM). Tidak ada pemrosesan *Image/Resizing* di sisi VPS.
2. **Performance (Pagination):** Maksimum limit untuk daftar foto adalah 100 per halaman. Pengambilan halaman berikutnya harus dalam waktu < 200ms.
3. **Sync Engine Timeouts:** *Job* sinkronisasi tidak boleh berjalan tanpa henti. Terapkan batas *timeout* maksimal 10 menit per *job*.
4. **Media Delivery:** CDN dari Google (URL *Thumbnail*) digunakan langsung oleh *client*. Backend *tidak* berperan sebagai *proxy*.
5. **Architecture:** Parser harus dipisahkan dengan *Interface* `PhotoSource`. Hal ini memungkinkan implementasi kelas baru (`S3Parser` atau `R2Parser`) jika ke depannya sumber penyimpanan berubah.

---

## 5. Out of Scope (v1)

Fitur berikut ini **tidak** akan diimplementasikan pada versi 1 (v1):
1. Dukungan multi-sumber dalam satu galeri (S3, R2, atau storage lokal) secara bersamaan.
2. Ekstraksi folder yang bersarang (*Nested folder discovery*) dalam Google Drive. Hanya 1 level root folder yang didukung.
3. Rekomendasi/saran pemilihan foto berbasis kecerdasan buatan (AI).
4. Integrasi *payment gateway* langsung untuk membeli kuota tambahan (*add-on package*).
5. Pengembangan Aplikasi *Mobile* (*Native Android/iOS*).
6. Pengiriman email notifikasi otomatis kepada fotografer/klien setelah proses submit selesai.
7. Alur persetujuan (*approval / rejection*) hasil *submit* dari pihak fotografer.

---

## 6. Error Codes Catalogue

| Error Code | HTTP Status | Scenario / Deskripsi |
| :--- | :--- | :--- |
| `GALLERY_NOT_FOUND` | 404 Not Found | Galeri dengan ID / public token tidak ditemukan. |
| `GALLERY_INACTIVE` | 403 Forbidden | Pelanggan mengakses galeri yang statusnya `DRAFT` atau `ARCHIVED`. |
| `DRIVE_FOLDER_PRIVATE` | 400 Bad Request | URL Drive yang diinput admin tidak bersifat "Anyone with the link". |
| `DRIVE_FOLDER_INVALID` | 400 Bad Request | Format URL Google Drive yang diberikan salah. |
| `DRIVE_PARSE_FAILED` | 502 Bad Gateway | Gagal mengekstrak data dari HTML Drive (kemungkinan perubahan struktur DOM oleh Google). |
| `SYNC_ALREADY_RUNNING` | 409 Conflict | Proses sinkronisasi untuk galeri terkait masih berjalan (`RUNNING`/`PENDING`). |
| `PHOTO_NOT_IN_GALLERY` | 400 Bad Request | Pelanggan memilih foto yang bukan bagian dari galerinya. |
| `SELECTION_ALREADY_SUBMITTED` | 403 Forbidden | Mencoba memodifikasi data `Selection` yang sudah disubmit. |
| `SELECTION_MAX_EXCEEDED` | 400 Bad Request | Jumlah foto yang dipilih melebihi `maxSelections` dari galeri. |
| `SESSION_NOT_FOUND` | 404 Not Found | `sessionToken` tidak valid atau sudah kadaluwarsa/tidak ditemukan. |

---

## 7. Phase Implementation Plan

*   **Phase 1: PoC Drive Parser**
    *   Membuat *script standalone* (Node.js murni) untuk menguji *regex/parsing HTML* dari folder publik Google Drive untuk membuktikan reliabilitas tanpa token API.
*   **Phase 2: DB Schema + Core CRUD**
    *   Migrasi skema database (Prisma).
    *   Implementasi `GalleryController` (CRUD dasar) di area admin.
*   **Phase 3: Sync Engine (BullMQ)**
    *   Setup *queue* Redis (dev-redis).
    *   Membuat `GallerySyncProcessor` (*worker*) dan integrasi *Parser*.
    *   *Endpoint* untuk *trigger sync* dan *polling status*.
*   **Phase 4: Public Gallery API**
    *   *Endpoint* pengambilan metadata foto secara publik.
    *   Sistem `Selection` (add, remove, draft, submit validation).
*   **Phase 5: Frontend Gallery Viewer**
    *   Integrasi UI, penyimpanan *session token* ke *localStorage*.
    *   *Masonry layout* untuk daftar foto di frontend.
*   **Phase 6: Production Hardening**
    *   Menerapkan *rate limit*, *error monitoring*, perbaikan skenario OOM *handling*.
