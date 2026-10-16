-- AlterTable
ALTER TABLE "studio_settings" ADD COLUMN "city" TEXT,
ADD COLUMN "region" TEXT;

-- CreateTable
CREATE TABLE "landing_content" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_content_pkey" PRIMARY KEY ("id")
);
