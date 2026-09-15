# 🔌 Spesifikasi REST API & Kontrak Webhook (API Specification)
## Photography Platform Monorepo (Kaya Story Semarang)

- **Base URL Public**: `http://localhost:3002/api/v1`
- **Internal Docker URL**: `http://photography-api:3000/api/v1`
- **Interactive Documentation**: Swagger UI tersedia di `http://localhost:3002/docs`
- **Autentikasi**: Bearer Token (`Authorization: Bearer <JWT_ACCESS_TOKEN>`)

---

## 1. Modul Autentikasi (`/api/v1/auth`)

### 1.1 Login Admin
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
      "refreshToken": "dGhpcy1pcy1hLXJlZnJl...",
      "user": {
        "id": "usr-01",
        "name": "Bima Satria",
        "email": "admin@kayastory.com",
        "role": "ADMIN"
      }
    }
  }
  ```

---

## 2. Modul Katalog Paket & Addon (`/api/v1/packages`)

### 2.1 Ambil Semua Paket Aktif (Katalog Publik)
- **Method / Endpoint**: `GET /packages`
- **Query Params**: `?category=Solo` *(opsional: Solo, Squad, Family, Cinematic)*
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

---

## 3. Modul Reservasi & Checkout (`/api/v1/bookings`)

### 3.1 Cek Ketersediaan Slot Waktu Sesi
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
        { "timeSlot": "10:30 - 11:30", "available": true },
        { "timeSlot": "13:00 - 14:00", "available": true },
        { "timeSlot": "15:00 - 16:00", "available": true }
      ]
    }
  }
  ```

### 3.2 Pembuatan Booking Baru (Step 1-3 Checkout)
- **Method / Endpoint**: `POST /bookings`
- **Akses**: Public (Throttled: Max 10 req/menit)
- **Request Body**:
  ```json
  {
    "packageId": "pkg-1",
    "customerName": "Anisa Rahmawati",
    "customerPhone": "081234567890",
    "customerEmail": "anisa.rahma@gmail.com",
    "university": "Universitas Diponegoro (Undip)",
    "faculty": "Fakultas Ekonomika dan Bisnis",
    "sessionDate": "2026-08-25",
    "timeSlot": "10:30 - 11:30",
    "location": "Studio Kayastory (Tembalang)",
    "addonIds": ["ad-1", "ad-2"],
    "notes": "Mau tone warm vintage 35mm, bawa 2 kebaya ganti."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Pemesanan berhasil dibuat, silakan lakukan pembayaran",
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

### 3.3 Unggah Bukti Pembayaran (Step 4 Checkout)
- **Method / Endpoint**: `POST /bookings/:id/payment-proof`
- **Content-Type**: `multipart/form-data`
- **Body Form**:
  - `file`: (File gambar bukti transfer, maks 5MB)
  - `paymentBank`: "BCA (A.N. Anisa Rahmawati)"
  - `paymentAmount`: 645000
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Bukti pembayaran berhasil diunggah, menunggu verifikasi admin studio",
    "data": {
      "bookingCode": "KYA-2026-081",
      "paymentStatus": "WAITING_CONFIRMATION"
    }
  }
  ```

### 3.4 Verifikasi Pembayaran oleh Admin
- **Method / Endpoint**: `POST /admin/bookings/:id/verify-payment`
- **Header**: `Authorization: Bearer <TOKEN>`
- **Request Body**:
  ```json
  {
    "verifiedAmount": 645000,
    "isFull": true
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Pembayaran dikonfirmasi. Invoice terbit dan otomatis dikirim via WhatsApp & Email.",
    "data": {
      "invoiceNumber": "INV-KYA-2026-081",
      "status": "CONFIRMED",
      "paymentStatus": "PAID_FULL"
    }
  }
  ```

### 3.5 Penolakan Bukti Pembayaran oleh Admin
- **Method / Endpoint**: `POST /admin/bookings/:id/reject-payment`
- **Request Body**:
  ```json
  {
    "reason": "Nominal transfer tidak sesuai (kurang Rp 50.000) atau bukti transfer buram."
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Bukti transfer ditolak. Notifikasi perbaikan telah dikirim ke WhatsApp pemesan.",
    "data": {
      "status": "PENDING_VERIFICATION",
      "paymentStatus": "REJECTED"
    }
  }
  ```

---

## 4. Modul WAHA & Mini CRM (`/api/v1/admin/crm` & `/api/v1/webhooks`)

### 4.1 Cek Status Engine WAHA
- **Method / Endpoint**: `GET /admin/waha/status`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "status": "WORKING",
      "session": "default",
      "connectedPhone": "6281234567890"
    }
  }
  ```

### 4.2 Webhook Masuk dari WAHA
- **Method / Endpoint**: `POST /webhooks/waha`
- **Akses**: Public (Divalidasi dengan Shared Secret Header)
- **Payload Event WAHA**:
  ```json
  {
    "event": "message",
    "session": "default",
    "payload": {
      "id": "false_6281234567890@c.us_3EB0...",
      "from": "6281234567890@c.us",
      "body": "Halo kak, apakah slot tanggal 25 masih bisa?",
      "timestamp": 1726418400
    }
  }
  ```
- **Logika Internal Backend**:
  1. Ekstrak nomor HP pengirim.
  2. Cari entitas `crm_chats` atau buat baru jika belum ada.
  3. Perbarui `last_customer_message_at = NOW()` (Membuka jendela interaksi 24 jam).
  4. Simpan pesan ke `crm_messages`.

### 4.3 Kirim Pesan WhatsApp CRM (Dengan Validasi Jendela 24 Jam Anti-Ban)
- **Method / Endpoint**: `POST /admin/crm/chats/:id/send`
- **Request Body**:
  ```json
  {
    "messageType": "FREE_FORM",
    "content": "Halo kak Anisa, slotnya masih aman yaa, silakan langsung diamankan di website."
  }
  ```
- **Response jika Jendela > 24 Jam (`403 Forbidden`)**:
  ```json
  {
    "success": false,
    "statusCode": 403,
    "message": "Jendela interaksi 24 jam telah terkunci untuk kontak ini. Gunakan template resmi terdaftar untuk menyapa pelanggan kembali.",
    "errorCode": "CRM_24H_WINDOW_LOCKED"
  }
  ```
- **Request Body jika Jendela Terkunci (Menggunakan Template Resmi)**:
  ```json
  {
    "messageType": "TEMPLATE",
    "templateCode": "REMINDER_H_MIN_1",
    "variables": {
      "customerName": "Anisa Rahmawati",
      "timeSlot": "09:00 WIB"
    }
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Pesan template resmi berhasil dikirim melalui WAHA"
  }
  ```

---

## 5. Modul Invoices & Dokumen PDF (`/api/v1/invoices`)

### 5.1 Unduh File PDF Invoice
- **Method / Endpoint**: `GET /invoices/:invoiceNumber/pdf`
- **Akses**: Public (Menggunakan invoice token atau booking code)
- **Response**: `Content-Type: application/pdf` (Binary Stream File)

---

## 6. Modul Pengaturan & Profil Studio (`/api/v1/admin/settings`)

### 6.1 Uji Koneksi Server Email SMTP
- **Method / Endpoint**: `POST /admin/settings/email/test-connection`
- **Request Body**:
  ```json
  {
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpSecure": false,
    "smtpUser": "studio.kayastory@gmail.com",
    "smtpPassword": "app-password-rahasia",
    "targetEmail": "owner@kayastory.com"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Koneksi SMTP berhasil dan email uji coba telah terkirim."
  }
  ```
