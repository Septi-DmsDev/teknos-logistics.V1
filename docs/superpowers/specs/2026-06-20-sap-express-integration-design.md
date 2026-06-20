# SAP Express Full Integration — Spec (Updated dengan Sandbox Test Results)

Date: 2026-06-20
Status: API contract DIKONFIRMASI via live sandbox testing — siap untuk implementasi
Author: teknos.id architecture review + sandbox test Claude Code

---

## 1. Tujuan

Mengimplementasikan `SapExpressAdapter` yang lengkap (rates, booking, tracking, webhook normalization)
sehingga SAP Express berubah dari status `SKELETON` menjadi `ACTIVE` di capabilities matrix.

Referensi implementasi: `src/couriers/jne/` — ikuti pola dan struktur JNE adapter.

---

## 2. Status API Contract

**SEMUA endpoint sudah ditest di sandbox pada 2026-06-20.** Tidak perlu riset tambahan.
Detail lengkap ada di `docs/implementation-notes.md` section "Sprint 11 SAP Express — Sandbox Test Results".

---

## 3. Perbedaan Kritis vs JNE (Codex HARUS baca ini)

| Aspek | JNE | SAP Express |
|---|---|---|
| Auth | form-urlencoded body | header `api_key` + JSON body |
| Content-Type | `application/x-www-form-urlencoded` | **`application/json` (lowercase!)** |
| Rates endpoint | `POST /pricedev` | `POST /v2/master/shipment_cost` |
| Booking endpoint | `POST /generatecnote` | `POST /v2/shipment/pickup/create` |
| Tracking endpoint | `POST /list/v1/cnote/:awb` | `GET /v2/shipment/tracking?awb_no=` |
| AWB di booking response | `detail[0].cnote_no` | `data.awb_no` |
| District code format | `MJK10021` (numerik panjang) | `JI1609` (alfanumerik pendek) |
| Tracking response | objek tunggal | **array semua historical events** |
| Status field | `cnote_status` | **`rowstate_name`** (verbose string) |
| Idempotency reference | order number sebagai path | `reference_no` di body — TAPI tidak idempotent di SAPX! |
| Env auth | `JNE_USERNAME` + `JNE_API_KEY` body | `SAP_API_KEY` header saja |

---

## 4. API Contract Lengkap (Terkonfirmasi)

### Host

```
Sandbox:    https://apisanbox.coresyssap.com/
Production: https://api.coresyssap.com/
Production tracking: https://track.coresyssap.com/  (hanya tracking production berbeda host)
```

### Auth (semua endpoint)

```http
api_key: <SAP_API_KEY>
Content-Type: application/json
```

**PENTING:** Docs SAP salah tulis `Application/json` dengan kapital A.
API nyata hanya menerima `application/json` lowercase.

### Endpoint 1: Coverage Area

```
GET /v2/master/district/get?city_name=mojokerto
```

Response item:
```json
{
  "city_code": "JI16",
  "district_code": "JI1609",
  "district_name": "MOJOANYAR",
  "zone_code": "ZCJI1601",
  "provinsi_code": "JI",
  "city_name": "MOJOKERTO",
  "tlc_branch_code": "MJK",
  "provinsi_name": "JAWA TIMUR"
}
```

Gunakan `district_code` untuk tariff & booking.

### Endpoint 2: Shipment Cost (Rates)

```
POST /v2/master/shipment_cost

Request body:
{
  "origin": "JI1606",      ← district_code asal
  "destination": "JK00",   ← district_code tujuan
  "weight": 1,             ← integer kg (weightGrams / 1000, minimum 1)
  "customer_code": "...",  ← SAP_CUSTOMER_CODE env
  "volumetric": "10x10x10" ← "LxWxH" cm
}

Response services array item:
{
  "service_type_code": "UDRREG",     ← gunakan ini untuk booking
  "service_type_name": "SATRIA REG", ← gunakan ini untuk serviceName
  "total_cost": 24500,               ← GUNAKAN INI untuk priceIdr (integer)
  "sla": "3 - 5 Hari",              ← atau "-" jika tidak ada
  "final_weight": 1,                 ← max(actual_kg, volumetric_kg)
  "minimum_kilo": 1,
  "kilo_divider": 6000
}
```

Services yang tersedia:
- `UDRREG` → SATRIA REG (reguler)
- `DRGREG` → SATRIA CARGO (cargo)
- `UDRONS` → SATRIA ODS (one day)
- `UDRSDS` → SATRIA SDS (same day)

### Endpoint 3: Create Order (Booking)

```
POST /v2/shipment/pickup/create

Request body (semua wajib):
{
  "customer_code": "<SAP_CUSTOMER_CODE>",
  "reference_no": "<externalOrderId>",      ← max 20 chars, hanya - dan _
  "service_type_code": "<serviceCode>",
  "pickup_place": "1",                       ← dari SAP_PICKUP_PLACE env
  "koli": "1",
  "weight": 1,                               ← integer kg
  "volumetric": "10x10x10",                  ← "LxWxH" cm
  "destination_district_code": "<destCode>",
  "pickup_name": "<SAP_SHIPPER_NAME>",
  "pickup_address": "<SAP_SHIPPER_ADDRESS>",
  "pickup_phone": "<SAP_SHIPPER_PHONE>",
  "pickup_contact": "<SAP_SHIPPER_CONTACT>", ← WAJIB (tidak ada di old spec)
  "pickup_district_code": "<SAP_ORIGIN_DISTRICT_CODE>",
  "shipment_type_code": "<SAP_SHIPMENT_TYPE_CODE>",
  "shipment_content_code": "<SAP_SHIPMENT_CONTENT_CODE>",
  "shipper_name": "<SAP_SHIPPER_NAME>",
  "shipper_address": "<SAP_SHIPPER_ADDRESS>",
  "shipper_phone": "<SAP_SHIPPER_PHONE>",
  "shipper_contact": "<SAP_SHIPPER_CONTACT>",
  "receiver_name": "<recipientName>",
  "receiver_address": "<recipientAddress>",
  "receiver_phone": "<recipientPhone>",
  "receiver_contact": "<recipientName>"
}

Response success:
{
  "status": "success",
  "data": {
    "awb_no": "SAP00123456789",   ← waybillId — gunakan untuk tracking
    "reference_no": "<ref>",
    "origin_branch_code": "MJK",
    "destination_branch_code": "JKT",
    "tlc_branch_code": "MJK",
    "label": "https://...?awb_no=...&api_key=..."  ← JANGAN expose ke customer
  },
  "msg": "Pickup transfer success"
}

Response fail (reference_no duplikat — SAPX buat AWB baru, BUKAN error!):
```

**KRITIKAL:** SAPX tidak enforce idempotency pada `reference_no`.
Duplicate reference membuat AWB baru. Teknos-logistics cegah duplikat via DB constraint.

### Endpoint 4: Tracking

```
GET /v2/shipment/tracking?awb_no=<AWB>
  atau
GET /v2/shipment/tracking?reference_no=<REF>

Status: AWB ada, belum ada events (HTTP 200):
{ "status": "success", "msg": "Tidak ada status", "data": [] }

Status: AWB tidak ditemukan (HTTP 404):
{ "status": "fail", "msg": "Airwaybill tidak ditemukan" }

Status: Ada events (HTTP 200):
{
  "status": "success", "msg": "",
  "data": [
    {
      "rowstate_name": "ENTRI (PENDING PICKUP)",   ← STATUS, gunakan ini
      "description": "[KURIR: ] [KETERANGAN: ...]",
      "create_date": "2022-02-09 10:38:45",        ← "YYYY-MM-DD HH:MM:SS"
      "awb_no": "...",
      "reference_no": "...",
      ...
    }
  ]
}
```

**Terbaru = elemen TERAKHIR di array `data`.**

---

## 5. Posisi Saat Ini

File yang sudah ada (skeleton):
```
src/couriers/sap-express/
  sap-express.adapter.ts     ← semua method throw 501 — perlu diisi
  sap-express.normalizer.ts  ← status mapping ADA tapi SALAH — perlu update
```

Yang harus dibuat:
```
src/couriers/sap-express/
  sap-express.client.ts      ← HTTP client (buat baru)
  sap-express.types.ts       ← TypeScript types (buat baru)
```

---

## 6. Kontrak Interface yang Harus Dipenuhi

```typescript
interface RateParams {
  originCode: string     // SAP district_code (dari DestinationMapping origin)
  destCode: string       // SAP district_code (dari DestinationMapping destination)
  weightGrams: number    // berat dalam gram — CONVERT ke kg untuk SAP
}

interface BookShipmentParams {
  externalOrderId: string   // max 20 chars setelah disanitasi
  serviceCode: string       // "UDRREG", "DRGREG", dll
  originCode: string        // SAP district_code
  destCode: string          // SAP district_code
  weightGrams: number
  recipientName: string
  recipientPhone: string
  recipientAddress: string
  goodsValueIdr?: number
  isCod?: boolean           // jika true, butuh cod_amount dan customer_code COD
}
```

Output types:
```typescript
interface CourierRate {
  courier: 'SAP_EXPRESS'
  serviceCode: string   // service_type_code SAP: 'UDRREG', 'DRGREG', dll
  serviceName: string   // service_type_name SAP: 'SATRIA REG', dll
  priceIdr: number      // total_cost dari response (integer)
  etd: string           // sla dari response: "3 - 5 Hari" atau "Tidak tersedia"
  cached: false
}
```

---

## 7. TypeScript Types (`sap-express.types.ts`)

```typescript
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

export interface SapDistrictResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: SapDistrictItem[]
}

export interface SapRateService {
  service_type_code: string
  service_type_name: string
  cost: number
  total_cost: number           // gunakan ini untuk priceIdr
  sla: string                  // "3 - 5 Hari" atau "-"
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

export interface SapRateData {
  origin: string
  destination: string
  coverage_cod: boolean
  services: SapRateService[]
}

export interface SapRateResponse {
  status: 'success' | 'fail' | boolean
  msg: string
  data: SapRateData | []
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
  origin: string           // human readable, bukan kode
  destination: string
  shipping_cost: string
  rowstate: string
  rowstate_name: string    // STATUS FIELD — gunakan ini
  rowstate_web: string
  pod_status_code: string | null
  pod_status_name: string | null
  description: string
  create_date: string      // "YYYY-MM-DD HH:MM:SS"
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

---

## 8. Status Normalizer (`sap-express.normalizer.ts`) — PERLU UPDATE

File yang ada saat ini menggunakan string pendek seperti "DELIVERED", "PICKUP" — **SALAH**.
SAP menggunakan `rowstate_name` dengan format verbose string. Ganti isi normalizer:

```typescript
import type { ShipmentStatus } from '../types.js'

const SAP_STATUS_MAP: Record<string, ShipmentStatus> = {
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

export function mapSapExpressStatus(input: string | undefined): ShipmentStatus {
  if (!input) return 'IN_TRANSIT'
  return SAP_STATUS_MAP[input.trim()] ?? 'IN_TRANSIT'
}
```

---

## 9. HTTP Client (`sap-express.client.ts`) — Template

Ikuti pola `jne.client.ts` dengan penyesuaian:

```typescript
import type { Env } from '../../config/env.js'
import { HttpError } from '../../utils/http-error.js'
import type { SapRateResponse, SapBookingResponse, SapTrackResponse } from './sap-express.types.js'

const DEFAULT_TIMEOUT_MS = 15_000

// Keys yang diperlukan untuk setiap operasi
const SAP_BASE_KEYS = ['SAP_API_BASE_URL', 'SAP_API_KEY', 'SAP_CUSTOMER_CODE'] as const
const SAP_TARIFF_KEYS = [...SAP_BASE_KEYS, 'SAP_ORIGIN_DISTRICT_CODE'] as const
const SAP_BOOKING_KEYS = [
  ...SAP_TARIFF_KEYS,
  'SAP_SHIPPER_NAME', 'SAP_SHIPPER_ADDRESS', 'SAP_SHIPPER_PHONE', 'SAP_SHIPPER_CONTACT',
  'SAP_SHIPMENT_TYPE_CODE', 'SAP_SHIPMENT_CONTENT_CODE',
] as const

export class SapExpressClient {
  constructor(
    private readonly env: Env,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  assertConfigured(required: readonly string[] = [...SAP_BOOKING_KEYS]): void {
    const missing = required.filter(k => !this.env[k as keyof Env])
    if (missing.length > 0) {
      throw new HttpError(503, `SAP Express env tidak lengkap: ${missing.join(', ')}`, 'SAP_NOT_CONFIGURED')
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'api_key': this.env.SAP_API_KEY ?? '',
      'Content-Type': 'application/json',   // WAJIB lowercase
    }
  }

  async tariff(params: { originCode: string; destCode: string; weightKg: number }): Promise<SapRateResponse> {
    this.assertConfigured([...SAP_TARIFF_KEYS])
    const body = {
      origin: params.originCode,
      destination: params.destCode,
      weight: params.weightKg,
      customer_code: this.env.SAP_CUSTOMER_CODE,
      volumetric: '10x10x10',  // default minimal — update jika ada dimensi
    }
    return this.request<SapRateResponse>(
      `${this.env.SAP_API_BASE_URL}/v2/master/shipment_cost`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) },
      { operation: 'tariff', meta: { origin: params.originCode, dest: params.destCode } }
    )
  }

  async bookShipment(params: {
    referenceNo: string
    serviceCode: string
    destCode: string
    weightKg: number
    recipientName: string
    recipientPhone: string
    recipientAddress: string
    volumetric: string
  }): Promise<SapBookingResponse> {
    this.assertConfigured()
    const body = {
      customer_code: this.env.SAP_CUSTOMER_CODE,
      reference_no: params.referenceNo.substring(0, 20),  // max 20 chars
      service_type_code: params.serviceCode,
      pickup_place: this.env.SAP_PICKUP_PLACE ?? '1',
      koli: '1',
      weight: params.weightKg,
      volumetric: params.volumetric,
      destination_district_code: params.destCode,
      pickup_name: this.env.SAP_SHIPPER_NAME,
      pickup_address: this.env.SAP_SHIPPER_ADDRESS,
      pickup_phone: this.env.SAP_SHIPPER_PHONE,
      pickup_contact: this.env.SAP_SHIPPER_CONTACT,
      pickup_district_code: this.env.SAP_ORIGIN_DISTRICT_CODE,
      shipment_type_code: this.env.SAP_SHIPMENT_TYPE_CODE ?? 'SHTPC',
      shipment_content_code: this.env.SAP_SHIPMENT_CONTENT_CODE ?? 'SHTPC',
      shipper_name: this.env.SAP_SHIPPER_NAME,
      shipper_address: this.env.SAP_SHIPPER_ADDRESS,
      shipper_phone: this.env.SAP_SHIPPER_PHONE,
      shipper_contact: this.env.SAP_SHIPPER_CONTACT,
      receiver_name: params.recipientName,
      receiver_address: params.recipientAddress,
      receiver_phone: params.recipientPhone,
      receiver_contact: params.recipientName,
    }
    return this.request<SapBookingResponse>(
      `${this.env.SAP_API_BASE_URL}/v2/shipment/pickup/create`,
      { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(body) },
      { operation: 'bookShipment', meta: { ref: params.referenceNo.substring(0, 6) + '***' } }
    )
  }

  async track(waybillId: string): Promise<SapTrackResponse> {
    this.assertConfigured([...SAP_BASE_KEYS])
    const url = `${this.env.SAP_API_BASE_URL}/v2/shipment/tracking?awb_no=${encodeURIComponent(waybillId)}`
    return this.request<SapTrackResponse>(
      url,
      { method: 'GET', headers: this.getHeaders() },
      { operation: 'track', meta: { awb: waybillId.substring(0, 6) + '***' } }
    )
  }

  private async request<T>(
    url: string,
    init: RequestInit,
    context: { operation: string; meta: Record<string, unknown> }
  ): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    const start = Date.now()
    try {
      const res = await this.fetcher(url, { ...init, signal: controller.signal })
      const durationMs = Date.now() - start
      console.warn('[SAP]', context.operation, durationMs + 'ms', context.meta)
      if (!res.ok) {
        throw new HttpError(502, `SAP Express HTTP ${res.status}`, 'SAP_HTTP_ERROR')
      }
      return res.json() as Promise<T>
    } catch (err) {
      if (err instanceof HttpError) throw err
      throw new HttpError(502, `SAP Express network error: ${context.operation}`, 'SAP_NETWORK_ERROR')
    } finally {
      clearTimeout(timeout)
    }
  }
}
```

---

## 10. Adapter (`sap-express.adapter.ts`) — Template Implementasi

```typescript
export class SapExpressAdapter implements LogisticsProvider {
  readonly courier = 'SAP_EXPRESS' as const
  readonly capabilities = courierCapabilities.SAP_EXPRESS
  private readonly client: SapExpressClient

  constructor(env: Env, fetcher?: typeof fetch) {
    this.client = new SapExpressClient(env, fetcher)
  }

  async getRates(params: RateParams): Promise<CourierRate[]> {
    const weightKg = Math.max(1, Math.ceil(params.weightGrams / 1000))
    const raw = await this.client.tariff({ originCode: params.originCode, destCode: params.destCode, weightKg })
    const data = raw.data
    if (!data || Array.isArray(data)) return []
    return (data.services ?? [])
      .filter(s => s.total_cost > 0)
      .map(s => ({
        courier: 'SAP_EXPRESS' as const,
        serviceCode: s.service_type_code,
        serviceName: s.service_type_name,
        priceIdr: s.total_cost,
        etd: s.sla === '-' ? 'Tidak tersedia' : s.sla,
        cached: false as const,
      }))
  }

  async bookShipment(params: BookShipmentParams): Promise<BookShipmentResult> {
    const weightKg = Math.max(1, Math.ceil(params.weightGrams / 1000))
    const raw = await this.client.bookShipment({
      referenceNo: params.externalOrderId,
      serviceCode: params.serviceCode,
      destCode: params.destCode,
      weightKg,
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      recipientAddress: params.recipientAddress,
      volumetric: '10x10x10',
    })
    const data = raw.data
    if (!data || Array.isArray(data) || !data.awb_no) {
      throw new HttpError(502, 'SAP booking did not return awb_no', 'SAP_BOOKING_INVALID_RESPONSE')
    }
    return {
      courier: 'SAP_EXPRESS' as const,
      courierOrderId: data.awb_no,
      waybillId: data.awb_no,
      status: 'BOOKED' as const,
    }
  }

  async trackShipment(waybillId: string): Promise<NormalizedTrackingEvent[]> {
    const raw = await this.client.track(waybillId)
    if (!raw.data || raw.data.length === 0) return []
    return raw.data.map(event => ({
      waybillId,
      status: mapSapExpressStatus(event.rowstate_name),
      description: event.rowstate_web || event.rowstate_name,
      occurredAt: event.create_date
        ? new Date(event.create_date.replace(' ', 'T') + '+07:00').toISOString()
        : new Date().toISOString(),
    }))
  }

  normalizeWebhook(rawPayload: unknown): NormalizedTrackingEvent | null {
    if (!rawPayload || typeof rawPayload !== 'object') return null
    const p = rawPayload as Record<string, unknown>
    const waybillId = firstString(p, ['awb_no', 'waybill_id', 'resi'])
    const rowstateName = firstString(p, ['rowstate_name', 'status'])
    if (!waybillId || !rowstateName) return null
    return {
      waybillId,
      status: mapSapExpressStatus(rowstateName),
      description: firstString(p, ['rowstate_web', 'description']) ?? rowstateName,
      occurredAt: firstString(p, ['create_date', 'occurred_at']) ?? new Date().toISOString(),
    }
  }
}
```

---

## 11. Environment Variables

Tambahkan ke `src/config/env.ts` (sebagai `optionalSecret`) dan `.env.example`:

```typescript
// di envSchema Zod:
SAP_API_BASE_URL:             optionalSecret,
SAP_API_KEY:                  optionalSecret,
SAP_CUSTOMER_CODE:            optionalSecret,
SAP_ORIGIN_DISTRICT_CODE:     optionalSecret,
SAP_SHIPPER_NAME:             optionalSecret,
SAP_SHIPPER_ADDRESS:          optionalSecret,
SAP_SHIPPER_PHONE:            optionalSecret,
SAP_SHIPPER_CONTACT:          optionalSecret,
SAP_PICKUP_PLACE:             optionalSecret,
SAP_SHIPMENT_TYPE_CODE:       optionalSecret,
SAP_SHIPMENT_CONTENT_CODE:    optionalSecret,
SAP_WEBHOOK_TOKEN:            optionalSecret,
```

---

## 12. Unit Test Checklist

### `sap-express.normalizer.test.ts`
```typescript
test('ENTRI (PENDING PICKUP) → BOOKED')
test('PICKED UP → PICKED_UP')
test('VOID → CANCELLED')
test('VOID_PICKUP → CANCELLED')
test('MANIFEST OUTGOING → IN_TRANSIT')
test('INCOMING → IN_TRANSIT')
test('DELIVERY → OUT_FOR_DELIVERY')
test('POD - DELIVERED → DELIVERED')
test('POD - UNDELIVERED → FAILED')
test('OUTGOING RETURN → RETURNED')
test('SHIPMENT RETURN TO CLIENT → RETURNED')
test('unknown string → IN_TRANSIT')
test('undefined → IN_TRANSIT')
```

### `sap-express.adapter.test.ts`
```typescript
// Mock fetcher untuk semua test — tidak ada network call
const mockEnv = {
  SAP_API_BASE_URL: 'https://apisanbox.coresyssap.com',
  SAP_API_KEY: 'test-key',
  SAP_CUSTOMER_CODE: 'DEV000',
  SAP_ORIGIN_DISTRICT_CODE: 'JI1606',
  // ... semua SAP_* vars
}

test('getRates: maps services to CourierRate[]')
test('getRates: uses total_cost for priceIdr (not cost)')
test('getRates: filters out zero-price rates')
test('getRates: converts sla "-" to "Tidak tersedia"')
test('getRates: converts weightGrams to kg, minimum 1')
test('getRates: returns [] when data is empty array')
test('getRates: throws 503 when env not configured')
test('bookShipment: returns BookShipmentResult with awb_no as waybillId')
test('bookShipment: throws 502 when data.awb_no missing')
test('bookShipment: truncates externalOrderId to 20 chars')
test('trackShipment: returns NormalizedTrackingEvent[] from events array')
test('trackShipment: returns [] when data is empty (no events yet)')
test('trackShipment: converts create_date to ISO format')
test('normalizeWebhook: returns event for valid payload with rowstate_name')
test('normalizeWebhook: returns null when awb_no missing')
test('normalizeWebhook: returns null for non-object payload')
```

Mock fetcher pattern:
```typescript
const mockFetcher = (response: unknown) => async (_url: string) => ({
  ok: true,
  status: 200,
  json: async () => response,
} as Response)

const adapter = new SapExpressAdapter(mockEnv, mockFetcher({ /* SAP response */ }))
```

---

## 13. Kriteria Done

- [ ] `sap-express.types.ts` dibuat dengan semua types yang dikonfirmasi dari sandbox
- [ ] `sap-express.normalizer.ts` diupdate dengan `SAP_STATUS_MAP` yang benar
- [ ] `sap-express.client.ts` dibuat dengan `Content-Type: application/json` lowercase
- [ ] `sap-express.adapter.ts` tidak ada method yang throw 501
- [ ] `capabilities.ts` — `SAP_EXPRESS` status = `ACTIVE`, semua `supports*: true`
- [ ] `env.ts` schema mencakup semua `SAP_*` vars sebagai `optionalSecret`
- [ ] `.env.example` mencantumkan semua `SAP_*` vars
- [ ] `POST /webhooks/sap-express` handler dibuat
- [ ] Provider registry mendaftarkan `SapExpressAdapter`
- [ ] `npm run lint && npm run typecheck && npm run build` exit 0
- [ ] `npm run test` — semua normalizer + adapter tests pass
- [ ] `CLAUDE.md` Sprint Status diupdate: tambah row SAP Express selesai

---

## 14. Referensi

- `src/couriers/jne/` — referensi implementasi lengkap
- `src/couriers/capabilities.ts` — update `SAP_EXPRESS` dari SKELETON ke ACTIVE
- `src/config/env.ts` — tambahkan `SAP_*` vars
- `docs/implementation-notes.md` — detail lengkap sandbox test results (Sprint 11 section)
- `docs/ROADMAP.md` — Sprint 11 context
