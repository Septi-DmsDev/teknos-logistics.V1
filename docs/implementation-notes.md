# Implementation Notes — 2026-06-18

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

- 2026-06-18: Applied Prisma migration `20260618021957_init` to Supabase Postgres via local SSH tunnel `localhost:5433 -> 10.0.8.6:5432`. No credentials are documented here; use local `.env.local` only. Validation: `npx prisma migrate status` reported database schema up to date and `npm run build` passed.


## Seed and API Key Log

- 2026-06-18: Seeded internal merchant `teknos` (Teknos Internal) into Supabase Postgres via local SSH tunnel.
- 2026-06-18: Generated one local merchant API key with prefix `tlg_live_UWYl-3l`; plaintext was stored only in ignored `.env.local` as `TEKNOS_INTERNAL_API_KEY` and was not documented or committed.
- 2026-06-18: Validated in-process API calls against DB: `POST /v1/rates` returned HTTP 200 with mock rates, and `POST /v1/shipments` returned HTTP 201 with status `BOOKED`.
