# Frontend Specification: Google Drive Gallery & Customer Photo Selection

- **Version**: 1.0.0
- **Status**: Ready for Implementation
- **Date**: 2026-09-15
- **Related Backend Docs**: 
  - [05-GALLERY-PRD.md](../backend/05-GALLERY-PRD.md)
  - [06-GALLERY-DATABASE.md](../backend/06-GALLERY-DATABASE.md)
  - [07-GALLERY-API.md](../backend/07-GALLERY-API.md)

---

## 1. Ringkasan Fitur Frontend

Spesifikasi ini mendefinisikan antarmuka pengguna untuk fitur Google Drive Gallery & Customer Photo Selection. Terdapat dua area utama dalam implementasi *frontend*:
1. **Public Gallery Viewer (Customer-facing)**: Halaman publik di mana klien (customer) dapat melihat foto-foto yang bersumber dari Google Drive, memilih foto favorit mereka, dan mengirimkan pilihan akhir (*submit*).
2. **Admin Gallery Management (Protected)**: Dashboard internal bagi admin/fotografer untuk mengelola *galleries*, melakukan sinkronisasi dengan folder Google Drive, dan meninjau (*review*) foto-foto yang telah dipilih oleh klien.

Foto tidak disimpan dalam bentuk *binary* di *local storage* atau *bucket* milik kita sendiri; sebaliknya, gambar disajikan langsung melalui Google Drive CDN menggunakan `thumbnailUrl` dan `viewUrl`.

---

## 2. Halaman Baru yang Dibutuhkan

Berikut adalah daftar halaman baru yang akan ditambahkan ke dalam aplikasi Next.js (App Router):

| Route | Deskripsi | Akses |
|-------|-----------|-------|
| `/gallery/[token]` | Public gallery viewer untuk klien memilih foto. | Public |
| `/admin/galleries` | Daftar semua *gallery* yang dikelola. | Admin |
| `/admin/galleries/new` | Form pembuatan *gallery* baru. | Admin |
| `/admin/galleries/[id]` | Detail *gallery* dan manajemen sinkronisasi (*sync*). | Admin |
| `/admin/galleries/[id]/selections` | Melihat daftar pilihan (*selections*) dari klien. | Admin |

---

## 3. Public Gallery Viewer: `/gallery/[token]`

### 3.1 Customer Entry Flow

1. Customer membuka *link* yang diberikan, contoh: `/gallery/ABC123`.
2. Halaman melakukan pengecekan `localStorage` untuk mencari `sessionToken` yang valid untuk *gallery* ini.
3. **Jika tidak ada `sessionToken`:** Muncul *modal* dengan pesan "Masukkan nama Anda untuk mulai memilih foto".
   - Form field: `customerName` (Required), `customerEmail` (Optional), `customerPhone` (Optional).
4. Aplikasi mengirimkan POST request `POST /g/:token/selections`. 
   - Backend merespons dengan `sessionToken`.
   - Frontend menyimpan `sessionToken` di `localStorage`.
5. Frontend memuat data *gallery* (`GalleryInfo`) dan daftar foto (`Photo[]`).

### 3.2 Page Layout

> [!NOTE] 
> Layout dirancang untuk fokus pada foto, memberikan pengalaman *viewing* yang bersih.

- **Header**: Menampilkan Nama Gallery, total foto keseluruhan, dan *badge* jumlah foto yang sudah dipilih.
- **FilterTabs**: Tiga tab navigasi - `All` | `Selected` | `Unselected` (dilengkapi dengan *badge* jumlah foto masing-masing).
- **PhotoGrid**: Layout menggunakan *masonry* atau *uniform grid* (4 kolom pada Desktop, 2 kolom pada Mobile).
- **SelectionBar**: Bar *sticky* di bagian paling bawah layar. Menampilkan teks seperti "183 Foto Dipilih" dan tombol "Submit Pilihan".

### 3.3 PhotoCard Component

- **Image Source**: Menggunakan `thumbnailUrl` dari *database* (bersumber dari Google Drive).
- **Interaksi Hover**: Menampilkan `filename` dan ikon untuk membuka *view full photo link* (`viewUrl`).
- **Selected State**: Jika foto dipilih, tampilkan *overlay* dengan ikon centang (*checkmark*) dan *border highlight* (misal: *ring-2* warna *primary*).
- **Toggle Selection**: Klik pada foto akan meng-toggle status *selected* secara instan (*Optimistic UI* tanpa *network call* saat klik).
- **Lazy Loading**: Memanfaatkan komponen `next/image` dengan atribut `loading='lazy'`.
- **Error Fallback**: Jika URL *thumbnail* gagal dimuat atau kadaluarsa (403/404), tampilkan ikon *placeholder* bawaan.

### 3.4 FilterTabs Component

Tab kontrol: `All` | `Selected` | `Unselected`.
- **Client-Side Filtering**: Proses *filtering* dilakukan sepenuhnya di sisi klien (*client-side*). Tidak perlu memanggil API baru saat berganti tab karena *state selection* sudah ada di memori.
- **Real-Time Badges**: *Badge count* pada tab (`Selected` dan `Unselected`) otomatis ter-update secara *real-time* ketika *customer* memilih atau menghapus pilihan foto.

### 3.5 SelectionBar Component (Sticky Bottom)

Selalu terlihat di bagian bawah *viewport*.
```text
[ 183 Foto Dipilih dari maks. 500 ] ---------------------- [ Submit Pilihan ]  
```
- Menampilkan *progress bar* jika *gallery* memiliki batasan `maxSelections`.
- **Disabled State**: Tombol "Submit Pilihan" akan di-*disable* jika belum ada foto yang dipilih (0 foto).
- **Warning Color**: Warna teks atau bar berubah (misal: menjadi *warning/orange*) jika mendekati batas maksimal pilihan.

### 3.6 Submit Modal

Ketika *customer* mengklik "Submit Pilihan":
1. Tampilkan *modal summary*: "Anda memilih 183 foto".
2. Tampilkan *preview strip* yang berisi 5 *thumbnail* foto pertama yang dipilih.
3. Tombol **Konfirmasi** -> Memicu `POST /g/:token/selections/:sessionToken/submit`.
4. **Success State**: Tampilkan pesan "Pilihan berhasil dikirim! Terima kasih, [customerName]."
5. **Post-Submit**: Setelah berhasil *submit*, *disable* semua *toggle selection* (ubah UI ke mode *read-only*).

### 3.7 Session Resume

Saat halaman dimuat (*page load*):
1. Cek `localStorage` untuk *key* `gallery_session_{token}`.
2. Jika ditemukan, panggil `GET /g/:token/selections/:sessionToken`.
3. Jika merespons `200 OK`: Pulihkan daftar `selectedPhotoIds` ke React *state*. Tampilkan *toast notification* "Melanjutkan sesi sebelumnya".
4. Jika API merespons `404 Not Found`: Hapus *key* di `localStorage` dan minta *customer* memasukkan nama lagi lewat *Entry Modal*.

### 3.8 Performance Considerations

> [!TIP]
> Mengingat *gallery* bisa berisi ratusan foto, performa *render* sangat kritikal.

- **Pagination & Infinite Scroll**: Muat 50 foto per halaman. Gunakan *Intersection Observer* pada elemen *footer* untuk memicu *lazy loading* halaman berikutnya.
- **Client-Side Filter**: Memfilter `All/Selected/Unselected` dari array di memori mencegah *re-fetch* yang tidak perlu.
- **Debounced Auto-Save**: Kirimkan status *selection* ke *backend* menggunakan *debounce* (misal: 1.5 detik setelah *toggle* terakhir).
- **Optimistic UI**: Perubahan UI saat memilih foto harus terasa instan tanpa menunggu respons dari *backend*. Sinkronisasi dilakukan di latar belakang.

### 3.9 Error States

- **Gallery Not Found (404)**: Tampilkan halaman *error* yang ramah pengguna (*friendly*).
- **Gallery Inactive/Archived**: Tampilkan pesan "Gallery ini sudah tidak aktif".
- **Network Error (Auto-save)**: Tampilkan *warning toast* "Gagal menyimpan pilihan sementara. Mencoba kembali...", lakukan mekanisme *retry*.
- **Submit Failure**: Jika proses *submit* gagal, beritahu lewat notifikasi dan biarkan pengguna mencoba lagi.

---

## 4. Admin Gallery Management

### 4.1 `/admin/galleries` — Gallery List Page

- **Tabel Kolom**: Name, Total Photos, Status, Last Sync, Submissions Count, Actions.
- **Status Badges**: `DRAFT` (Abu-abu), `ACTIVE` (Hijau), `ARCHIVED` (Kuning gelap/Abu-abu).
- **Actions**:
  - Tombol **Sync Drive** -> Memicu `POST /admin/galleries/:id/sync` (menampilkan *inline progress*).
  - Tombol **Copy URL** untuk menyalin *link* *public gallery* (`/gallery/[token]`).
  - Tombol **Detail** -> Navigasi ke halaman spesifik *gallery*.

### 4.2 `/admin/galleries/new` — Create Gallery Form

- **Fields**:
  - `Gallery Name` (Required)
  - `Google Drive Folder URL` (Required) — *Validation hint*: "Pastikan folder sudah diset publik (Anyone with link → Viewer)".
  - `Description` (Optional, Textarea)
  - `Max Selections` (Optional, Number)
  - `Booking Link` (Optional, Dropdown berisi *booking* dengan status `COMPLETED`).
  - `Status`: Default ke `DRAFT` atau `ACTIVE`.
- **On Submit**: `POST /admin/galleries`.
- **Post-Create**: Setelah sukses, *redirect* ke `/admin/galleries/[id]` dan secara otomatis picu proses *sync* pertama kali.

### 4.3 `/admin/galleries/[id]` — Gallery Detail Page

Bagian-bagian halaman:
1. **Gallery Info Card**: Menampilkan detail nama, `publicUrl`, status, ID folder Drive, tanggal pembuatan.
2. **SyncStatusCard Component**:
   - Menampilkan kapan terakhir *sync*: "5 minutes ago — 247 photos (12 new, 2 removed)".
   - Menampilkan proses *sync* berjalan: *Progress bar* + "Syncing... 183 / 247 files".
   - Tombol **Sync Drive** (di-*disable* jika status sedang `RUNNING`).
3. **Overview Stats**: Jumlah total foto dan total keseluruhan foto yang dipilih oleh seluruh *customer*.
4. **Quick Link**: Navigasi ke daftar `/selections`.

### 4.4 SyncStatusCard Component

Perilaku *polling*:
- Ketika *sync* berstatus `RUNNING`: Lakukan *polling* `GET /admin/galleries/:id/sync/latest` setiap 2 detik.
- **Display**: Tampilkan *progress bar*, rasio `syncedFiles / totalFiles`, dan `percentComplete`.
- Ketika status `COMPLETED`: Hentikan *polling* dan tampilkan hasil (jumlah foto baru, jumlah foto terhapus).
- Ketika status `FAILED`: Tampilkan `errorMessage` di dalam *alert box* merah.
- **Implementasi**: Gunakan *hook* `useEffect` dengan `setInterval`, atau SWR dengan `refreshInterval: 2000` (kondisional berdasarkan status).

### 4.5 `/admin/galleries/[id]/selections` — Customer Selections List

- **Tabel Kolom**: Customer Name, Email, Selected Count, Status (`DRAFT` / `SUBMITTED`), Submitted At, Actions.
- **Filter**: Dropdown filter berdasarkan status (All | SUBMITTED | DRAFT).
- **Action (View Detail)**: Membuka *modal* atau halaman detail yang memuat informasi *customer* beserta *grid thumbnail* foto-foto yang telah mereka pilih.

---

## 5. Komponen Baru yang Dibutuhkan

Tempatkan komponen ini di `apps/web/app/(public)/gallery/_components/` atau *shared components folder*.

| Component Name | Lokasi | Props Interface (Utama) | Tanggung Jawab |
|----------------|--------|-------------------------|----------------|
| `PhotoGrid` | `.../_components/PhotoGrid.tsx` | `photos: Photo[], onToggle: (id) => void` | Me-render *grid* foto yang mendukung *masonry layout* dan *lazy load*. |
| `PhotoCard` | `.../_components/PhotoCard.tsx` | `photo: Photo, isSelected: boolean, onToggle` | Merender satu item foto, *hover effect*, dan *selected state overlay*. |
| `SelectionBar` | `.../_components/SelectionBar.tsx` | `selectedCount: number, max: number, onSubmit` | Bar *sticky* bawah untuk *submit* pilihan. |
| `FilterTabs` | `.../_components/FilterTabs.tsx` | `active: string, counts: Record<string, number>, onChange` | Tab navigasi `All / Selected / Unselected`. |
| `SubmitModal` | `.../_components/SubmitModal.tsx` | `isOpen, onClose, onSubmit, selectedPhotos` | *Modal* konfirmasi sebelum *submit final*. |
| `SyncStatusCard`| `.../_components/SyncStatusCard.tsx` | `galleryId: string, initialStatus: SyncJob` | Merender *progress bar sync* Drive dan mengatur mekanisme *polling*. |
| `GalleryEntryModal` | `.../_components/GalleryEntryModal.tsx` | `isOpen, onSubmitCustomerData` | *Modal* meminta input nama *customer* sebelum memulai sesi. |
| `PhotoSelectionPage` | `.../_components/PhotoSelectionPage.tsx`| `gallery: GalleryInfo, initialPhotos: Photo[]` | *Orchestrator* utama halaman publik, mengelola *state* dan integrasi komponen. |

---

## 6. State Management

Pendekatan manajemen *state* untuk halaman `PhotoSelectionPage` disarankan menggunakan **Zustand** atau **React `useReducer`** karena kompleksitas *state selection*, *filtering*, dan UI. (Tidak perlu Redux karena *overkill*).

Struktur *State*:
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

Aksi (*Actions*):
- `togglePhoto(photoId: string)`: Menambah/menghapus ID dari set `selectedPhotoIds`.
- `setFilter(filter: 'all' | 'selected' | 'unselected')`: Mengubah tab aktif.
- `loadNextPage()`: Memuat halaman *pagination* foto selanjutnya.
- `submitSelection()`: Memanggil API *submit final*.
- `restoreSession(sessionToken: string)`: Mengembalikan state foto terpilih setelah *page reload*.

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

Simpan definisi *type* ini di `apps/web/types/gallery.ts`:

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

- **Admin Sidebar**: Tambahkan menu baru `Galleries` di bawah *navigation sidebar* dashboard `/admin`.
- **Booking Integration**: Pada halaman detail *Booking*, jika status *booking* adalah `COMPLETED`, tambahkan tombol/tautan cepat "Buat Gallery" yang otomatis mengarahkan ke form `/admin/galleries/new` dengan `bookingId` terisi.
- **CRM / WAHA Integration**: Tautan (*link*) `publicUrl` dari *gallery* akan disalin oleh Admin dan dibagikan kepada klien melalui WhatsApp, berpotensi diintegrasikan dengan fitur CRM WhatsApp yang sudah ada untuk pengiriman otomatis.

---
*End of Document*
