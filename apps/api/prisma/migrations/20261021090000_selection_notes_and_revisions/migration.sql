-- AlterTable
ALTER TABLE "selection_items" ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "photo_revisions" (
    "id" TEXT NOT NULL,
    "selection_id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "photo_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_revisions_photo_id_idx" ON "photo_revisions"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "photo_revisions_selection_id_photo_id_key" ON "photo_revisions"("selection_id", "photo_id");

-- AddForeignKey
ALTER TABLE "photo_revisions" ADD CONSTRAINT "photo_revisions_selection_id_fkey" FOREIGN KEY ("selection_id") REFERENCES "selections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_revisions" ADD CONSTRAINT "photo_revisions_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "gallery_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
