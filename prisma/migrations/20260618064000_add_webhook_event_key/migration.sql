-- Add nullable idempotency key for courier webhook events.
-- PostgreSQL unique indexes allow multiple NULL values, so existing non-idempotent events remain valid.
ALTER TABLE "WebhookEvent" ADD COLUMN "eventKey" TEXT;

CREATE UNIQUE INDEX "WebhookEvent_eventKey_key" ON "WebhookEvent"("eventKey");
