-- AlterTable
ALTER TABLE "whatsapp_chats" ADD COLUMN "unread_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "whatsapp_messages"
  ADD COLUMN "media_mime" TEXT,
  ADD COLUMN "media_filename" TEXT,
  ADD COLUMN "media_key" TEXT,
  ADD COLUMN "media_error" TEXT;

-- Names copied from WhatsApp can start with invisible direction marks, which broke initials and
-- searching. Strip them from what is already stored; new names are cleaned when they arrive.
UPDATE "whatsapp_chats"
SET "name" = NULLIF(btrim(regexp_replace("name", '[​-‏‪-‮⁠-⁯﻿­᠎]', '', 'g')), '')
WHERE "name" ~ '[​-‏‪-‮⁠-⁯﻿­᠎]';
