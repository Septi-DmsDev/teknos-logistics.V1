# SAPX Sandbox Integration Progress Handoff

Date: 2026-06-22  
Scope: `teknos-logistics` SAP Express / SAPX integration  
Status: sandbox validation in progress; production/live account request is not ready until sandbox rate, order, COD, tracking, and webhook flows pass.

## 1. Executive Summary

Teknos is integrating SAP Express (SAPX) as an active courier provider in `teknos-logistics`. The JNE logistics cutover is already stable, while SAPX is currently in sandbox enablement and validation.

The latest SAPX feedback changes the rollout approach:

1. SAPX sandbox data is intentionally incomplete.
2. Teknos must list the origin, destinations, and services to be opened in sandbox.
3. All testing must be completed in sandbox first, including rate, payload, order creation, COD, tracking, and webhook.
4. Sandbox customer code differs from production customer code:
   - NON-COD sandbox: `DEV000`
   - COD sandbox: `DEV001`
5. COD shipment payload must include `cod_value`.
6. SAPX has provided a new webhook/push status document: `[SAPX] Push Data Provide Documentation v1.2.pdf`.

Current code supports split COD and NON-COD customer-code selection. The follow-up patches for webhook timestamp and COD value have also been implemented after this handoff was created:

1. Webhook timestamp alias: `created_at` from the SAPX webhook document is now supported.
2. COD booking payload: `cod_value` is now sent for COD shipment creation when `isCod=true`.

## 2. Current Repository Context

Main workspace:

```text
C:\NEXT\teknos.id
```

Focused nested project:

```text
C:\NEXT\teknos.id\teknos-logistics
```

Relevant documentation and artifacts:

```text
teknos-logistics/docs/Docs API Expedisi/SAP/[SAPX] API Documentation Order v2.5.0.pdf
teknos-logistics/docs/Docs API Expedisi/SAP/[SAPX] Push Data Provide Documentation v1.2.pdf
teknos-logistics/docs/Docs API Expedisi/SAP/suport file/COVERAGE AREA SAPX 22-06-2026.xlsx
teknos-logistics/sapx_webhook_pdf_extract.txt
sapx_pdf_extract.txt
```

Do not commit `.env.local` files or real credentials. The SAPX PDF and extracted text may be tracked only if the team wants API vendor docs stored in the repo.

## 3. Confirmed SAPX Account and Sandbox Information

### 3.1 Production Customer Codes Received

SAPX has provided production customer codes for Teknos:

| Purpose | Customer Code | Label |
| --- | --- | --- |
| NON-COD | `MJK047496` | TEKNOS INDONESIA (NON COD) |
| COD | `MJK047493` | TEKNOS INDONESIA (COD) |

These are intended for production/live account usage after sandbox validation.

### 3.2 Sandbox Customer Codes Confirmed by SAPX

SAPX clarified that sandbox testing should use development customer codes:

| Purpose | Sandbox Customer Code |
| --- | --- |
| NON-COD | `DEV000` |
| COD | `DEV001` |

Operational implication:

- During sandbox testing, `SAP_CUSTOMER_CODE_NON_COD` should use `DEV000`.
- During sandbox testing, `SAP_CUSTOMER_CODE_COD` should use `DEV001`.
- Production customer codes `MJK047496` and `MJK047493` should be restored only after production credential/live account activation.

## 4. Coverage Area Review

SAPX provided coverage file:

```text
teknos-logistics/docs/Docs API Expedisi/SAP/suport file/COVERAGE AREA SAPX 22-06-2026.xlsx
```

Observed coverage summary:

- Total rows reviewed: 7,747
- Active rows: all rows observed are `AKTIF`
- Teknos origin exists and is active:

| Field | Value |
| --- | --- |
| Origin district code | `JI1606` |
| Area | `KEMLAGI (MOJOKERTO)` |
| Branch | `MJK - MOJOKERTO` |
| Area COD | `YES` |
| Status | `AKTIF` |

Conclusion: the Teknos Mojokerto origin is present in SAPX coverage data, but sandbox shipment-cost pricing for this origin is not available until SAPX adds the requested sandbox route data.

## 5. Sandbox Rate Test Findings

Earlier read-only sandbox tests used the SAPX API documentation endpoints:

- `GET /v2/master/district/get`
- `POST /v2/master/shipment_cost`

No create/request order was executed during the earlier tests, so no AWB/order was created.

### 5.1 Coverage Endpoint Findings

Coverage endpoint responded successfully for tested areas:

| Test | Result |
| --- | --- |
| `city_name=MOJOKERTO` | HTTP 200, success; multiple districts found including `JI1606 - KEMLAGI MOJOKERTO` |
| `district_name=KEMLAGI` | HTTP 200, success; `JI1606 - KEMLAGI, MOJOKERTO, JAWA TIMUR` found |
| `city_name=SURABAYA` | HTTP 200, success; multiple districts found |
| Jakarta-area district checks | HTTP 200, success for tested examples |

Conclusion: district/coverage lookup works from the Teknos integration environment.

### 5.2 Shipment Cost Findings

Shipment-cost/rate testing showed this pattern:

| Origin | Destination | Result |
| --- | --- | --- |
| `JI1606` | `JI1617` | failed; `Harga tidak ditemukan` |
| `JI1606` | `JK00` | failed; `Harga tidak ditemukan` |
| `JI1606` | `JK1007` | failed; `Harga tidak ditemukan` |
| `JI1606` | `JI28` | failed; `Harga tidak ditemukan` |
| `JI1606` | `JI2831` | failed; `Harga tidak ditemukan` |
| `JK1007` | `JK00` | success; service `UDRREG / SATRIA REG`, cost `9000`, SLA `1 - 3 Hari` |
| `JK1007` | `JI1606` | success; cost `29000`, SLA `3 - 5 Hari` |
| `JK1007` | `JI28` / `JI2831` | success; cost `20000`, SLA `2 - 4 Hari` |

Conclusion: SAPX sandbox credential and API are usable. The rate failure for Teknos origin `JI1606` is most likely due to missing sandbox route/pricing data, not a core integration connectivity failure.

## 6. Sandbox Routes Requested to SAPX

The recommended sandbox route-opening request to SAPX is:

### 6.1 Origin

```text
JI1606 - KEMLAGI (MOJOKERTO)
```

### 6.2 Destinations

| Priority | Destination | Reason |
| --- | --- | --- |
| 1 | `JI1617 - JETIS MOJOKERTO` | Local Mojokerto test route |
| 2 | `JI28 - SURABAYA` | Nearby major city route |
| 3 | `JI2831 - SURABAYA` | Alternate Surabaya district route |
| 4 | `JK1007 - JAKARTA` | Cross-province route already known to price successfully as origin in sandbox |
| 5 | `JK00 - JAKARTA` | Jakarta route used in earlier shipment-cost comparison |

### 6.3 Services

Request SAPX to open the regular service used for Teknos. Based on prior successful sandbox response, include:

```text
UDRREG / SATRIA REG
```

If SAPX uses another active Teknos service name/code in sandbox or production, ask them to open that service as well.

### 6.4 Test Scenarios Required After SAPX Adds Sandbox Data

1. Rate/shipment cost NON-COD using `DEV000`.
2. Rate/shipment cost COD using `DEV001`.
3. Create/request order NON-COD.
4. Create/request order COD with `cod_value`.
5. Tracking by AWB.
6. Webhook status push in sandbox.

## 7. Current Code State

### 7.1 COD and NON-COD Customer Code Split

The integration now supports separate SAPX customer codes:

| Env | Purpose |
| --- | --- |
| `SAP_CUSTOMER_CODE_NON_COD` | Preferred customer code for non-COD requests |
| `SAP_CUSTOMER_CODE_COD` | Preferred customer code for COD requests |
| `SAP_CUSTOMER_CODE` | Legacy fallback only |

Relevant implementation files:

```text
teknos-logistics/src/config/env.ts
teknos-logistics/src/couriers/sap-express/sap-express.adapter.ts
teknos-logistics/src/couriers/types.ts
teknos-logistics/src/schemas/api.ts
teknos-logistics/src/services/rate.service.ts
teknos-logistics/src/services/destination-resolution.service.ts
```

Parent `teknos.id` integration also forwards COD context to `teknos-logistics`:

```text
src/lib/teknos-logistics/types.ts
src/server/services/shipping-rate-request.ts
src/server/services/shipping.service.ts
src/server/actions/shipping.actions.ts
```

### 7.2 Rate Cache Behavior

Rate cache is separated between COD and NON-COD at the parent integration layer, so COD and NON-COD rates do not reuse the same cache key.

Inside `teknos-logistics`, COD rate requests avoid the normal rate cache to reduce the risk of mixing COD and NON-COD pricing behavior.

### 7.3 Webhook Endpoint

Current SAPX webhook endpoint:

```text
POST /webhooks/sap-express
```

Current token headers accepted:

```text
x-sap-token
x-webhook-token
```

Current env:

```text
SAP_WEBHOOK_TOKEN
```

Important open question for SAPX:

- Confirm whether SAPX sandbox can send a custom header such as `x-sap-token`, or whether their webhook authentication uses another mechanism.

## 8. New Webhook Document Review

New document:

```text
teknos-logistics/docs/Docs API Expedisi/SAP/[SAPX] Push Data Provide Documentation v1.2.pdf
```

Extracted reference:

```text
teknos-logistics/sapx_webhook_pdf_extract.txt
```

### 8.1 Webhook Payload Example from Document

The document describes this payload shape:

```json
{
  "reference_no": "OID-2508089158",
  "awb_no": "KA-OID-2508089158",
  "rowstate_name": "ENTRI (SEDANG DI PICKUP)",
  "description": "[KURIR: JIMMY PRADWITAMA]",
  "kilo": "1",
  "koli": "1",
  "volumetric": "8x8x8",
  "origin_code": "JB1134",
  "destination_code": "JT1801",
  "shipping_cost": "8000",
  "created_at": "2023-02-17 14:55:41",
  "photo_pod": [],
  "signature_pod": [],
  "photo_pickup": [],
  "signature_pickup": []
}
```

### 8.2 Webhook Field Notes

| Field | Meaning |
| --- | --- |
| `reference_no` | Teknos/B2B unique reference number |
| `awb_no` | SAPX airwaybill number |
| `rowstate_name` | Main SAPX checkpoint/status field |
| `description` | Status description or courier note |
| `kilo` | Shipment weight |
| `koli` | Package count |
| `volumetric` | Dimension string |
| `origin_code` | Pickup origin district code |
| `destination_code` | Receiver destination district code |
| `shipping_cost` | Shipping cost |
| `created_at` | Checkpoint timestamp |
| `photo_pod` | Proof-of-delivery photo URLs |
| `signature_pod` | Proof-of-delivery signature URLs |
| `photo_pickup` | Pickup photo URLs |
| `signature_pickup` | Pickup signature URLs |

### 8.3 Checkpoint Mapping from Webhook Document

| SAPX Checkpoint | Teknos Normalized Status | Meaning |
| --- | --- | --- |
| `ENTRI (SEDANG DI PICKUP)` | `BOOKED` | Pickup in process |
| `ENTRI (PENDING PICKUP)` | `BOOKED` | Pickup pending/delayed |
| `ENTRI (SEDANG PICKUP ULANG)` | `BOOKED` | Re-pickup in process |
| `PICKED UP` | `PICKED_UP` | Package picked up |
| `VOID_PICKUP` | `CANCELLED` | Pickup cancelled |
| `VOID` | `CANCELLED` | Shipment cancelled |
| `ENTRI VERIFIED` | `BOOKED` | Shipment verified |
| `MANIFEST OUTGOING` | `IN_TRANSIT` | Moving to destination branch |
| `INCOMING` | `IN_TRANSIT` | Arrived at destination branch |
| `DELIVERY` | `OUT_FOR_DELIVERY` | Courier delivering to receiver |
| `POD - DELIVERED` | `DELIVERED` | Delivered successfully |
| `POD - UNDELIVERED` | `FAILED` | Delivery failed |
| `OUTGOING RETURN` | `RETURNED` | Return leaving branch |
| `INCOMING RETURN` | `RETURNED` | Return arrived at origin/return branch |
| `DELIVERY RETURN` | `RETURNED` | Return being delivered |
| `SHIPMENT RETURN TO CLIENT` | `RETURNED` | Returned to client |

Current mapping already covers these statuses in `sap-express.normalizer.ts`.

## 9. Patch Status Before Full Sandbox Testing

### 9.1 Webhook Timestamp Field Patch

The webhook document uses:

```text
created_at
```

Current normalizer primarily reads:

```text
create_date
occurred_at
event_time
updated_at
```

Previous risk:

- If SAPX sends only `created_at`, Teknos will use the server receive time as fallback instead of the real checkpoint time.

Implemented patch:

- Added `created_at` to SAPX webhook timestamp aliases.
- Added adapter test coverage to verify `created_at` is preserved as `occurredAt`.

### 9.2 COD Payload Patch

SAPX clarified:

- COD uses customer code `DEV001` in sandbox.
- COD payload requires `cod_value`.

Current adapter selects the COD customer code correctly when `isCod=true`, and booking payload now sends `cod_value`.

Previous risk:

- COD create/request order may fail in sandbox even if the route and service are active.

Implemented patch:

- Extended SAPX booking request type with optional `cod_value`.
- When `isCod=true`, `cod_value` is taken from `BookShipmentParams.goodsValueIdr`.
- COD booking now fails before calling SAPX if the amount is missing, non-finite, or not positive.
- Added tests for COD booking payload and preflight rejection.

Implementation detail:

- `goodsValueIdr` is currently used as the source for `cod_value`.
- If the parent order flow later distinguishes goods value from COD payable amount, add a separate COD amount field and map that into `cod_value`.

## 10. Implemented Patch Summary

Patch 1: webhook timestamp support.

- File: `teknos-logistics/src/couriers/sap-express/sap-express.adapter.ts`
- Added `created_at` to timestamp alias list.
- Added test in `teknos-logistics/tests/sap-express/sap-express.adapter.test.ts`.

Patch 2: COD value support.

- File: `teknos-logistics/src/couriers/sap-express/sap-express.client.ts`
- Added `cod_value?: number` to `SapBookingRequest`.
- File: `teknos-logistics/src/couriers/sap-express/sap-express.adapter.ts`
- If `params.isCod === true`, includes `cod_value`.
- If COD amount is missing or not positive, fails before calling SAPX with `SAP_COD_VALUE_REQUIRED`.
- File: `teknos-logistics/tests/sap-express/sap-express.adapter.test.ts`
- Added test that COD booking sends `cod_value`.
- Added test that COD booking without valid amount fails before API call.

Patch 3: documentation update after implementation.

- Updated this handoff document with completed patch status.
- No new env variable was introduced.
- No parent contract change was required for this patch.

## 11. Validation Commands to Run After Patch

Run from `teknos-logistics`:

```bash
npm run test -- tests/sap-express/sap-express.adapter.test.ts
npm run smoke:sap:adapter
npm run sprint11b:readiness
npm run typecheck
npm run lint
```

If parent payload changes are required later, run from root `teknos.id`:

```bash
node --test --experimental-strip-types src/server/services/shipping.service.safety.test.ts src/lib/teknos-logistics/client.test.ts
npm run typecheck
npm run lint
```

## 12. Sandbox Test Runbook After SAPX Opens Data

### 12.1 Prepare Sandbox Env

Use sandbox customer codes only:

```env
SAP_CUSTOMER_CODE_NON_COD="DEV000"
SAP_CUSTOMER_CODE_COD="DEV001"
```

Keep production codes out of sandbox testing unless SAPX explicitly instructs otherwise.

### 12.2 Test Rate NON-COD

Input:

- Origin: `JI1606`
- Destination: one of the newly opened sandbox destinations
- Customer code: `DEV000`
- Expected result: at least one service returned with positive cost.

### 12.3 Test Rate COD

Input:

- Origin: `JI1606`
- Destination: one of the newly opened sandbox destinations
- Customer code: `DEV001`
- Expected result: at least one service returned with positive cost.

### 12.4 Test Create Order NON-COD

Run only after explicit operator approval because this creates a SAPX order/AWB in sandbox.

Expected result:

- SAPX returns `awb_no` and `reference_no`.
- Teknos stores booking result and shipment status as `BOOKED`.

### 12.5 Test Create Order COD

Run only after explicit operator approval.

Required payload behavior:

- `customer_code`: `DEV001`
- `cod_value`: positive order/COD amount

Expected result:

- SAPX accepts the COD order.
- SAPX returns `awb_no` and `reference_no`.

### 12.6 Test Tracking

Use returned AWB.

Expected result:

- Tracking endpoint returns SAPX checkpoint events.
- Teknos normalizes `rowstate_name` into internal `ShipmentStatus`.

### 12.7 Test Webhook

Provide SAPX sandbox webhook URL after the service is exposed publicly or via tunnel.

Endpoint:

```text
POST /webhooks/sap-express
```

Authentication expectation:

```text
x-sap-token: <SAP_WEBHOOK_TOKEN>
```

If SAPX cannot send `x-sap-token`, adjust route authentication only after SAPX confirms their supported mechanism.

Expected result:

- Webhook payload normalizes by `awb_no` and `rowstate_name`.
- `created_at` is preserved as the tracking event time after patch.
- Duplicate events are idempotent.
- Merchant webhook relay queue receives the event after shipment update.

## 13. Message Draft for SAPX

Use this concise message when coordinating sandbox route activation:

```text
Baik mas, untuk testing sandbox Teknos mohon dibantu buka data shipment cost/rate berikut.

Origin:
- JI1606 - KEMLAGI (MOJOKERTO)

Destination:
1. JI1617 - JETIS MOJOKERTO
2. JI28 - SURABAYA
3. JI2831 - SURABAYA
4. JK1007 - JAKARTA
5. JK00 - JAKARTA

Service:
- UDRREG / SATRIA REG atau service regular utama yang aktif untuk Teknos.
- Jika ada service lain yang nanti dipakai Teknos, mohon ikut dibuka juga di sandbox.

Skenario testing yang akan kami jalankan:
1. Rate NON-COD pakai customer code DEV000.
2. Rate COD pakai customer code DEV001.
3. Create/request order NON-COD.
4. Create/request order COD dengan cod_value.
5. Tracking AWB/order.
6. Webhook status shipment sandbox.

Mohon konfirmasi juga untuk webhook sandbox apakah SAPX bisa mengirim token melalui header x-sap-token, atau ada format autentikasi khusus dari SAPX.

Terima kasih mas.
```

## 14. Decision Log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-06-22 | Keep SAPX production customer codes separate from sandbox codes | SAPX confirmed sandbox uses `DEV000` and `DEV001` |
| 2026-06-22 | Continue sandbox-first validation before live account testing | SAPX requires sandbox testing for payload, webhook, and order flows |
| 2026-06-22 | Request SAPX to add route/pricing data for `JI1606` sandbox origin | Current shipment-cost response for `JI1606` returns `Harga tidak ditemukan` |
| 2026-06-22 | Patch webhook timestamp alias before webhook test | SAPX webhook doc uses `created_at` |
| 2026-06-22 | Patch COD payload before COD order test | SAPX confirmed COD requires `cod_value` |

## 15. Agent Guardrails

- Do not run SAPX create/request order without explicit operator approval.
- Do not print `.env.local` values or real credentials.
- Do not commit sandbox or production secrets.
- Do not switch sandbox customer codes to production customer codes until SAPX live account is activated.
- Keep parent `teknos.id` commerce-focused; SAPX courier logic belongs in `teknos-logistics`.
- Keep webhook handling idempotent.
- Validate external payloads and avoid returning raw internal errors.
- If touching webhook or COD booking code, run the SAPX adapter tests and readiness checks before marking work complete.

## 2026-06-22 — SAPX Sandbox Rate Retest After Route Enablement

SAPX confirmed they added sandbox shipment-cost data for the requested Teknos routes. A read-only retest was run against `POST /v2/master/shipment_cost` only; no create/request order was executed and no AWB was created.

Test setup:

- Origin: `JI1606 - KEMLAGI (MOJOKERTO)`
- NON-COD customer code: `DEV000`
- COD customer code: `DEV001`
- Weight: `1 kg`
- Volumetric: `10x10x10`
- Sanitized response artifact: `tmp/sapx-sandbox-rate-retest-2026-06-22.json`

Result summary:

| Scenario | Route | Result | Services returned |
| --- | --- | --- | --- |
| NON-COD | `JI1606 -> JI1617` | success | `DRGREG`, `UDRREG`, `UDRONS` |
| NON-COD | `JI1606 -> JI28` | success | `DRGREG`, `UDRREG`, `UDRONS` |
| NON-COD | `JI1606 -> JI2831` | success | `DRGREG`, `UDRREG`, `UDRONS` |
| NON-COD | `JI1606 -> JK1007` | success | `DRGREG`, `UDRREG`, `UDRONS` |
| NON-COD | `JI1606 -> JK00` | success | `DRGREG`, `UDRREG`, `UDRONS` |
| COD | `JI1606 -> JI1617` | success | `DRGREG`, `UDRREG`, `UDRONS` |
| COD | `JI1606 -> JI28` | success | `DRGREG`, `UDRREG`, `UDRONS` |
| COD | `JI1606 -> JI2831` | success | `DRGREG`, `UDRREG`, `UDRONS` |
| COD | `JI1606 -> JK1007` | success | `DRGREG`, `UDRREG`, `UDRONS` |
| COD | `JI1606 -> JK00` | success | `DRGREG`, `UDRREG`, `UDRONS` |

Conclusion: SAPX sandbox route/pricing data for Teknos origin `JI1606` is now active for the requested destinations in both NON-COD and COD customer-code scenarios. The next controlled step is sandbox create/request order testing, starting with NON-COD, then COD with `cod_value`, only after explicit operator approval.

## 2026-06-22 — SAPX Sandbox Create Order NON-COD Controlled Test

A mutating sandbox create/request order test was executed only after explicit operator approval. This created one SAPX sandbox order/AWB.

Test setup:

- Scenario: NON-COD sandbox create/request order
- Endpoint: `POST /v2/shipment/pickup/create`
- Customer code: `DEV000`
- Origin: `JI1606 - KEMLAGI (MOJOKERTO)`
- Destination: `JI1617 - JETIS MOJOKERTO`
- Service: `UDRREG - SATRIA REG`
- Weight: `1 kg`
- Volumetric: `10x10x10`
- Sanitized response artifact: `tmp/sapx-sandbox-create-order-noncod-2026-06-22.json`

Result:

| Field | Value |
| --- | --- |
| HTTP status | `200` |
| API status | `success` |
| API message | `Pickup transfer success` |
| Reference no | `TLG-SBX-202606221018` |
| AWB no | `DEV00845560419` |

Conclusion: SAPX sandbox NON-COD create/request order flow is working for route `JI1606 -> JI1617` using `DEV000`. Next controlled steps are tracking this AWB, then COD create/request order with `DEV001` and `cod_value`, then webhook sandbox validation.

## 2026-06-22 — SAPX Sandbox Tracking and COD Create Order Controlled Test

After the NON-COD sandbox AWB was created, tracking was tested and one COD sandbox order was created with explicit operator approval.

### Tracking Test for NON-COD AWB

- Endpoint: `GET /v2/shipment/tracking`
- AWB: `DEV00845560419`
- Sanitized response artifact: `tmp/sapx-sandbox-tracking-noncod-2026-06-22.json`

Result:

| Field | Value |
| --- | --- |
| HTTP status | `200` |
| API status | `success` |
| API message | `Tidak ada status` |
| Event count | `0` |

Conclusion: tracking endpoint is reachable for the sandbox AWB, but SAPX has not produced tracking checkpoint events yet for `DEV00845560419`.

### COD Create/Request Order Test

- Endpoint: `POST /v2/shipment/pickup/create`
- Customer code: `DEV001`
- Origin: `JI1606 - KEMLAGI (MOJOKERTO)`
- Destination: `JI1617 - JETIS MOJOKERTO`
- Service: `UDRREG - SATRIA REG`
- COD value: `150000`
- Sanitized response artifact: `tmp/sapx-sandbox-create-order-cod-2026-06-22.json`

Result:

| Field | Value |
| --- | --- |
| HTTP status | `200` |
| API status | `success` |
| API message | `Pickup transfer success` |
| Reference no | `TLG-COD-202606221023` |
| AWB no | `DEV00845560420` |

Conclusion: SAPX sandbox COD create/request order flow is working with `DEV001` and `cod_value`. Next steps are tracking `DEV00845560420` and coordinating SAPX webhook sandbox delivery.

## 2026-06-22 — SAPX Sandbox Tracking COD AWB Test

The COD sandbox AWB was tested against SAPX tracking after successful COD create/request order.

- Endpoint: `GET /v2/shipment/tracking`
- AWB: `DEV00845560420`
- Sanitized response artifact: `tmp/sapx-sandbox-tracking-cod-2026-06-22.json`

Result:

| Field | Value |
| --- | --- |
| HTTP status | `200` |
| API status | `success` |
| API message | `Tidak ada status` |
| Event count | `0` |

Conclusion: tracking endpoint is reachable for the COD sandbox AWB, but SAPX has not produced tracking checkpoint events yet for `DEV00845560420`. Both NON-COD and COD AWBs should be sent to SAPX so they can trigger/update sandbox status and webhook events.
