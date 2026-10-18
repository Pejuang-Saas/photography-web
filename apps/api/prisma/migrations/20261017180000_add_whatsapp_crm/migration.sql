-- CreateTable
CREATE TABLE "crm_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'zinc',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_chats" (
    "id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "category_id" TEXT,
    "last_message_at" TIMESTAMP(3),
    "last_inbound_at" TIMESTAMP(3),
    "last_message_preview" TEXT,
    "last_message_from_me" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "waha_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "from_me" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "has_media" BOOLEAN NOT NULL DEFAULT false,
    "ack" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crm_categories_name_key" ON "crm_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_chats_chat_id_key" ON "whatsapp_chats"("chat_id");

-- CreateIndex
CREATE INDEX "whatsapp_chats_last_message_at_idx" ON "whatsapp_chats"("last_message_at");

-- CreateIndex
CREATE INDEX "whatsapp_chats_phone_idx" ON "whatsapp_chats"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_chats_category_id_idx" ON "whatsapp_chats"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_waha_id_key" ON "whatsapp_messages"("waha_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_chat_id_timestamp_idx" ON "whatsapp_messages"("chat_id", "timestamp");

-- AddForeignKey
ALTER TABLE "whatsapp_chats" ADD CONSTRAINT "whatsapp_chats_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "crm_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "whatsapp_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

