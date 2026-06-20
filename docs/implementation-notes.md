# Implementation Notes ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â 2026-06-18

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

- 2026-06-19: Applied additive Prisma migration `20260618103000_add_admin_config_models` to Supabase Postgres through local SSH tunnel `localhost:5433 -> 10.0.8.12:5432`; `npx prisma migrate status` reported database schema up to date.
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

## Sprint 3 JNE Adapter Validation ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â 2026-06-18

- Copied JNE server-only env values from parent `teknos.id` into ignored local `.env.local` for adapter validation without printing or committing secret values.
- `npm run smoke:jne:rates -- --force-jne` now calls the JNE adapter directly and only performs `POST /pricedev` tariff lookup; it does not call `generatecnote` and does not create a real resi.
- Tariff smoke passed against JNE with origin/destination env values and returned 7 rates; first service code observed was `JTR23`.
- API-level JNE smoke through `/v1/rates` still needs the local Supabase tunnel (`localhost:5433`) because merchant API-key auth uses Prisma; tunnel was not listening during this validation.
- Real JNE booking/AWB validation is intentionally deferred until the user explicitly approves creating a real resi.
## Sprint 4 Webhook Ingress Lifecycle ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â 2026-06-18

- Added migration `20260618064000_add_webhook_event_key` with nullable unique `WebhookEvent.eventKey` for courier webhook idempotency.
- JNE webhook route now validates token with timing-safe comparison and returns sanitized JSON errors for malformed payloads.
- Courier webhook service derives a SHA-256 event key from normalized courier/status/waybill/description, applies tracking idempotently, and only queues merchant relays for first-seen events.
- Shipment lifecycle updates are monotonic: older/lower-rank webhook states do not downgrade terminal or later statuses, while tracking history remains upserted by unique event fields.
- Added `npm run smoke:jne:webhook` for synthetic DB-backed webhook replay validation; it creates a fake local JNE shipment and does not call JNE or create a real resi.
- Migration `20260618064000_add_webhook_event_key` applied to Supabase through `localhost:5433` on 2026-06-18 after refreshing the ignored local `DATABASE_URL`. `npm run smoke:jne:webhook` passed: first webhook updated shipment to `DELIVERED`, replay returned `duplicate: true`, and tracking/event counts remained 1.
## Sprint 5 Merchant Webhook Relay ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â 2026-06-18

- Added migration `20260618072000_add_relay_attempt_unique` with idempotent unique index `WebhookRelayAttempt(eventId, endpointId)`; SQL uses `IF NOT EXISTS` because this Supabase database currently contains mixed parent `teknos.id` migration history.
- Added `WebhookRelayService` to process due `PENDING` relay attempts, POST HMAC-signed JSON payloads to active merchant endpoints, mark `SUCCESS` on 2xx, retry transient failures with exponential backoff, and mark permanent/final failures as `FAILED`.
- Relay signature header is `x-teknos-signature` using existing `signWebhook()` format (`sha256=...`); `x-teknos-event-id` carries the event id for merchant-side idempotency.
- Added `npm run webhooks:relay` worker command and `npm run smoke:webhook:relay` synthetic local receiver smoke.
- Applied the relay unique index through `localhost:5433` via Prisma client fallback after `prisma migrate` schema engine failed against the mixed migration-history database. Smoke passed: one due attempt processed, endpoint received one request, signature verified, attempt status `SUCCESS`, HTTP `204`.
## Sprint 7 Admin Config MVP Ã¢â‚¬â€ 2026-06-19

- Added `npm run smoke:admin-config` for DB-backed admin config smoke covering merchant, store, origin, courier service, assignment, shipment list, and relay list without calling JNE or creating AWB/resi.
- Initial smoke was blocked by a stale tunnel/credential mismatch (`28P01`). On 2026-06-19 the stale tunnel was closed, `localhost:5433` pointed to `10.0.8.12:5432`, migration `20260618103000_add_admin_config_models` was applied with `npx prisma migrate deploy`, and full validation passed: `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run smoke:admin-config`.

## Sprint 8 Reliability/Security Prep - 2026-06-19

- Next implementation stream should harden the admin platform before UI expansion: rate limiting, mutation audit logs, health/readiness checks, security scan scripts, and deploy runbook updates.
- Parent `teknos.id` remains read-only; consume the simplified merchant API/webhook contract instead of moving logistics operations back into the storefront.

## Sprint 8 Slice 1 - 2026-06-19

- Added `GET /ready` to verify database connectivity separately from lightweight `GET /health`.
- Added in-memory rate limiting for `/admin/*`, `/v1/*`, and `/webhooks/*`; configure with `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_PUBLIC_MAX`, and `RATE_LIMIT_ADMIN_MAX`. Set max to `0` only when rate limiting must be disabled for controlled local testing.
- Added sanitized admin mutation audit logs for POST/PUT/PATCH/DELETE admin requests without logging request bodies, tokens, API keys, or secrets.

## Sprint 8 Slice 2 - 2026-06-19

- Added additive migration `20260619093000_add_admin_audit_logs` for persistent admin mutation audit metadata.
- Admin audit persistence records method, path, status, duration, request id, IP, user agent, and timestamp only; request bodies, tokens, API keys, and secrets are intentionally not stored.
- Migration was applied to Supabase through `localhost:5433 -> 10.0.8.12:5432` with `npx prisma migrate deploy`; `npx prisma migrate status` reported schema up to date.

## Sprint 8 Completion - 2026-06-19

- Added `GET /admin/audit-logs` for authenticated admin audit visibility with pagination and filters for method, path, and status range.
- Added `npm run audit:cleanup` for dry-run-first audit retention cleanup and `npm run sprint8:readiness` for hardening readiness checks.
- Added `docs/SPRINT_8_HARDENING_RUNBOOK.md` as the operational deploy/security gate.
- Sprint 8 is complete; remaining scale follow-up is replacing in-memory rate limiting with Redis/shared storage when running multiple app instances.

## Sprint 9 Admin Control Center - 2026-06-20

- Added server-served Admin Control Center at `/admin-ui` with static HTML/CSS/JS from Hono; no new frontend framework was introduced.
- UI covers dashboard, merchant/API key/webhook endpoint management, store/origin management, courier service catalog and assignment, and read-only shipments/webhook relays/audit logs.
- Added `npm run smoke:admin-ui` and `npm run sprint9:readiness`; validation passed with lint, typecheck, build, smoke admin UI, and readiness checks.
- Sprint 9 has no migration and no JNE booking/resi/generatecnote action. Parent `teknos.id` remains read-only and should consume the simplified API/webhook contract.

## Sprint 10 Multi-Courier Foundation - 2026-06-20

- Added Sprint 10 spec/plan for JNT/SAP skeletons, capability metadata, normalizers, and service mapping foundation.
- JNT and SAP Express providers are registered as skeleton adapters; external rates/booking/tracking intentionally return `501 COURIER_NOT_IMPLEMENTED` until official API contracts and credentials are confirmed.
- Added authenticated read-only `GET /v1/couriers/capabilities` so merchants can inspect active vs skeleton courier capability metadata without exposing credentials.

## Parent Env Boundary Decision - 2026-06-20

- Final parent `teknos.id` integration should use only `LOGISTICS_API_URL`, `LOGISTICS_API_KEY`, `LOGISTICS_WEBHOOK_SECRET`, and `LOGISTICS_ENABLED`.
- Do not mirror Biteship envs such as origin area ID, origin postal code, or courier list in parent apps. Those are centralized in `teknos-logistics` Admin Control Center.
- Next product gap is destination/origin abstraction so parent can send store/destination data without owning raw JNE/JNT/SAP provider codes.

## Sprint 11 SAP Express — Sandbox Test Results (2026-06-20)

**Status: DIKONFIRMASI via sandbox live testing oleh Claude Code 2026-06-20.**
Codex TIDAK perlu riset API lagi — gunakan data ini langsung.

### Host & Auth

```
Sandbox:    https://apisanbox.coresyssap.com/
Production: https://api.coresyssap.com/
Production tracking (berbeda host): https://track.coresyssap.com/
```

**Auth header SETIAP request:**
```
api_key: <API_KEY>
Content-Type: application/json   ← WAJIB lowercase! docs salah tulis “Application/json”
```

**Dev Credentials (sandbox):**
```
api_key:              DEV_m4rK3tPlac3#_2019
customer_code NonCOD: DEV000   ← gunakan ini untuk e-commerce standard
customer_code COD:    DEV001   ← butuh field cod_amount tambahan
```

### District Code Format

Format: `{PROVINSI}{CITY_NUM}` untuk kota, `{PROVINSI}{CITY_NUM}{KEC_NUM}` untuk kecamatan.

Contoh terkonfirmasi:
```
JK00   = JAKARTA (kota level)
JK0702 = GROGOL PETAMBURAN (kecamatan Jakarta Barat)
JI16   = MOJOKERTO (kota)
JI1609 = MOJOANYAR, Mojokerto (kecamatan)
DEV    = DEVELOPMENT (sandbox test area)
```

Response `district` endpoint (terkonfirmasi):
```json
{
  “city_code”: “JI16”,
  “district_code”: “JI1609”,
  “district_name”: “MOJOANYAR”,
  “zone_code”: “ZCJI1601”,
  “provinsi_code”: “JI”,
  “city_name”: “MOJOKERTO”,
  “tlc_branch_code”: “MJK”,
  “provinsi_name”: “JAWA TIMUR”
}
```

Untuk rates & booking: gunakan `district_code` (bukan `city_code`).

### Endpoint: Coverage Area

```
GET /v2/master/district/get
Query (semua optional): provinsi_name, city_name, district_name, provinsi_code, city_code, district_code
```

### Endpoint: Shipment Cost (Rates) — DIKONFIRMASI

```
POST /v2/master/shipment_cost
Content-Type: application/json  ← lowercase wajib

Body:
{
  “origin”: “JK00”,           ← SAPX district_code
  “destination”: “JI16”,      ← SAPX district_code
  “weight”: 1,                ← integer kg (bukan gram!)
  “customer_code”: “DEV000”,
  “volumetric”: “10x10x10”    ← “LxWxH” dalam cm
}

Response HTTP 200 (success):
{
  “status”: “success”,
  “data”: {
    “origin”: “JK00”,
    “destination”: “JI16”,
    “coverage_cod”: true,
    “services”: [
      {
        “service_type_code”: “UDRREG”,
        “service_type_name”: “SATRIA REG”,
        “cost”: 24500,            ← per-kg price
        “total_cost”: 24500,      ← GUNAKAN INI untuk priceIdr
        “sla”: “3 - 5 Hari”,     ← atau “-” jika tidak ada SLA
        “minimum_kilo”: 1,
        “kilo_divider”: 6000,
        “insurance_cost”: 0,
        “insurance_admin_cost”: 0,
        “packing_cost”: 0,
        “volumetric_kg”: 0,
        “weight”: 1,
        “final_weight”: 1,
        “discount”: “0%”,
        “surcharge”: 0,
        “markup_percentage”: “0”
      }
    ]
  },
  “msg”: “”
}

Response HTTP 422 (validasi gagal):
{ “status”: “fail”, “data”: [], “msg”: “Bagian origin district code harus diisi.” }

Response HTTP 200 (route tidak tersedia):
{ “status”: “fail”, “data”: [], “msg”: “Harga tidak ditemukan” }
```

Services terkonfirmasi di sandbox:
- `UDRREG` → “SATRIA REG” (reguler)
- `DRGREG` → “SATRIA CARGO” (darat/cargo)
- `UDRONS` → “SATRIA ODS” (one day service)
- `UDRSDS` → “SATRIA SDS” (same day — dari PDF, belum test di sandbox)

### Endpoint: Create Order (Booking) — DIKONFIRMASI

```
POST /v2/shipment/pickup/create
Content-Type: application/json

Body (semua wajib kecuali disebutkan optional):
{
  “customer_code”: “DEV000”,
  “reference_no”: “TKN-1234567890”,  ← MAX 20 CHARS, hanya - dan _ boleh
  “service_type_code”: “UDRREG”,
  “pickup_place”: “1”,               ← “1”=pickup courier, “2”=drop off
  “koli”: “1”,                       ← jumlah paket (string angka)
  “weight”: 1,                       ← integer kg
  “volumetric”: “10x10x10”,          ← “LxWxH” cm
  “destination_district_code”: “JK00”,
  “pickup_name”: “Toko Teknos”,
  “pickup_address”: “Jl. Test 123”,
  “pickup_phone”: “081234567890”,
  “pickup_contact”: “Admin”,         ← WAJIB — tidak ada di spec awal
  “pickup_district_code”: “JI1606”,  ← kode origin
  “shipment_type_code”: “SHTPC”,
  “shipment_content_code”: “SHTPC”,
  “shipper_name”: “Teknos”,
  “shipper_address”: “Jl. Test 123”,
  “shipper_phone”: “081234567890”,
  “shipper_contact”: “Admin Teknos”,
  “receiver_name”: “Nama Penerima”,
  “receiver_address”: “Jl. Penerima 456”,
  “receiver_phone”: “085678901234”,
  “receiver_contact”: “Nama Penerima”
}

Response HTTP 200 (success):
{
  “status”: “success”,
  “data”: {
    “awb_no”: “DEV00845560349”,       ← INI waybillId untuk tracking
    “reference_no”: “TKN-1781919831”,
    “origin_branch_code”: “DEV”,
    “destination_branch_code”: “DEV”,
    “tlc_branch_code”: “DEV”,
    “label”: “https://...?awb_no=...&api_key=...”  ← jangan expose ke customer
  },
  “msg”: “Pickup transfer success”
}
```

**KRITIKAL — idempotency:** SAPX TIDAK idempotent. `reference_no` sama → AWB baru.
Teknos-logistics harus cegah duplikat via `merchantId + externalOrderId` unique constraint.

**COD:** Gunakan `customer_code: “DEV001”` dan tambah field `cod_amount: 150000`.

### Endpoint: Tracking — DIKONFIRMASI

```
GET /v2/shipment/tracking?awb_no=<AWB>
  atau
GET /v2/shipment/tracking?reference_no=<REF>

Response (AWB ada, belum ada events):
{ “status”: “success”, “msg”: “Tidak ada status”, “data”: [] }

Response (AWB tidak ditemukan — HTTP 404):
{ “status”: “fail”, “msg”: “Airwaybill tidak ditemukan” }

Response (AWB ada, ada events):
{
  “status”: “success”,
  “msg”: “”,
  “data”: [
    {
      “awb_no”: “DEV00845560349”,
      “reference_no”: “TKN-123”,
      “service_type_code”: “UDRREG”,
      “origin”: “DEVELOPMENT - District”,  ← human readable, bukan kode
      “destination”: “JAKARTA”,
      “rowstate_name”: “ENTRI (PENDING PICKUP)”,  ← GUNAKAN INI untuk status
      “rowstate_web”: “Proses Pick Up Ditunda”,
      “description”: “[KURIR: ] [ALAMAT PICKUP: ...] [KETERANGAN: ...]”,
      “create_date”: “2022-02-09 10:38:45”,
      “origin_code”: “DEV”,
      “destination_code”: “JK00”,
      “lead_time_status”: “late”,
      ...
    }
  ]
}
```

**Status terbaru = elemen TERAKHIR di array.**

### Status Mapping rowstate_name → ShipmentStatus

```typescript
const STATUS_MAP: Record<string, ShipmentStatus> = {
  'ENTRI (SEDANG DI PICKUP)':    'BOOKED',
  'ENTRI (PENDING PICKUP)':      'BOOKED',
  'ENTRI (SEDANG PICKUP ULANG)': 'BOOKED',
  'ENTRI VERIFIED':              'BOOKED',
  'PICKED UP':                   'PICKED_UP',
  'VOID':                        'CANCELLED',
  'VOID_PICKUP':                 'CANCELLED',
  'MANIFEST OUTGOING':           'IN_TRANSIT',
  'OUTGOING SMU':                'IN_TRANSIT',
  'INCOMING':                    'IN_TRANSIT',
  'DELIVERY':                    'OUT_FOR_DELIVERY',
  'POD - DELIVERED':             'DELIVERED',
  'POD - UNDELIVERED':           'FAILED',
  'OUTGOING RETURN':             'RETURNED',
  'INCOMING RETURN':             'RETURNED',
  'DELIVERY RETURN':             'RETURNED',
  'SHIPMENT RETURN TO CLIENT':   'RETURNED',
}
// Fallback untuk unknown: 'IN_TRANSIT'
```

### TypeScript Types (Dikonfirmasi)

```typescript
// sap-express.types.ts

export interface SapDistrictItem {
  city_code: string
  district_code: string
  district_name: string
  zone_code: string
  provinsi_code: string
  city_name: string
  tlc_branch_code: string
  provinsi_name: string
}

export interface SapRateService {
  service_type_code: string    // “UDRREG”, “DRGREG”, “UDRONS”, “UDRSDS”
  service_type_name: string    // “SATRIA REG”, “SATRIA CARGO”, dst
  cost: number                 // per-kg price
  total_cost: number           // GUNAKAN INI — final price
  sla: string                  // “3 - 5 Hari” atau “-”
  minimum_kilo: number
  kilo_divider: number
  insurance_cost: number
  insurance_admin_cost: number
  packing_cost: number | string
  volumetric_kg: number
  weight: number
  final_weight: number
  discount: string
  surcharge: number
  markup_percentage: string
}

export interface SapRateResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: { origin: string; destination: string; coverage_cod: boolean; services: SapRateService[] } | []
}

export interface SapBookingData {
  awb_no: string           // waybillId!
  reference_no: string
  origin_branch_code: string
  destination_branch_code: string
  tlc_branch_code: string
  label: string
}

export interface SapBookingResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: SapBookingData | []
}

export interface SapTrackEvent {
  awb_no: string
  reference_no: string
  service_type_code: string
  origin: string           // human readable label
  destination: string
  shipping_cost: string
  rowstate: string
  rowstate_name: string    // STATUS FIELD
  rowstate_web: string
  pod_status_code: string | null
  pod_status_name: string | null
  description: string
  create_date: string      // “YYYY-MM-DD HH:MM:SS”
  current_branch_name: string
  origin_code: string
  destination_code: string
  lead_time_order: number
  lead_time_status: string
  lead_time_limit: string
}

export interface SapTrackResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: SapTrackEvent[]
}
```

### Env Vars yang Diperlukan

```env
SAP_API_BASE_URL=             # URL base API SAP
SAP_API_KEY=                  # API key dari SAP Express
SAP_CUSTOMER_CODE=            # kode merchant SAP (bukan username)
SAP_ORIGIN_DISTRICT_CODE=     # kode district kecamatan asal (contoh: JI1606 Kemlagi)
SAP_SHIPPER_NAME=
SAP_SHIPPER_ADDRESS=
SAP_SHIPPER_PHONE=
SAP_SHIPPER_CONTACT=
SAP_PICKUP_PLACE=1            # “1”=pickup courier, “2”=drop off
SAP_SHIPMENT_TYPE_CODE=SHTPC
SAP_SHIPMENT_CONTENT_CODE=SHTPC
SAP_WEBHOOK_TOKEN=            # token validasi webhook dari SAP
```

Tidak perlu `SAP_USERNAME` — auth hanya pakai `api_key` header.

## Arsitektur Target Jangka Panjang - 2026-06-20

Diklarifikasi user 2026-06-20: target integrasi dari sisi parent teknos.id adalah mengirim data human-readable tanpa mengetahui format kode internal kurir:

```json
{
  "origin_id": "origin_mojokerto_main",
  "destination": { "postal_code": "61382", "subdistrict": "Magersari", "city": "Mojokerto", "province": "Jawa Timur" },
  "weight_grams": 1000,
  "couriers": ["JNE", "JNT", "SAP_EXPRESS"]
}
```

Teknos-logistics bertanggung jawab resolve semua kode provider, origin, dan destinasi.

Status Sprint 10: endpoint baru `POST /v1/rates/resolve` mulai memenuhi arah ini tanpa memutus legacy `POST /v1/rates`. Parent dapat mengirim `origin_id` dan destination human-readable; `teknos-logistics` mengambil origin aktif milik merchant serta mapping destinasi per kurir dari `DestinationMapping`. Kurir nyata tetap wajib punya mapping eksplisit; endpoint rates tidak membuat AWB/resi.

Sprint lanjutan: Sprint 11 (SAP) â†’ Sprint 12 (Origin Registry per-kurir bila dibutuhkan) â†’ Sprint 13 (Destination Mapping Ops/import) â†’ Sprint 14 (Aggregated Rates policy/ranking).

## Sprint 10 Destination Mapping Deploy - 2026-06-20

- Applied Prisma migration `20260620103000_add_destination_mappings` to Supabase Postgres through active logistics tunnel `localhost:5434` using `npx prisma migrate deploy`.
- Added and validated `npm run smoke:rates:resolve` for `POST /v1/rates/resolve`. The smoke creates a temporary merchant, origin, destination mapping, and merchant API key, then performs non-mutating MOCK rate resolution only; it does not call JNE `generatecnote` or create a real AWB/resi.
- Validation passed after migration: `npm run smoke:rates:resolve`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run contract:check`, and `npm run sprint10:readiness`.
