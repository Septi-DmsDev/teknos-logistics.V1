# Implementation Notes ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â 2026-06-18

## Migratable from `teknos.id`

- JNE form-urlencoded request style for tariff, `generatecnote`, and tracking.
- JNE field mapping concepts: `OLSHOP_BRANCH`, `OLSHOP_CUST`, `OLSHOP_ORDERID`, `OLSHOP_ORIG`, `OLSHOP_DEST`, `OLSHOP_SERVICE`, COD fields, and shipper env values.
- Existing logistics provider abstraction concept.

## Rewritten for standalone service

- Merchant API key auth replaces storefront session/admin assumptions.
- Shipment lifecycle persists in `Shipment` and `ShipmentTracking` instead of `Order` fields.
- Webhook relay is queued in `WebhookRelayAttempt` so merchant notifications are decoupled from courier ingress.
- Request validation uses API DTOs independent from `teknos.id` checkout models.

## Relevant JNE endpoints

- `POST /pricedev` for tariff/rates.
- `POST /generatecnote` for AWB creation.
- `POST /list/v1/cnote/:awb` for tracking.

## Required env

See `.env.example`. All JNE credential values must stay server-only and must not be committed.

## Open JNE questions

- Exact production webhook payload shape and status codes must be confirmed from JNE before broad status mapping is finalized.
- Exact webhook auth header from JNE must be confirmed; MVP accepts `x-jne-token` or `x-webhook-token`.
- Tracking can return Not Found until package is physically scanned by JNE.


## Database Migration Log

- 2026-06-18: Created additive Prisma migration `20260618103000_add_admin_config_models` for Sprint 7 admin config foundations (`Store`, `Origin`, `CourierService`, `MerchantCourierService`, `CourierServiceStatus`). Not applied to production or Supabase in this task; validate/deploy separately with Prisma migration tooling.
- 2026-06-18: Applied Prisma migration `20260618021957_init` to Supabase Postgres via local SSH tunnel `localhost:5433 -> 10.0.8.6:5432`. No credentials are documented here; use local `.env.local` only. Validation: `npx prisma migrate status` reported database schema up to date and `npm run build` passed.


## Seed and API Key Log

- 2026-06-18: Seeded internal merchant `teknos` (Teknos Internal) into Supabase Postgres via local SSH tunnel.
- 2026-06-18: Generated one local merchant API key with prefix `tlg_live_UWYl-3l`; plaintext was stored only in ignored `.env.local` as `TEKNOS_INTERNAL_API_KEY` and was not documented or committed.
- 2026-06-18: Validated in-process API calls against DB: `POST /v1/rates` returned HTTP 200 with mock rates, and `POST /v1/shipments` returned HTTP 201 with status `BOOKED`.


## Core Merchant API Log

- 2026-06-18: Hardened `POST /v1/shipments` with idempotency on `merchantId + externalOrderId`. Repeated booking requests return HTTP 200 with `idempotent: true` and the same shipment id.
- 2026-06-18: API responses now use explicit shipment/tracking DTOs and do not expose recipient PII or raw Prisma entities.
- 2026-06-18: Added `npm run smoke:api` for local/staging API smoke validation using ignored `TEKNOS_INTERNAL_API_KEY`. Smoke result: rates HTTP 200, booking HTTP 201, duplicate booking HTTP 200 idempotent, tracking HTTP 200.


## JNE Adapter Hardening Log

- 2026-06-18: Hardened JNE client with explicit configuration guard, request timeout, HTTP error mapping, and redacted operational logging.
- 2026-06-18: Expanded JNE field mapping to better match the existing teknos.id adapter shape, including optional ADDR2/ZIP/city fields for booking payload parity.
- 2026-06-18: Added non-mutating tariff smoke script `npm run smoke:jne:rates -- --force-jne`; validated successfully after setting ignored local `JNE_SMOKE_DEST_CODE`.

## Sprint 3 JNE Adapter Validation ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-06-18

- Copied JNE server-only env values from parent `teknos.id` into ignored local `.env.local` for adapter validation without printing or committing secret values.
- `npm run smoke:jne:rates -- --force-jne` now calls the JNE adapter directly and only performs `POST /pricedev` tariff lookup; it does not call `generatecnote` and does not create a real resi.
- Tariff smoke passed against JNE with origin/destination env values and returned 7 rates; first service code observed was `JTR23`.
- API-level JNE smoke through `/v1/rates` still needs the local Supabase tunnel (`localhost:5433`) because merchant API-key auth uses Prisma; tunnel was not listening during this validation.
- Real JNE booking/AWB validation is intentionally deferred until the user explicitly approves creating a real resi.
## Sprint 4 Webhook Ingress Lifecycle ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-06-18

- Added migration `20260618064000_add_webhook_event_key` with nullable unique `WebhookEvent.eventKey` for courier webhook idempotency.
- JNE webhook route now validates token with timing-safe comparison and returns sanitized JSON errors for malformed payloads.
- Courier webhook service derives a SHA-256 event key from normalized courier/status/waybill/description, applies tracking idempotently, and only queues merchant relays for first-seen events.
- Shipment lifecycle updates are monotonic: older/lower-rank webhook states do not downgrade terminal or later statuses, while tracking history remains upserted by unique event fields.
- Added `npm run smoke:jne:webhook` for synthetic DB-backed webhook replay validation; it creates a fake local JNE shipment and does not call JNE or create a real resi.
- Migration `20260618064000_add_webhook_event_key` applied to Supabase through `localhost:5433` on 2026-06-18 after refreshing the ignored local `DATABASE_URL`. `npm run smoke:jne:webhook` passed: first webhook updated shipment to `DELIVERED`, replay returned `duplicate: true`, and tracking/event counts remained 1.
## Sprint 5 Merchant Webhook Relay â€” 2026-06-18

- Added migration `20260618072000_add_relay_attempt_unique` with idempotent unique index `WebhookRelayAttempt(eventId, endpointId)`; SQL uses `IF NOT EXISTS` because this Supabase database currently contains mixed parent `teknos.id` migration history.
- Added `WebhookRelayService` to process due `PENDING` relay attempts, POST HMAC-signed JSON payloads to active merchant endpoints, mark `SUCCESS` on 2xx, retry transient failures with exponential backoff, and mark permanent/final failures as `FAILED`.
- Relay signature header is `x-teknos-signature` using existing `signWebhook()` format (`sha256=...`); `x-teknos-event-id` carries the event id for merchant-side idempotency.
- Added `npm run webhooks:relay` worker command and `npm run smoke:webhook:relay` synthetic local receiver smoke.
- Applied the relay unique index through `localhost:5433` via Prisma client fallback after `prisma migrate` schema engine failed against the mixed migration-history database. Smoke passed: one due attempt processed, endpoint received one request, signature verified, attempt status `SUCCESS`, HTTP `204`.
## Sprint 7 Admin Config MVP — 2026-06-19

- Added `npm run smoke:admin-config` for DB-backed admin config smoke covering merchant, store, origin, courier service, assignment, shipment list, and relay list without calling JNE or creating AWB/resi.
- Smoke was not executed in this commit because the active Supabase tunnel reached Postgres but database auth failed with PostgreSQL code `28P01`; update local ignored `DATABASE_URL` before running migration/smoke.
