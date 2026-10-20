-- DropIndex
DROP INDEX "whatsapp_chats_category_id_idx";

-- DropIndex
DROP INDEX "whatsapp_chats_last_message_at_idx";

-- AlterTable
ALTER TABLE "whatsapp_chats" ADD COLUMN     "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "bookings_customer_phone_idx" ON "bookings"("customer_phone");

-- CreateIndex
CREATE INDEX "whatsapp_chats_last_activity_at_id_idx" ON "whatsapp_chats"("last_activity_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "whatsapp_chats_category_id_last_activity_at_id_idx" ON "whatsapp_chats"("category_id", "last_activity_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "whatsapp_chats_unread_count_idx" ON "whatsapp_chats"("unread_count");


-- Existing conversations: order by their last message, or by creation when they have none.
UPDATE "whatsapp_chats" SET "last_activity_at" = COALESCE("last_message_at", "created_at");
