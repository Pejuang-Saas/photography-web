-- AlterTable
ALTER TABLE "whatsapp_templates" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT false;

-- The templates the studio started with are built in: they can be edited but not deleted.
UPDATE "whatsapp_templates" SET "is_system" = true, "category" = 'REMINDER' WHERE "code" = 'PENGINGAT_H1';
UPDATE "whatsapp_templates" SET "is_system" = true, "category" = 'FOLLOW_UP' WHERE "code" = 'SAPAAN_FOLLOW_UP';
UPDATE "whatsapp_templates" SET "is_system" = true WHERE "code" = 'KONFIRMASI_BOOKING';
