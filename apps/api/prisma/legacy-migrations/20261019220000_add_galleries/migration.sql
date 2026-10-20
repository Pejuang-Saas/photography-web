-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateTable
CREATE TABLE "galleries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "public_token" TEXT NOT NULL,
    "drive_folder_id" TEXT NOT NULL,
    "drive_source_type" TEXT NOT NULL DEFAULT 'google_drive_public',
    "status" "GalleryStatus" NOT NULL DEFAULT 'DRAFT',
    "description" TEXT,
    "max_selections" INTEGER,
    "booking_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_photos" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "drive_file_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT,
    "thumbnail_url" TEXT,
    "view_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selections" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "status" "SelectionStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "selection_items" (
    "id" TEXT NOT NULL,
    "selection_id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "selection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "total_files" INTEGER,
    "synced_files" INTEGER NOT NULL DEFAULT 0,
    "new_files" INTEGER NOT NULL DEFAULT 0,
    "removed_files" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "warning_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "galleries_slug_key" ON "galleries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "galleries_public_token_key" ON "galleries"("public_token");

-- CreateIndex
CREATE INDEX "galleries_status_created_at_idx" ON "galleries"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "galleries_booking_id_idx" ON "galleries"("booking_id");

-- CreateIndex
CREATE INDEX "gallery_photos_gallery_id_is_active_sort_order_idx" ON "gallery_photos"("gallery_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_photos_gallery_id_drive_file_id_key" ON "gallery_photos"("gallery_id", "drive_file_id");

-- CreateIndex
CREATE UNIQUE INDEX "selections_session_token_key" ON "selections"("session_token");

-- CreateIndex
CREATE INDEX "selections_gallery_id_status_idx" ON "selections"("gallery_id", "status");

-- CreateIndex
CREATE INDEX "selection_items_photo_id_idx" ON "selection_items"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "selection_items_selection_id_photo_id_key" ON "selection_items"("selection_id", "photo_id");

-- CreateIndex
CREATE INDEX "sync_jobs_gallery_id_status_idx" ON "sync_jobs"("gallery_id", "status");

-- CreateIndex
CREATE INDEX "sync_jobs_gallery_id_created_at_idx" ON "sync_jobs"("gallery_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photos" ADD CONSTRAINT "gallery_photos_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selections" ADD CONSTRAINT "selections_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selection_items" ADD CONSTRAINT "selection_items_selection_id_fkey" FOREIGN KEY ("selection_id") REFERENCES "selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "selection_items" ADD CONSTRAINT "selection_items_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

