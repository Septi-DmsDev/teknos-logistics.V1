-- Ensure queueing merchant relays is idempotent per webhook event and endpoint.
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookRelayAttempt_eventId_endpointId_key" ON "WebhookRelayAttempt"("eventId", "endpointId");
