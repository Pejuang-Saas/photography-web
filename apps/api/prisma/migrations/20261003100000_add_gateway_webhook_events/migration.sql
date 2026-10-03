-- CreateEnum
CREATE TYPE "GatewayWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "gateway_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" "GatewayProvider" NOT NULL,
    "event_key" TEXT NOT NULL,
    "transaction_id" TEXT,
    "order_id" TEXT,
    "status" "GatewayWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    CONSTRAINT "gateway_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gateway_webhook_events_event_key_key" ON "gateway_webhook_events"("event_key");
CREATE INDEX "gateway_webhook_events_provider_transaction_id_idx" ON "gateway_webhook_events"("provider", "transaction_id");
CREATE INDEX "gateway_webhook_events_provider_order_id_idx" ON "gateway_webhook_events"("provider", "order_id");
CREATE INDEX "gateway_webhook_events_status_received_at_idx" ON "gateway_webhook_events"("status", "received_at");
