-- Package attributes from the price list, kept as numbers
ALTER TABLE "service_packages"
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "edited_photos" INTEGER,
  ADD COLUMN "drive_active_days" INTEGER,
  ADD COLUMN "upload_all_hours" INTEGER,
  ADD COLUMN "upload_edit_days" INTEGER,
  ADD COLUMN "max_spots" INTEGER,
  ADD COLUMN "bonus_priority_edits" INTEGER,
  ADD COLUMN "late_tolerance_minutes" INTEGER,
  ADD COLUMN "terms" JSONB;

-- Add-ons customers pick at checkout
CREATE TABLE "add_ons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "unit_label" TEXT NOT NULL DEFAULT 'unit',
    "price" INTEGER NOT NULL,
    "extra_minutes" INTEGER NOT NULL DEFAULT 0,
    "max_quantity" INTEGER NOT NULL DEFAULT 10,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "add_ons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "add_ons_slug_key" ON "add_ons"("slug");
CREATE INDEX "add_ons_is_active_sort_order_idx" ON "add_ons"("is_active", "sort_order");

-- What each booking added, copied at the time of booking
CREATE TABLE "booking_add_ons" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "add_on_id" TEXT,
    "name" TEXT NOT NULL,
    "unit_label" TEXT NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "extra_minutes" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_add_ons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "booking_add_ons_booking_id_idx" ON "booking_add_ons"("booking_id");

ALTER TABLE "booking_add_ons" ADD CONSTRAINT "booking_add_ons_booking_id_fkey"
  FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_add_ons" ADD CONSTRAINT "booking_add_ons_add_on_id_fkey"
  FOREIGN KEY ("add_on_id") REFERENCES "add_ons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bookings" ADD COLUMN "extra_minutes" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "studio_settings" ADD COLUMN "reservation_terms" JSONB;
