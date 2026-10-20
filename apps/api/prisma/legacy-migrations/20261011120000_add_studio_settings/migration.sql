-- CreateTable
CREATE TABLE "studio_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "studio_name" TEXT NOT NULL DEFAULT 'Kayastory Photography',
    "whatsapp_number" TEXT,
    "address" TEXT,
    "maps_url" TEXT,
    "instagram_handle" TEXT,
    "guarantees" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_settings_pkey" PRIMARY KEY ("id")
);
