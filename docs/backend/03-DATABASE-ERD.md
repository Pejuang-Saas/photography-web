# 🗄️ Spesifikasi Database & Entity Relationship Diagram (ERD)
## Photography Platform Monorepo (Kaya Story Semarang)

- **Database Engine**: PostgreSQL 17 Alpine (`dev-postgres` di `dev-network`)
- **Database Name**: `photography_db`
- **ORM / Client**: Prisma ORM 6.x (`@prisma/client`)
- **Penamaan Standar**: `snake_case` untuk kolom & tabel PostgreSQL, `camelCase` untuk Prisma Model properties.

---

## 1. Visual Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    users ||--o{ bookings : "assigned_photographer"
    users ||--o{ blackout_dates : "created_by"
    
    packages ||--o{ bookings : "selected_package"
    packages ||--o{ package_addons : "available_addons"
    addons ||--o{ package_addons : "attached_to"
    
    bookings ||--o{ booking_addons : "purchased_addons"
    bookings ||--o| invoices : "has_one_official"
    bookings ||--o{ admin_notifications : "triggers"
    bookings ||--o{ crm_chats : "linked_contact"

    crm_chats ||--o{ crm_messages : "chat_history"
    crm_chats }o--o{ crm_tags : "categorized_with"

    studio_settings ||--o{ message_templates : "uses"
    studio_settings ||--o{ email_templates : "uses"

    users {
        uuid id PK
        string email UK
        string password_hash
        string name
        enum role "ADMIN, PHOTOGRAPHER, STAFF"
        string avatar_url
        timestamp created_at
        timestamp updated_at
    }

    packages {
        uuid id PK
        string name
        string slug UK
        enum category "Solo, Squad, Family, Cinematic"
        int price
        int duration_minutes
        int max_people
        int edited_photos
        boolean all_raw_included
        boolean is_active
        int total_bookings
        timestamp created_at
        timestamp updated_at
    }

    addons {
        uuid id PK
        string name
        int price
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    package_addons {
        uuid id PK
        uuid package_id FK
        uuid addon_id FK
    }

    bookings {
        uuid id PK
        string booking_code UK "KYA-YYYY-XXX"
        string customer_name
        string customer_phone
        string customer_email
        string university
        string faculty
        uuid package_id FK
        string package_name
        int package_price
        int total_price
        date session_date
        string time_slot "09:00 - 10:00"
        string location "Studio Tembalang / Outdoor"
        uuid photographer_id FK
        string photographer_name
        enum status "PENDING_VERIFICATION, CONFIRMED, COMPLETED, CANCELLED"
        enum payment_status "UNPAID, WAITING_CONFIRMATION, PAID_DP, PAID_FULL, REJECTED"
        string payment_proof_url
        int payment_amount
        string payment_bank
        timestamp payment_date
        string invoice_number
        text notes
        timestamp created_at
        timestamp updated_at
    }

    booking_addons {
        uuid id PK
        uuid booking_id FK
        uuid addon_id FK
        string name
        int price
        timestamp created_at
    }

    invoices {
        uuid id PK
        string invoice_number UK "INV-KYA-YYYY-XXX"
        uuid booking_id FK
        int subtotal
        int discount
        int total_amount
        int paid_amount
        int balance_due
        enum status "PAID_FULL, PAID_DP, OVERDUE"
        date issue_date
        date due_date
        string pdf_url
        timestamp whatsapp_sent_at
        timestamp email_sent_at
        timestamp created_at
        timestamp updated_at
    }

    blackout_dates {
        uuid id PK
        date date
        string reason
        time start_time
        time end_time
        boolean is_full_day
        uuid created_by FK
        timestamp created_at
        timestamp updated_at
    }

    crm_chats {
        uuid id PK
        string phone_number UK "6281234567890"
        string contact_name
        uuid booking_id FK
        text last_message_content
        timestamp last_message_at
        timestamp last_customer_message_at "Anti-ban marker"
        boolean is_window_locked
        string active_tag "Prospek Baru, Menunggu Transfer, dll"
        timestamp created_at
        timestamp updated_at
    }

    crm_messages {
        uuid id PK
        uuid chat_id FK
        string waha_message_id UK
        enum sender_type "CUSTOMER, ADMIN, SYSTEM"
        text content
        string media_url
        string media_type
        enum status "SENT, DELIVERED, READ, FAILED"
        timestamp timestamp
    }

    crm_tags {
        uuid id PK
        string name UK
        string color_hex
        string description
        timestamp created_at
    }

    message_templates {
        uuid id PK
        string code UK "BOOKING_CREATED, PAYMENT_CONFIRMED, dll"
        string name
        text content
        jsonb variables
        boolean is_system
        timestamp created_at
        timestamp updated_at
    }

    email_templates {
        uuid id PK
        string code UK
        string name
        string subject
        text html_content
        jsonb variables
        boolean is_system
        timestamp created_at
        timestamp updated_at
    }

    studio_settings {
        uuid id PK
        string studio_name
        string tagline
        text address
        string maps_url
        string whatsapp_number
        string instagram_handle
        string bca_account_number
        string bca_account_name
        string mandiri_account_number
        string mandiri_account_name
        string qris_image_url
        boolean is_gateway_active
        boolean is_manual_active
        string smtp_host
        int smtp_port
        boolean smtp_secure
        string smtp_user
        string smtp_password
        string smtp_from_name
        string smtp_from_email
        timestamp updated_at
    }

    admin_notifications {
        uuid id PK
        string title
        text message
        enum type "BOOKING_NEW, PAYMENT_PROOF, RESCHEDULE, SYSTEM"
        boolean read
        uuid booking_id FK
        timestamp created_at
    }
```

---

## 2. Strategi Indexing & Optimasi Query (PostgreSQL Performance)

Untuk memastikan respons API di bawah 100ms dan mencegah lock persaingan saat ribuan calon wisudawan berebut jadwal:

1. **Composite Unique Index Anti Double-Booking**:
   ```sql
   CREATE UNIQUE INDEX idx_unique_booking_slot 
   ON bookings (session_date, time_slot, location) 
   WHERE status IN ('CONFIRMED', 'PENDING_VERIFICATION');
   ```
   *Mencegah secara fisik level database adanya 2 booking aktif pada jam, tanggal, dan lokasi studio yang sama.*

2. **Index Pencarian & Filter Cepat (High Cardinality)**:
   - `bookings(booking_code)`: Pencarian cepat status reservasi pelanggan.
   - `bookings(customer_phone)`: Sinkronisasi nomor WhatsApp dengan histori CRM.
   - `bookings(session_date, status)`: Render jadwal kalender harian/mingguan admin.
   - `invoices(invoice_number)`: Akses langsung halaman cetak dan verifikasi faktur.
   - `crm_chats(last_customer_message_at)`: Query batch penghitungan status kunci jendela 24 jam.

---

## 3. Representasi Prisma Schema Produksi (`schema.prisma`)

Berikut rancangan skema Prisma lengkap yang disiapkan untuk tahap implementasi di `apps/api/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  PHOTOGRAPHER
  STAFF
}

enum PackageCategory {
  Solo
  Squad
  Family
  Cinematic
}

enum BookingStatus {
  PENDING_VERIFICATION
  CONFIRMED
  COMPLETED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  WAITING_CONFIRMATION
  PAID_DP
  PAID_FULL
  REJECTED
}

enum NotificationType {
  BOOKING_NEW
  PAYMENT_PROOF
  RESCHEDULE
  SYSTEM
}

enum SenderType {
  CUSTOMER
  ADMIN
  SYSTEM
}

enum MessageStatus {
  SENT
  DELIVERED
  READ
  FAILED
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  role         Role     @default(STAFF)
  avatarUrl    String?  @map("avatar_url")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  assignedBookings Booking[]      @relation("AssignedPhotographer")
  blackoutDates    BlackoutDate[]

  @@map("users")
}

model Package {
  id             String          @id @default(uuid())
  name           String
  slug           String          @unique
  category       PackageCategory
  price          Int
  durationMinutes Int            @map("duration_minutes")
  maxPeople      Int             @map("max_people")
  editedPhotos   Int             @map("edited_photos")
  allRawIncluded Boolean         @default(true) @map("all_raw_included")
  isActive       Boolean         @default(true) @map("is_active")
  totalBookings  Int             @default(0) @map("total_bookings")
  createdAt      DateTime        @default(now()) @map("created_at")
  updatedAt      DateTime        @updatedAt @map("updated_at")

  bookings      Booking[]
  packageAddons PackageAddon[]

  @@map("packages")
}

model Addon {
  id        String   @id @default(uuid())
  name      String
  price     Int
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  packageAddons PackageAddon[]
  bookingAddons BookingAddon[]

  @@map("addons")
}

model PackageAddon {
  id        String  @id @default(uuid())
  packageId String  @map("package_id")
  addonId   String  @map("addon_id")
  package   Package @relation(fields: [packageId], references: [id], onDelete: Cascade)
  addon     Addon   @relation(fields: [addonId], references: [id], onDelete: Cascade)

  @@unique([packageId, addonId])
  @@map("package_addons")
}

model Booking {
  id              String        @id @default(uuid())
  bookingCode     String        @unique @map("booking_code")
  customerName    String        @map("customer_name")
  customerPhone   String        @map("customer_phone")
  customerEmail   String        @map("customer_email")
  university      String
  faculty         String?
  packageId       String        @map("package_id")
  packageName     String        @map("package_name")
  packagePrice    Int           @map("package_price")
  totalPrice      Int           @map("total_price")
  sessionDate     DateTime      @map("session_date") @db.Date
  timeSlot        String        @map("time_slot")
  location        String
  photographerId  String?       @map("photographer_id")
  photographerName String?      @map("photographer_name")
  status          BookingStatus @default(PENDING_VERIFICATION)
  paymentStatus   PaymentStatus @default(UNPAID) @map("payment_status")
  paymentProofUrl String?       @map("payment_proof_url")
  paymentAmount   Int?          @map("payment_amount")
  paymentBank     String?       @map("payment_bank")
  paymentDate     DateTime?     @map("payment_date")
  invoiceNumber   String?       @map("invoice_number")
  notes           String?
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  package       Package             @relation(fields: [packageId], references: [id])
  photographer  User?               @relation("AssignedPhotographer", fields: [photographerId], references: [id])
  addons        BookingAddon[]
  invoice       Invoice?
  notifications AdminNotification[]
  crmChats      CrmChat[]

  @@index([sessionDate, status])
  @@index([customerPhone])
  @@map("bookings")
}

model BookingAddon {
  id        String   @id @default(uuid())
  bookingId String   @map("booking_id")
  addonId   String   @map("addon_id")
  name      String
  price     Int
  createdAt DateTime @default(now()) @map("created_at")

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  addon   Addon   @relation(fields: [addonId], references: [id])

  @@map("booking_addons")
}

model Invoice {
  id             String    @id @default(uuid())
  invoiceNumber  String    @unique @map("invoice_number")
  bookingId      String    @unique @map("booking_id")
  subtotal       Int
  discount       Int       @default(0)
  totalAmount    Int       @map("total_amount")
  paidAmount     Int       @map("paid_amount")
  balanceDue     Int       @map("balance_due")
  status         String    @default("PAID_FULL")
  issueDate      DateTime  @default(now()) @map("issue_date") @db.Date
  dueDate        DateTime? @map("due_date") @db.Date
  pdfUrl         String?   @map("pdf_url")
  whatsappSentAt DateTime? @map("whatsapp_sent_at")
  emailSentAt    DateTime? @map("email_sent_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  booking Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)

  @@map("invoices")
}

model BlackoutDate {
  id         String   @id @default(uuid())
  date       DateTime @db.Date
  reason     String
  startTime  String?  @map("start_time")
  endTime    String?  @map("end_time")
  isFullDay  Boolean  @default(true) @map("is_full_day")
  createdBy  String   @map("created_by")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  author User @relation(fields: [createdBy], references: [id])

  @@map("blackout_dates")
}

model CrmChat {
  id                     String    @id @default(uuid())
  phoneNumber            String    @unique @map("phone_number")
  contactName            String?   @map("contact_name")
  bookingId              String?   @map("booking_id")
  lastMessageContent     String?   @map("last_message_content")
  lastMessageAt          DateTime? @map("last_message_at")
  lastCustomerMessageAt  DateTime? @map("last_customer_message_at")
  isWindowLocked         Boolean   @default(false) @map("is_window_locked")
  activeTag              String?   @default("Prospek Baru") @map("active_tag")
  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")

  booking  Booking?     @relation(fields: [bookingId], references: [id])
  messages CrmMessage[]

  @@map("crm_chats")
}

model CrmMessage {
  id             String        @id @default(uuid())
  chatId         String        @map("chat_id")
  wahaMessageId  String?       @unique @map("waha_message_id")
  senderType     SenderType    @map("sender_type")
  content        String
  mediaUrl       String?       @map("media_url")
  mediaType      String?       @map("media_type")
  status         MessageStatus @default(SENT)
  timestamp      DateTime      @default(now())

  chat CrmChat @relation(fields: [chatId], references: [id], onDelete: Cascade)

  @@map("crm_messages")
}

model MessageTemplate {
  id        String   @id @default(uuid())
  code      String   @unique
  name      String
  content   String
  variables Json     @default("[]")
  isSystem  Boolean  @default(false) @map("is_system")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("message_templates")
}

model EmailTemplate {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  subject     String
  htmlContent String   @map("html_content")
  variables   Json     @default("[]")
  isSystem    Boolean  @default(false) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("email_templates")
}

model StudioSetting {
  id                    String   @id @default("default-studio")
  studioName            String   @default("Kaya Story Photography") @map("studio_name")
  tagline               String   @default("Semarang graduation & portrait studio")
  address               String   @default("Jl. Banjarsari No. 48, Tembalang, Semarang")
  mapsUrl               String?  @map("maps_url")
  whatsappNumber        String   @default("6281234567890") @map("whatsapp_number")
  instagramHandle       String   @default("@kayastory.id") @map("instagram_handle")
  bcaAccountNumber      String?  @map("bca_account_number")
  bcaAccountName        String?  @map("bca_account_name")
  mandiriAccountNumber  String?  @map("mandiri_account_number")
  mandiriAccountName    String?  @map("mandiri_account_name")
  qrisImageUrl          String?  @map("qris_image_url")
  isGatewayActive       Boolean  @default(false) @map("is_gateway_active")
  isManualActive        Boolean  @default(true) @map("is_manual_active")
  smtpHost              String?  @map("smtp_host")
  smtpPort              Int?     @default(587) @map("smtp_port")
  smtpSecure            Boolean  @default(false) @map("smtp_secure")
  smtpUser              String?  @map("smtp_user")
  smtpPassword          String?  @map("smtp_password")
  smtpFromName          String?  @map("smtp_from_name")
  smtpFromEmail         String?  @map("smtp_from_email")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("studio_settings")
}

model AdminNotification {
  id        String           @id @default(uuid())
  title     String
  message   String
  type      NotificationType @default(SYSTEM)
  read      Boolean          @default(false)
  bookingId String?          @map("booking_id")
  createdAt DateTime         @default(now()) @map("created_at")

  booking Booking? @relation(fields: [bookingId], references: [id])

  @@map("admin_notifications")
}
```
