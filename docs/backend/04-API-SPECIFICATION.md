# 🔌 Spesifikasi REST API & Kontrak Webhook (API Specification)
## Photography Platform Monorepo (Kaya Story Semarang)

- **Base URL Public**: `http://localhost:3002/api/v1`
- **Internal Docker URL**: `http://photography-api:3000/api/v1`
- **Interactive Documentation**: Swagger UI tersedia di `http://localhost:3002/docs`

---

## 1. Global Headers & Authentication

Sistem menggunakan skema autentikasi Bearer JWT. Token didapatkan dari endpoint `/auth/login` dan harus disertakan di dalam setiap *request* yang membutuhkan autentikasi (Admin/Staff access).

**Contoh Header:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Standard Error Codes Catalogue

Apabila terjadi kesalahan, API akan membalas dengan struktur respon gagal standar.

| HTTP Status | Error Code | Deskripsi |
|---|---|---|
| `400` | `BAD_REQUEST` | Input dari klien tidak sesuai format (validasi gagal). |
| `401` | `UNAUTHORIZED` | Token hilang atau tidak valid. |
| `403` | `FORBIDDEN` | Pengguna tidak memiliki akses. (Misal: `CRM_24H_WINDOW_LOCKED`). |
| `404` | `NOT_FOUND` | Data/Resource yang dicari tidak ditemukan. |
| `429` | `TOO_MANY_REQUESTS` | Melebihi limit *Rate Limiting*. |
| `500` | `INTERNAL_SERVER_ERROR` | Terjadi kesalahan pada internal server. |

**Contoh Error Response:**
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Jendela interaksi 24 jam telah terkunci untuk kontak ini.",
  "errorCode": "CRM_24H_WINDOW_LOCKED"
}
```

---

## 3. Pagination & Rate Limiting

### Pagination
Semua endpoint berjenis list menggunakan parameter query `page` dan `limit` dengan pembungkus (*envelope*) struktur pagination.

**Contoh Query:** `GET /admin/bookings?page=1&limit=10`

**Contoh Response Envelope:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": [...],
  "meta": {
    "total": 55,
    "page": 1,
    "lastPage": 6,
    "limit": 10
  }
}
```

### Rate Limiting
Endpoint krusial dibatasi untuk mencegah SPAM/Brute force:
- `POST /auth/login` : 5 req / menit / IP
- `POST /bookings` : 10 req / menit / IP
- Endpoint lain standar 60 req / menit / IP

---

## 4. Modul Autentikasi (`/api/v1/auth`)

### 4.1 Login Admin
- **Method / Endpoint**: `POST /auth/login`
- **Akses**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@kayastory.com",
    "password": "passwordSuperRahasia123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Login berhasil",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
      "user": {
        "id": "usr-01",
        "name": "Bima Satria",
        "email": "admin@kayastory.com",
        "role": "ADMIN"
      }
    }
  }
  ```
- **Error Response `401 Unauthorized`**:
  ```json
  {
    "success": false,
    "statusCode": 401,
    "message": "Email atau password salah",
    "errorCode": "UNAUTHORIZED"
  }
  ```

---

## 5. Modul Katalog Paket & Addon (`/api/v1/packages`)

### 5.1 Ambil Semua Paket Aktif (Katalog Publik)
- **Method / Endpoint**: `GET /packages`
- **Query Params**: `?category=Solo` *(opsional)*
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "pkg-1",
        "name": "Solo Kebaya Signature",
        "slug": "solo-kebaya",
        "category": "Solo",
        "price": 450000,
        "durationMinutes": 45,
        "maxPeople": 1,
        "editedPhotos": 10,
        "allRawIncluded": true,
        "totalBookings": 142
      }
    ]
  }
  ```

### 5.2 (Admin) Get All Packages
- **Method**: `GET /admin/packages`
- **Akses**: Admin
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "pkg-1",
        "name": "Solo Kebaya",
        "isActive": true
      }
    ],
    "meta": { "total": 10, "page": 1, "lastPage": 1, "limit": 10 }
  }
  ```

### 5.3 (Admin) Create Package
- **Method**: `POST /admin/packages`
- **Akses**: Admin
- **Request Body**:
  ```json
  {
    "name": "Couple Package",
    "slug": "couple-package",
    "category": "Squad",
    "price": 500000,
    "durationMinutes": 60,
    "maxPeople": 2,
    "editedPhotos": 15
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "data": { "id": "pkg-2", "name": "Couple Package" }
  }
  ```
- **Error Response `400 Bad Request`**:
  ```json
  {
    "success": false,
    "statusCode": 400,
    "message": "Slug sudah digunakan",
    "errorCode": "BAD_REQUEST"
  }
  ```

### 5.4 (Admin) Update Package
- **Method**: `PUT /admin/packages/:id`
- **Akses**: Admin
- **Request Body**: (Opsional field yang ingin diupdate)
  ```json
  { "price": 550000, "isActive": false }
  ```
- **Response `200 OK`**:
  ```json
  { "success": true, "statusCode": 200, "data": { "id": "pkg-2", "price": 550000, "isActive": false } }
  ```

### 5.5 (Admin) Delete Package
- **Method**: `DELETE /admin/packages/:id`
- **Akses**: Admin
- **Response `200 OK`**:
  ```json
  { "success": true, "statusCode": 200, "message": "Paket berhasil dihapus secara sistem (soft delete)" }
  ```
- **Error Response `404 Not Found`**:
  ```json
  { "success": false, "statusCode": 404, "message": "Paket tidak ditemukan", "errorCode": "NOT_FOUND" }
  ```

---

## 6. Modul Reservasi & Checkout (`/api/v1/bookings`)

### 6.1 Cek Ketersediaan Slot Waktu Sesi
- **Method / Endpoint**: `GET /bookings/availability`
- **Query Params**: `?date=2026-08-25&packageId=pkg-1`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "date": "2026-08-25",
      "isBlackoutDate": false,
      "slots": [
        { "timeSlot": "09:00 - 10:00", "available": false, "reason": "Booked" },
        { "timeSlot": "10:30 - 11:30", "available": true }
      ]
    }
  }
  ```
- **Error Response `400 Bad Request`**:
  ```json
  { "success": false, "statusCode": 400, "message": "Tanggal diperlukan", "errorCode": "BAD_REQUEST" }
  ```

### 6.2 Pembuatan Booking Baru (Step 1-3 Checkout)
- **Method / Endpoint**: `POST /bookings`
- **Akses**: Public
- **Request Body**:
  ```json
  {
    "packageId": "pkg-1",
    "customerName": "Anisa Rahmawati",
    "customerPhone": "081234567890",
    "customerEmail": "anisa.rahma@gmail.com",
    "university": "Universitas Diponegoro",
    "faculty": "Ekonomi",
    "sessionDate": "2026-08-25",
    "timeSlot": "10:30 - 11:30",
    "location": "Studio Tembalang",
    "addonIds": ["ad-1"],
    "notes": "Tone warm"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Pemesanan berhasil",
    "data": {
      "bookingId": "c8b4f102-...",
      "bookingCode": "KYA-2026-081",
      "totalPrice": 645000,
      "minimumDp": 322500,
      "status": "PENDING_VERIFICATION",
      "paymentInstructions": {
        "bank": "BCA",
        "accountNumber": "8030556789",
        "accountName": "Kaya Story Photography"
      }
    }
  }
  ```
- **Error Response `409 Conflict`**:
  ```json
  { "success": false, "statusCode": 409, "message": "Slot waktu sudah dipesan", "errorCode": "SLOT_UNAVAILABLE" }
  ```

### 6.3 Get Booking By ID / Code
- **Method**: `GET /bookings/:id`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "bookingCode": "KYA-2026-081",
      "customerName": "Anisa Rahmawati",
      "sessionDate": "2026-08-25",
      "timeSlot": "10:30 - 11:30",
      "status": "CONFIRMED",
      "paymentStatus": "PAID_FULL"
    }
  }
  ```
- **Error Response `404 Not Found`**:
  ```json
  { "success": false, "statusCode": 404, "message": "Booking tidak ditemukan", "errorCode": "NOT_FOUND" }
  ```

### 6.4 (Admin) Get All Bookings
- **Method**: `GET /admin/bookings`
- **Akses**: Admin
- **Query Params**: `?status=CONFIRMED&page=1&limit=20&search=KYA-2026-081`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "...",
        "bookingCode": "KYA-2026-081",
        "customerName": "Anisa Rahmawati",
        "status": "CONFIRMED"
      }
    ],
    "meta": { "total": 100, "page": 1, "lastPage": 5, "limit": 20 }
  }
  ```

### 6.5 Unggah Bukti Pembayaran (Step 4 Checkout)
- **Method**: `POST /bookings/:id/payment-proof`
- **Content-Type**: `multipart/form-data`
- **Body Form**: `file`, `paymentBank`, `paymentAmount`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Bukti pembayaran diunggah",
    "data": { "paymentStatus": "WAITING_CONFIRMATION" }
  }
  ```

### 6.6 (Admin) Verifikasi Pembayaran
- **Method**: `POST /admin/bookings/:id/verify-payment`
- **Akses**: Admin
- **Request Body**:
  ```json
  { "verifiedAmount": 645000, "isFull": true }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Pembayaran dikonfirmasi",
    "data": { "invoiceNumber": "INV-KYA-2026-081", "status": "CONFIRMED", "paymentStatus": "PAID_FULL" }
  }
  ```

---

## 7. Modul Invoices & Notifikasi

### 7.1 (Admin) Get All Invoices
- **Method**: `GET /admin/invoices`
- **Akses**: Admin
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      { "invoiceNumber": "INV-KYA-2026-081", "totalAmount": 645000, "status": "PAID_FULL" }
    ],
    "meta": { "total": 50, "page": 1, "lastPage": 3, "limit": 20 }
  }
  ```

### 7.2 (Admin) Get Notifications
- **Method**: `GET /admin/notifications`
- **Akses**: Admin
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      { "id": "notif-1", "title": "New Booking", "message": "Booking KYA-2026-081 created", "read": false }
    ]
  }
  ```

---

## 8. Modul WAHA & Mini CRM (`/api/v1/admin/crm`)

### 8.1 (Admin) Generate QR Code WAHA
- **Method**: `POST /admin/waha/qr`
- **Akses**: Admin
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": { "qrBase64": "data:image/png;base64,iVBORw0K..." }
  }
  ```

### 8.2 (Admin) Update Chat Tag
- **Method**: `PUT /admin/crm/chats/:id/tag`
- **Akses**: Admin
- **Request Body**: `{ "activeTag": "Menunggu Transfer" }`
- **Response `200 OK`**:
  ```json
  { "success": true, "statusCode": 200, "message": "Tag diubah", "data": { "activeTag": "Menunggu Transfer" } }
  ```

### 8.3 Kirim Pesan WhatsApp CRM
- **Method**: `POST /admin/crm/chats/:id/send`
- **Akses**: Admin
- **Request Body**:
  ```json
  { "messageType": "FREE_FORM", "content": "Halo kak" }
  ```
- **Error Response `403 Forbidden` (Jendela 24 jam terkunci)**:
  ```json
  { "success": false, "statusCode": 403, "message": "Jendela interaksi 24 jam terkunci", "errorCode": "CRM_24H_WINDOW_LOCKED" }
  ```

---

## 9. Modul Pengaturan & Template

### 9.1 (Admin) Get All Templates
- **Method**: `GET /admin/templates`
- **Akses**: Admin
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      { "id": "tpl-1", "code": "BOOKING_CREATED", "name": "Notif Booking", "type": "EMAIL" }
    ]
  }
  ```

### 9.2 (Admin) Update Template
- **Method**: `PUT /admin/templates/:id`
- **Akses**: Admin
- **Request Body**: `{ "content": "Halo {{customerName}}, pesanan Anda..." }`
- **Response `200 OK`**:
  ```json
  { "success": true, "statusCode": 200, "message": "Template diupdate" }
  ```

### 9.3 Get Studio Profile
- **Method**: `GET /studio-profile`
- **Akses**: Public
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "studioName": "Kaya Story Photography",
      "whatsappNumber": "6281234567890",
      "address": "Jl. Banjarsari No. 48"
    }
  }
  ```

---

## Bagian 2: API Specification — Fitur Google Drive Gallery

> Dokumen ini sebelumnya terpisah sebagai `07-GALLERY-API.md`. Digabungkan ke API Specification utama.

# 07 - GALLERY API SPECIFICATION

## Feature: Google Drive Gallery & Customer Photo Selection

API specification ini mencakup fitur gallery di mana fotografer dapat menghubungkan public Google Drive folder, backend akan men-sync metadata foto, dan customer dapat melakukan pemilihan foto.

- **Base URL:** `http://localhost:3002/api/v1`
- **Authentication:** Admin endpoints require Bearer JWT. Public endpoints tidak memerlukan auth (hanya menggunakan `public_token`).

---

### 1. Global Notes

- **Public endpoints** menggunakan gallery `public_token` (cuid), BUKAN internal UUID. Hal ini untuk keamanan agar URL gallery tidak mudah ditebak.
- **Admin endpoints** memerlukan Bearer JWT di header `Authorization: Bearer <token>`.

**Standard Response Envelope:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2026-09-15T10:00:00.000Z"
}
```

**Standard Error Envelope:**
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Gallery not found",
  "errorCode": "GALLERY_NOT_FOUND",
  "timestamp": "2026-09-15T10:00:00.000Z"
}
```

---

### 2. Gallery Admin Endpoints (JWT required)

#### `POST /admin/galleries`

Membuat gallery baru.

**Request Body:**
```json
{
  "name": "Wedding Andi & Sinta",
  "driveFolderUrl": "https://drive.google.com/drive/folders/1XXXXXXXXX",
  "description": "Foto pernikahan 15 September 2026",
  "maxSelections": 100,
  "bookingId": "optional-booking-uuid"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "uuid",
    "name": "Wedding Andi & Sinta",
    "slug": "wedding-andi-sinta",
    "publicToken": "cuid_token",
    "publicUrl": "https://frontend.domain/gallery/cuid_token",
    "driveFolderId": "1XXXXXXXXX",
    "status": "DRAFT",
    "maxSelections": 100,
    "createdAt": "2026-09-15T10:00:00.000Z"
  }
}
```

**Errors:**
- `400 DRIVE_FOLDER_INVALID` — Format URL Google Drive tidak dikenali.

---

#### `GET /admin/galleries`

List gallery dengan pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | number | 1 | Halaman |
| `limit` | number | 10 | Items per halaman (max 50) |
| `status` | string | — | Filter: `DRAFT`, `ACTIVE`, `ARCHIVED` |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Wedding Andi & Sinta",
      "publicToken": "cuid_token",
      "status": "ACTIVE",
      "totalPhotos": 247,
      "totalSubmissions": 3,
      "lastSyncAt": "2026-09-15T09:00:00.000Z",
      "createdAt": "2026-09-15T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

#### `GET /admin/galleries/:id`

Detail dari satu gallery, termasuk info sync job terbaru.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Wedding Andi & Sinta",
    "slug": "wedding-andi-sinta",
    "publicToken": "cuid_token",
    "publicUrl": "https://frontend.domain/gallery/cuid_token",
    "driveFolderId": "1XXXXXXXXX",
    "status": "ACTIVE",
    "description": "Foto pernikahan 15 September 2026",
    "maxSelections": 100,
    "totalPhotos": 247,
    "totalActivePhotos": 245,
    "latestSyncJob": {
      "id": "job-uuid",
      "status": "COMPLETED",
      "totalFiles": 247,
      "syncedFiles": 247,
      "newFiles": 12,
      "removedFiles": 2,
      "completedAt": "2026-09-15T09:05:00.000Z"
    },
    "bookingId": null,
    "createdAt": "2026-09-15T08:00:00.000Z",
    "updatedAt": "2026-09-15T09:05:00.000Z"
  }
}
```

---

#### `PUT /admin/galleries/:id`

Update informasi gallery.

**Request Body** (semua field opsional):
```json
{
  "name": "Wedding Andi & Sinta - Edited",
  "description": "Updated description",
  "status": "ACTIVE",
  "maxSelections": 150
}
```

**Response `200 OK`:** Updated gallery object.

---

#### `DELETE /admin/galleries/:id`

Hapus gallery.

**Logic:** Hanya gallery berstatus `DRAFT` yang dapat dihapus. Gallery `ACTIVE` harus diubah ke `ARCHIVED` terlebih dahulu.

**Errors:**
- `400 GALLERY_NOT_DELETABLE` — Gallery bukan DRAFT.

---

#### `POST /admin/galleries/:id/sync`

Trigger background sync metadata dari Google Drive ke database.

**Response `202 Accepted`:**
```json
{
  "success": true,
  "statusCode": 202,
  "message": "Sync job created",
  "data": {
    "syncJobId": "job-uuid"
  }
}
```

**Errors:**
- `409 SYNC_ALREADY_RUNNING` — Sync sedang berjalan untuk gallery ini.

---

#### `GET /admin/galleries/:id/sync/latest`

Poll status sync job terbaru. Frontend memanggil endpoint ini setiap 2 detik saat sync berjalan.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "job-uuid",
    "status": "RUNNING",
    "totalFiles": 500,
    "syncedFiles": 250,
    "newFiles": 230,
    "removedFiles": 5,
    "percentComplete": 50,
    "errorMessage": null,
    "startedAt": "2026-09-15T10:00:00.000Z",
    "completedAt": null
  }
}
```

`status` dapat berupa: `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`.

---

#### `GET /admin/galleries/:id/photos`

List semua foto dalam gallery (termasuk `isActive=false`). Khusus admin.

**Query Parameters:** `page`, `limit`, `isActive` (boolean filter).

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "filename": "DSC_0001.jpg",
      "driveFileId": "1ABC...",
      "thumbnailUrl": "https://drive.google.com/thumbnail?id=1ABC&sz=w400",
      "viewUrl": "https://drive.google.com/file/d/1ABC/view",
      "mimeType": "image/jpeg",
      "isActive": true,
      "sortOrder": 0
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 247, "totalPages": 5 }
}
```

---

#### `GET /admin/galleries/:id/selections`

List semua customer selections untuk gallery ini.

**Query Parameters:**
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `status` | string | Filter: `DRAFT`, `SUBMITTED` |
| `page` | number | Halaman |
| `limit` | number | Max 50 |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "customerName": "Budi Santoso",
      "customerEmail": "budi@example.com",
      "customerPhone": "081234567890",
      "selectedCount": 183,
      "status": "SUBMITTED",
      "submittedAt": "2026-09-15T14:30:00.000Z",
      "createdAt": "2026-09-15T13:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 3, "totalPages": 1 }
}
```

---

#### `GET /admin/galleries/:id/selections/:selectionId`

Detail lengkap satu selection beserta daftar foto yang dipilih.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "customerName": "Budi Santoso",
    "customerEmail": "budi@example.com",
    "customerPhone": "081234567890",
    "status": "SUBMITTED",
    "submittedAt": "2026-09-15T14:30:00.000Z",
    "selectedPhotos": [
      {
        "id": "photo-uuid",
        "filename": "DSC_0001.jpg",
        "driveFileId": "1ABC...",
        "thumbnailUrl": "https://drive.google.com/thumbnail?id=1ABC&sz=w400",
        "viewUrl": "https://drive.google.com/file/d/1ABC/view"
      }
    ]
  }
}
```

---

### 3. Public Gallery Endpoints (no auth, rate limited)

#### `GET /g/:token`

Informasi dasar gallery untuk landing page customer.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "name": "Wedding Andi & Sinta",
    "description": "Foto pernikahan 15 September 2026",
    "totalPhotos": 247,
    "maxSelections": 100,
    "status": "ACTIVE"
  }
}
```

**Errors:**
- `404 GALLERY_NOT_FOUND` — Token tidak valid.
- `403 GALLERY_INACTIVE` — Gallery berstatus `DRAFT` atau `ARCHIVED`.

---

#### `GET /g/:token/photos`

List foto untuk grid view. Hanya foto `isActive = true`.

**Query Parameters:**
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | number | 1 | Halaman |
| `limit` | number | 50 | Max 100 |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "filename": "DSC_0001.jpg",
      "driveFileId": "1ABC...",
      "thumbnailUrl": "https://drive.google.com/thumbnail?id=1ABC&sz=w400",
      "viewUrl": "https://drive.google.com/file/d/1ABC/view"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 247,
    "totalPages": 5
  }
}
```

---

#### `POST /g/:token/selections`

Membuat sesi pemilihan baru. Customer harus memasukkan nama sebelum melihat gallery.

**Request Body:**
```json
{
  "customerName": "Budi Santoso",
  "customerEmail": "budi@example.com",
  "customerPhone": "081234567890"
}
```

**Response `201 Created`:**
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "sessionToken": "session_cuid",
    "selectionId": "selection_uuid"
  }
}
```

> Browser menyimpan `sessionToken` di `localStorage` dengan key `gallery_session_{token}`.

---

#### `GET /g/:token/selections/:sessionToken`

Resume session — mengembalikan state selection saat ini.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "status": "DRAFT",
    "customerName": "Budi Santoso",
    "selectedCount": 2,
    "selectedPhotoIds": ["uuid1", "uuid2"]
  }
}
```

**Errors:**
- `404 SESSION_NOT_FOUND` — Session token tidak valid.

---

#### `PUT /g/:token/selections/:sessionToken`

Auto-save draft selection (dipanggil secara debounced dari frontend setiap 1.5 detik setelah perubahan).

**Request Body** — full replacement array dari ID foto yang dipilih:
```json
{
  "photoIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Validasi:**
- `maxSelections` tidak boleh dilampaui.
- Semua `photoId` harus merupakan foto aktif milik gallery ini.

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "selectedCount": 3
  }
}
```

**Errors:**
- `409 SELECTION_ALREADY_SUBMITTED`
- `422 SELECTION_MAX_EXCEEDED`
- `400 PHOTO_NOT_IN_GALLERY`

---

#### `POST /g/:token/selections/:sessionToken/submit`

Finalize dan submit selection. Tidak dapat diubah setelah ini.

**Request Body:** `{}` (kosong — menggunakan draft yang ada)

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "submittedAt": "2026-09-15T10:15:00.000Z",
    "selectedCount": 183,
    "message": "Pilihan Anda berhasil dikirim! Terima kasih, Budi Santoso."
  }
}
```

**Errors:**
- `409 SELECTION_ALREADY_SUBMITTED`

---

### 4. Error Codes Full Catalogue

| HTTP Status | Error Code | Description | Endpoint |
| :--- | :--- | :--- | :--- |
| 404 | `GALLERY_NOT_FOUND` | Token atau ID gallery tidak valid. | `/g/:token/*`, `/admin/galleries/:id` |
| 403 | `GALLERY_INACTIVE` | Gallery DRAFT atau ARCHIVED diakses secara publik. | `/g/:token/*` |
| 409 | `GALLERY_SYNC_RUNNING` | Operasi diblokir karena sync sedang berjalan. | `/admin/galleries/:id` |
| 400 | `DRIVE_FOLDER_INVALID` | Format URL Google Drive tidak valid atau tidak bisa di-extract folder ID-nya. | `POST /admin/galleries` |
| 403 | `DRIVE_FOLDER_PRIVATE` | Folder Google Drive belum diset *Anyone with link → Viewer*. | Sync background job |
| 400 | `DRIVE_FOLDER_EMPTY` | Folder Google Drive tidak memiliki file image sama sekali. | Sync background job |
| 500 | `DRIVE_PARSE_FAILED` | Parser gagal memproses respons dari Google Drive. | Sync background job |
| 409 | `SYNC_ALREADY_RUNNING` | Trigger sync ketika job sebelumnya masih berjalan. | `POST /admin/galleries/:id/sync` |
| 404 | `SYNC_JOB_NOT_FOUND` | Job ID tidak ditemukan. | `GET /admin/galleries/:id/sync/latest` |
| 400 | `PHOTO_NOT_IN_GALLERY` | `photoId` yang disimpan bukan milik gallery ini. | `PUT /g/:token/selections/:sessionToken` |
| 404 | `PHOTO_NOT_FOUND` | `photoId` tidak ditemukan di database. | `PUT /g/:token/selections/:sessionToken` |
| 409 | `SELECTION_ALREADY_SUBMITTED` | Mencoba mengubah atau submit selection yang sudah `SUBMITTED`. | `PUT`, `POST` pada `/selections/:sessionToken` |
| 422 | `SELECTION_MAX_EXCEEDED` | Jumlah foto yang dipilih melebihi limit `maxSelections`. | `PUT /g/:token/selections/:sessionToken` |
| 404 | `SESSION_NOT_FOUND` | Session token tidak valid. | `GET`, `PUT`, `POST` pada `/selections/:sessionToken` |
| 400 | `GALLERY_NOT_DELETABLE` | Mencoba menghapus gallery yang bukan berstatus `DRAFT`. | `DELETE /admin/galleries/:id` |

---

### 5. Rate Limiting

| Endpoint Group | Limit | Alasan |
| :--- | :--- | :--- |
| Public Endpoints (`/g/:token/*`) | 60 req/min per IP | Mencegah scraping dan DoS pada gallery public. |
| Selection Submit (`…/submit`) | 5 req/min per IP | Mencegah spam submission. |
| Sync Trigger (`…/sync`) | 10 req/min per admin account | Mencegah queue overload karena admin spam klik. |

---

### 6. Sync Status Polling Example

Implementasi polling di frontend (React) menggunakan `setInterval`:

```typescript
async function pollSyncStatus(
  galleryId: string,
  jwtToken: string,
  onProgress: (job: SyncJob) => void,
  onComplete: (job: SyncJob) => void,
  onError: (job: SyncJob) => void,
): Promise<void> {
  const intervalId = setInterval(async () => {
    try {
      const response = await fetch(
        `/api/v1/admin/galleries/${galleryId}/sync/latest`,
        { headers: { Authorization: `Bearer ${jwtToken}` } }
      );
      const result = await response.json();
      const job: SyncJob = result.data;

      onProgress(job);

      if (job.status === 'COMPLETED') {
        clearInterval(intervalId);
        onComplete(job);
      } else if (job.status === 'FAILED') {
        clearInterval(intervalId);
        onError(job);
      }
    } catch (err) {
      clearInterval(intervalId);
      console.error('Polling error:', err);
    }
  }, 2000); // poll every 2 seconds
}
```

Contoh penggunaan di komponen React:
```tsx
const [syncJob, setSyncJob] = useState<SyncJob | null>(null);

const handleSync = async () => {
  await fetch(`/api/v1/admin/galleries/${id}/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });

  pollSyncStatus(
    id,
    token,
    (job) => setSyncJob(job),               // update progress bar
    (job) => { setSyncJob(job); toast.success(`Sync selesai: ${job.newFiles} foto baru`); },
    (job) => { setSyncJob(job); toast.error(`Sync gagal: ${job.errorMessage}`); },
  );
};
```
