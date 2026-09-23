# Frontend Specification: Google Drive Gallery & Customer Photo Selection

- **Version**: 1.0.0
- **Status**: Ready for Implementation
- **Date**: 2026-09-15
- **Related Backend Docs**:
  - [01-PRD.md](../../backend/01-PRD.md) — Bagian 2: Gallery Feature PRD
  - [03-DATABASE-ERD.md](../../backend/03-DATABASE-ERD.md) — Bagian 2: Gallery Database Schema
  - [04-API-SPECIFICATION.md](../../backend/04-API-SPECIFICATION.md) — Bagian 2: Gallery API Spec
  - [adrs/ADR-007-google-drive-public-source.md](../../backend/adrs/ADR-007-google-drive-public-source.md)
  - [adrs/ADR-008-client-side-selection-state.md](../../backend/adrs/ADR-008-client-side-selection-state.md)

---

## 1. Ringkasan Fitur Frontend

Spesifikasi ini mendefinisikan antarmuka pengguna untuk fitur Google Drive Gallery & Customer Photo Selection. Terdapat dua area utama dalam implementasi _frontend_:

1. **Public Gallery Viewer (Customer-facing)**: Halaman publik di mana klien (customer) dapat melihat foto-foto yang bersumber dari Google Drive, memilih foto favorit mereka, dan mengirimkan pilihan akhir (_submit_).
2. **Admin Gallery Management (Protected)**: Dashboard internal bagi admin/fotografer untuk mengelola _galleries_, melakukan sinkronisasi dengan folder Google Drive, dan meninjau (_review_) foto-foto yang telah dipilih oleh klien.

Foto tidak disimpan dalam bentuk _binary_ di _local storage_ atau _bucket_ milik kita sendiri; sebaliknya, gambar disajikan langsung melalui Google Drive CDN menggunakan `thumbnailUrl` dan `viewUrl`.

---

## 2. Halaman Baru yang Dibutuhkan

Berikut adalah daftar halaman baru yang akan ditambahkan ke dalam aplikasi Next.js (App Router):

| Route                              | Deskripsi                                             | Akses  |
| ---------------------------------- | ----------------------------------------------------- | ------ |
| `/gallery/[token]`                 | Public gallery viewer untuk klien memilih foto.       | Public |
| `/admin/galleries`                 | Daftar semua _gallery_ yang dikelola.                 | Admin  |
| `/admin/galleries/new`             | Form pembuatan _gallery_ baru.                        | Admin  |
| `/admin/galleries/[id]`            | Detail _gallery_ dan manajemen sinkronisasi (_sync_). | Admin  |
| `/admin/galleries/[id]/selections` | Melihat daftar pilihan (_selections_) dari klien.     | Admin  |

---

## 3. Public Gallery Viewer: `/gallery/[token]`

### 3.1 Customer Entry Flow

1. Customer membuka _link_ yang diberikan, contoh: `/gallery/ABC123`.
2. Halaman melakukan pengecekan `localStorage` untuk mencari `sessionToken` yang valid untuk _gallery_ ini.
3. **Jika tidak ada `sessionToken`:** Muncul _modal_ dengan pesan "Masukkan nama Anda untuk mulai memilih foto".
   - Form field: `customerName` (Required), `customerEmail` (Optional), `customerPhone` (Optional).
4. Aplikasi mengirimkan POST request `POST /g/:token/selections`.
   - Backend merespons dengan `sessionToken`.
   - Frontend menyimpan `sessionToken` di `localStorage`.
5. Frontend memuat data _gallery_ (`GalleryInfo`) dan daftar foto (`Photo[]`).

### 3.2 Page Layout

> [!NOTE]
> Layout dirancang untuk fokus pada foto, memberikan pengalaman _viewing_ yang bersih.

- **Header**: Menampilkan Nama Gallery, total foto keseluruhan, dan _badge_ jumlah foto yang sudah dipilih.
- **FilterTabs**: Tiga tab navigasi - `All` | `Selected` | `Unselected` (dilengkapi dengan _badge_ jumlah foto masing-masing).
- **PhotoGrid**: Layout menggunakan _masonry_ atau _uniform grid_ (4 kolom pada Desktop, 2 kolom pada Mobile).
- **SelectionBar**: Bar _sticky_ di bagian paling bawah layar. Menampilkan teks seperti "183 Foto Dipilih" dan tombol "Submit Pilihan".

### 3.3 PhotoCard Component

- **Image Source**: Menggunakan `thumbnailUrl` dari _database_ (bersumber dari Google Drive).
- **Interaksi Hover**: Menampilkan `filename` dan ikon untuk membuka _view full photo link_ (`viewUrl`).
- **Selected State**: Jika foto dipilih, tampilkan _overlay_ dengan ikon centang (_checkmark_) dan _border highlight_ (misal: _ring-2_ warna _primary_).
- **Toggle Selection**: Klik pada foto akan meng-toggle status _selected_ secara instan (_Optimistic UI_ tanpa _network call_ saat klik).
- **Lazy Loading**: Memanfaatkan komponen `next/image` dengan atribut `loading='lazy'`.
- **Error Fallback**: Jika URL _thumbnail_ gagal dimuat atau kadaluarsa (403/404), tampilkan ikon _placeholder_ bawaan.

### 3.4 FilterTabs Component

Tab kontrol: `All` | `Selected` | `Unselected`.

- **Client-Side Filtering**: Proses _filtering_ dilakukan sepenuhnya di sisi klien (_client-side_). Tidak perlu memanggil API baru saat berganti tab karena _state selection_ sudah ada di memori.
- **Real-Time Badges**: _Badge count_ pada tab (`Selected` dan `Unselected`) otomatis ter-update secara _real-time_ ketika _customer_ memilih atau menghapus pilihan foto.

### 3.5 SelectionBar Component (Sticky Bottom)

Selalu terlihat di bagian bawah _viewport_.

```text
[ 183 Foto Dipilih dari maks. 500 ] ---------------------- [ Submit Pilihan ]
```

- Menampilkan _progress bar_ jika _gallery_ memiliki batasan `maxSelections`.
- **Disabled State**: Tombol "Submit Pilihan" akan di-_disable_ jika belum ada foto yang dipilih (0 foto).
- **Warning Color**: Warna teks atau bar berubah (misal: menjadi _warning/orange_) jika mendekati batas maksimal pilihan.

### 3.6 Submit Modal

Ketika _customer_ mengklik "Submit Pilihan":

1. Tampilkan _modal summary_: "Anda memilih 183 foto".
2. Tampilkan _preview strip_ yang berisi 5 _thumbnail_ foto pertama yang dipilih.
3. Tombol **Konfirmasi** -> Memicu `POST /g/:token/selections/:sessionToken/submit`.
4. **Success State**: Tampilkan pesan "Pilihan berhasil dikirim! Terima kasih, [customerName]."
5. **Post-Submit**: Setelah berhasil _submit_, _disable_ semua _toggle selection_ (ubah UI ke mode _read-only_).

### 3.7 Session Resume

Saat halaman dimuat (_page load_):

1. Cek `localStorage` untuk _key_ `gallery_session_{token}`.
2. Jika ditemukan, panggil `GET /g/:token/selections/:sessionToken`.
3. Jika merespons `200 OK`: Pulihkan daftar `selectedPhotoIds` ke React _state_. Tampilkan _toast notification_ "Melanjutkan sesi sebelumnya".
4. Jika API merespons `404 Not Found`: Hapus _key_ di `localStorage` dan minta _customer_ memasukkan nama lagi lewat _Entry Modal_.

### 3.8 Performance Considerations

> [!TIP]
> Mengingat _gallery_ bisa berisi ratusan foto, performa _render_ sangat kritikal.

- **Pagination & Infinite Scroll**: Muat 50 foto per halaman. Gunakan _Intersection Observer_ pada elemen _footer_ untuk memicu _lazy loading_ halaman berikutnya.
- **Client-Side Filter**: Memfilter `All/Selected/Unselected` dari array di memori mencegah _re-fetch_ yang tidak perlu.
- **Debounced Auto-Save**: Kirimkan status _selection_ ke _backend_ menggunakan _debounce_ (misal: 1.5 detik setelah _toggle_ terakhir).
- **Optimistic UI**: Perubahan UI saat memilih foto harus terasa instan tanpa menunggu respons dari _backend_. Sinkronisasi dilakukan di latar belakang.

### 3.9 Error States

- **Gallery Not Found (404)**: Tampilkan halaman _error_ yang ramah pengguna (_friendly_).
- **Gallery Inactive/Archived**: Tampilkan pesan "Gallery ini sudah tidak aktif".
- **Network Error (Auto-save)**: Tampilkan _warning toast_ "Gagal menyimpan pilihan sementara. Mencoba kembali...", lakukan mekanisme _retry_.
- **Submit Failure**: Jika proses _submit_ gagal, beritahu lewat notifikasi dan biarkan pengguna mencoba lagi.

---

## 4. Admin Gallery Management

### 4.1 `/admin/galleries` — Gallery List Page

- **Tabel Kolom**: Name, Total Photos, Status, Last Sync, Submissions Count, Actions.
- **Status Badges**: `DRAFT` (Abu-abu), `ACTIVE` (Hijau), `ARCHIVED` (Kuning gelap/Abu-abu).
- **Actions**:
  - Tombol **Sync Drive** -> Memicu `POST /admin/galleries/:id/sync` (menampilkan _inline progress_).
  - Tombol **Copy URL** untuk menyalin _link_ _public gallery_ (`/gallery/[token]`).
  - Tombol **Detail** -> Navigasi ke halaman spesifik _gallery_.

### 4.2 `/admin/galleries/new` — Create Gallery Form

- **Fields**:
  - `Gallery Name` (Required)
  - `Google Drive Folder URL` (Required) — _Validation hint_: "Pastikan folder sudah diset publik (Anyone with link → Viewer)".
  - `Description` (Optional, Textarea)
  - `Max Selections` (Optional, Number)
  - `Booking Link` (Optional, Dropdown berisi _booking_ dengan status `COMPLETED`).
  - `Status`: Default ke `DRAFT` atau `ACTIVE`.
- **On Submit**: `POST /admin/galleries`.
- **Post-Create**: Setelah sukses, _redirect_ ke `/admin/galleries/[id]` dan secara otomatis picu proses _sync_ pertama kali.

### 4.3 `/admin/galleries/[id]` — Gallery Detail Page

Bagian-bagian halaman:

1. **Gallery Info Card**: Menampilkan detail nama, `publicUrl`, status, ID folder Drive, tanggal pembuatan.
2. **SyncStatusCard Component**:
   - Menampilkan kapan terakhir _sync_: "5 minutes ago — 247 photos (12 new, 2 removed)".
   - Menampilkan proses _sync_ berjalan: _Progress bar_ + "Syncing... 183 / 247 files".
   - Tombol **Sync Drive** (di-_disable_ jika status sedang `RUNNING`).
3. **Overview Stats**: Jumlah total foto dan total keseluruhan foto yang dipilih oleh seluruh _customer_.
4. **Quick Link**: Navigasi ke daftar `/selections`.

### 4.4 SyncStatusCard Component

Perilaku _polling_:

- Ketika _sync_ berstatus `RUNNING`: Lakukan _polling_ `GET /admin/galleries/:id/sync/latest` setiap 2 detik.
- **Display**: Tampilkan _progress bar_, rasio `syncedFiles / totalFiles`, dan `percentComplete`.
- Ketika status `COMPLETED`: Hentikan _polling_ dan tampilkan hasil (jumlah foto baru, jumlah foto terhapus).
- Ketika status `FAILED`: Tampilkan `errorMessage` di dalam _alert box_ merah.
- **Implementasi**: Gunakan _hook_ `useEffect` dengan `setInterval`, atau SWR dengan `refreshInterval: 2000` (kondisional berdasarkan status).

### 4.5 `/admin/galleries/[id]/selections` — Customer Selections List

- **Tabel Kolom**: Customer Name, Email, Selected Count, Status (`DRAFT` / `SUBMITTED`), Submitted At, Actions.
- **Filter**: Dropdown filter berdasarkan status (All | SUBMITTED | DRAFT).
- **Action (View Detail)**: Membuka _modal_ atau halaman detail yang memuat informasi _customer_ beserta _grid thumbnail_ foto-foto yang telah mereka pilih.

---

## 5. Komponen Baru yang Dibutuhkan

Tempatkan komponen ini di `apps/web/app/(public)/gallery/_components/` atau _shared components folder_.

| Component Name       | Lokasi                                   | Props Interface (Utama)                                    | Tanggung Jawab                                                                 |
| -------------------- | ---------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `PhotoGrid`          | `.../_components/PhotoGrid.tsx`          | `photos: Photo[], onToggle: (id) => void`                  | Me-render _grid_ foto yang mendukung _masonry layout_ dan _lazy load_.         |
| `PhotoCard`          | `.../_components/PhotoCard.tsx`          | `photo: Photo, isSelected: boolean, onToggle`              | Merender satu item foto, _hover effect_, dan _selected state overlay_.         |
| `SelectionBar`       | `.../_components/SelectionBar.tsx`       | `selectedCount: number, max: number, onSubmit`             | Bar _sticky_ bawah untuk _submit_ pilihan.                                     |
| `FilterTabs`         | `.../_components/FilterTabs.tsx`         | `active: string, counts: Record<string, number>, onChange` | Tab navigasi `All / Selected / Unselected`.                                    |
| `SubmitModal`        | `.../_components/SubmitModal.tsx`        | `isOpen, onClose, onSubmit, selectedPhotos`                | _Modal_ konfirmasi sebelum _submit final_.                                     |
| `SyncStatusCard`     | `.../_components/SyncStatusCard.tsx`     | `galleryId: string, initialStatus: SyncJob`                | Merender _progress bar sync_ Drive dan mengatur mekanisme _polling_.           |
| `GalleryEntryModal`  | `.../_components/GalleryEntryModal.tsx`  | `isOpen, onSubmitCustomerData`                             | _Modal_ meminta input nama _customer_ sebelum memulai sesi.                    |
| `PhotoSelectionPage` | `.../_components/PhotoSelectionPage.tsx` | `gallery: GalleryInfo, initialPhotos: Photo[]`             | _Orchestrator_ utama halaman publik, mengelola _state_ dan integrasi komponen. |

---

## 6. State Management

Pendekatan manajemen _state_ untuk halaman `PhotoSelectionPage` disarankan menggunakan **Zustand** atau **React `useReducer`** karena kompleksitas _state selection_, _filtering_, dan UI. (Tidak perlu Redux karena _overkill_).

Struktur _State_:

```typescript
interface GalleryState {
  galleryInfo: GalleryInfo | null;
  photos: Photo[];
  selectedPhotoIds: Set<string>;
  activeFilter: 'all' | 'selected' | 'unselected';
  sessionToken: string | null;
  isSubmitted: boolean;
  isSyncing: boolean;
}
```

Aksi (_Actions_):

- `togglePhoto(photoId: string)`: Menambah/menghapus ID dari set `selectedPhotoIds`.
- `setFilter(filter: 'all' | 'selected' | 'unselected')`: Mengubah tab aktif.
- `loadNextPage()`: Memuat halaman _pagination_ foto selanjutnya.
- `submitSelection()`: Memanggil API _submit final_.
- `restoreSession(sessionToken: string)`: Mengembalikan state foto terpilih setelah _page reload_.

---

## 7. Environment Variables Baru

Tambahkan variabel ini pada file `.env` dan `.env.production`:

```env
# URL Backend NestJS
NEXT_PUBLIC_API_URL=http://localhost:3002

# Base URL untuk Public Gallery, berguna untuk generate link dan copy URL di Admin
NEXT_PUBLIC_GALLERY_BASE_URL=http://localhost:3000/gallery
```

---

## 8. TypeScript Types

Simpan definisi _type_ ini di `apps/web/types/gallery.ts`:

```typescript
export interface GalleryInfo {
  id: string;
  token: string;
  name: string;
  description?: string;
  driveFolderId: string;
  maxSelections?: number;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
}

export interface Photo {
  id: string;
  galleryId: string;
  filename: string;
  driveFileId: string;
  thumbnailUrl: string;
  viewUrl: string;
}

export interface Selection {
  id: string;
  galleryId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  status: 'DRAFT' | 'SUBMITTED';
  selectedPhotoIds: string[];
  submittedAt?: string;
}

export interface SyncJob {
  id: string;
  galleryId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalFiles: number;
  syncedFiles: number;
  newFiles: number;
  removedFiles: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface CreateSessionRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface CreateSessionResponse {
  sessionToken: string;
  selectionId: string;
}

export interface SubmitSelectionRequest {
  selectedPhotoIds: string[];
}
```

---

## 9. UX Wireframe Deskripsi

Visualisasi tata letak halaman `Public Gallery Viewer`:

```text
Kaya Story — Wedding Andi & Sinta
247 Foto  |  [All 247] [Selected 183] [Unselected 64]

┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│      │ │  ✓   │ │      │ │  ✓   │
│ IMG  │ │ IMG  │ │ IMG  │ │ IMG  │
│      │ │      │ │      │ │      │
└──────┘ └──────┘ └──────┘ └──────┘
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  ✓   │ │      │ │  ✓   │ │      │
│ IMG  │ │ IMG  │ │ IMG  │ │ IMG  │
│      │ │      │ │      │ │      │
└──────┘ └──────┘ └──────┘ └──────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  183 Foto Dipilih (maks. 500)       [ Submit Pilihan ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 10. Relasi dengan Fitur Existing

- **Admin Sidebar**: Tambahkan menu baru `Galleries` di bawah _navigation sidebar_ dashboard `/admin`.
- **Booking Integration**: Pada halaman detail _Booking_, jika status _booking_ adalah `COMPLETED`, tambahkan tombol/tautan cepat "Buat Gallery" yang otomatis mengarahkan ke form `/admin/galleries/new` dengan `bookingId` terisi.
- **CRM / WAHA Integration**: Tautan (_link_) `publicUrl` dari _gallery_ akan disalin oleh Admin dan dibagikan kepada klien melalui WhatsApp, berpotensi diintegrasikan dengan fitur CRM WhatsApp yang sudah ada untuk pengiriman otomatis.

---

_End of Document_
