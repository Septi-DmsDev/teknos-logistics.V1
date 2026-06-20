# Claude Code: Audit Integrasi teknos-logistics → teknos.id

Date: 2026-06-20
Status: Siap dieksekusi Claude Code
Scope: Audit penuh teknos-logistics + identifikasi gap integrasi + konfigurasi ulang teknos.id

---

## Konteks & Tujuan

`teknos-logistics` adalah service agregator logistik internal yang akan menggantikan
`src/lib/logistics/` di `teknos.id`. Setelah teknos-logistics selesai dibangun
(Sprint 11B selesai, Sprint 12 OriginMapping ditambahkan, Sprint 13 data import
selesai), kamu bertugas melakukan:

1. **Audit menyeluruh** codebase teknos-logistics — konfirmasi semua API contract,
   error shape, webhook signature, dan idempotency behavior sesuai dengan yang
   akan dikonsumsi teknos.id.

2. **Identifikasi semua gap/bug potensial** yang bisa muncul saat teknos.id
   memanggil teknos-logistics di production — sebelum integrasi dimulai.

3. **Dokumentasikan temuan** dalam format yang bisa langsung jadi dasar
   implementasi kode di teknos.id.

4. **Konfigurasi ulang teknos.id** untuk mengaktifkan integrasi — buat HTTP
   client, webhook receiver, dan ganti `src/lib/logistics/` secara bertahap
   via feature flag `LOGISTICS_ENABLED`.

Repos:
- teknos-logistics: `C:\NEXT\teknos.id\teknos-logistics\` (git repo terpisah)
- teknos.id: `C:\NEXT\teknos.id\` (repo utama, branch `master`)

Jangan edit file di luar masing-masing repo tanpa instruksi eksplisit.

---

## FASE 1 — Audit teknos-logistics (baca, jangan edit)

### 1.1 Verifikasi build & contract

```bash
cd C:\NEXT\teknos.id\teknos-logistics
git status --short --branch
npm run typecheck
npm run lint
npm run build
npm run test
npx tsx scripts/sprint6-readiness.ts
```

Baca semua output. Catat apa yang PASS dan apa yang FAIL.

Jika `sprint6-readiness` fail karena file `docs/TEKNOS_ID_HANDOFF.md` atau
`docs/SPRINT_6_CONTRACT_RUNBOOK.md` belum ada → catat sebagai temuan, jangan
buat dulu, lanjut audit.

### 1.2 Baca dan verifikasi API contract

Baca file-file ini secara mendalam:

```
src/schemas/api.ts                           ← request/response schema Zod
src/routes/v1/rates.ts                       ← POST /v1/rates/resolve + /v1/rates
src/routes/v1/shipments.ts                   ← POST /v1/shipments + GET /v1/shipments/:id/tracking
src/routes/webhooks/jne.ts                   ← POST /webhooks/jne
src/routes/webhooks/sap-express.ts           ← POST /webhooks/sap-express
src/services/shipment.service.ts             ← booking idempotency + event queuing
src/services/webhook-relay.service.ts        ← relay ke merchant endpoint
src/services/destination-resolution.service.ts  ← resolve destination mapping
src/utils/crypto.ts                          ← signWebhook + verifyWebhookSignature
src/middleware/api-key-auth.ts               ← Bearer token format
src/app.ts                                   ← route mounting + error handler
src/config/env.ts                            ← semua env var yang ada
prisma/schema.prisma                         ← semua model data
```

Untuk setiap bagian, verifikasi:
- Apa bentuk exact request yang harus dikirim teknos.id?
- Apa bentuk exact response yang diterima teknos.id?
- Apa error code dan HTTP status yang mungkin dikembalikan?
- Apa header yang wajib ada?

### 1.3 Daftar API yang dikonsumsi teknos.id

Berdasarkan bacaan kode, isi tabel ini secara akurat:

| Endpoint | Method | Auth | Request Body (key fields) | Response Body | Error Codes |
|---|---|---|---|---|---|
| /v1/rates/resolve | POST | Bearer tlg_* | origin_id, destination{}, weight_grams, couriers[] | {origin, destination, rates[]} | ORIGIN_NOT_FOUND(404), DESTINATION_MAPPING_NOT_FOUND(422), ORIGIN_MAPPING_NOT_FOUND(422) |
| /v1/shipments | POST | Bearer tlg_* | external_order_id, courier, service_code, origin_code, dest_code, weight_grams, recipient{name,phone,address}, rate_idr, goods_value_idr | {shipment{id,externalOrderId,courier,status,waybillId,...}, idempotent} | UNAUTHORIZED(401), VALIDATION_ERROR(400) |
| /v1/shipments/:id/tracking | GET | Bearer tlg_* | — | {shipment{}, tracking[{id,status,description,occurredAt}]} | SHIPMENT_NOT_FOUND(404) |
| /webhooks/jne | POST | x-jne-token header | courier-specific payload | {ok, duplicate, shipment} | INVALID_WEBHOOK_TOKEN(401) |
| /webhooks/sap-express | POST | x-sap-token header | courier-specific payload | {ok, duplicate, shipment} | INVALID_WEBHOOK_TOKEN(401) |

Lengkapi tabel berdasarkan kode nyata yang kamu baca — jangan isi berdasarkan asumsi.

### 1.4 Verifikasi webhook relay signature

Baca `src/utils/crypto.ts` function `signWebhook()` dan `verifyWebhookSignature()`.

Konfirmasi:
- Format signature: `sha256=<hmac-hex>`
- Header name yang dikirim ke merchant: `x-teknos-signature`
- Header name untuk event ID: `x-teknos-event-id`
- Payload yang di-sign: JSON string dari relay payload

Ini KRITIS — teknos.id harus implement receiver dengan format yang PERSIS sama.

### 1.5 Verifikasi relay payload shape

Baca `src/services/webhook-relay.service.ts` function `buildRelayPayload()`.

Konfirmasi exact shape JSON yang dikirim ke `LOGISTICS_WEBHOOK_URL` teknos.id:
```json
{
  "id": "<eventId>",
  "type": "<eventType>",
  "createdAt": "<ISO string>",
  "courier": "<CourierCode>",
  "shipment": {
    "id": "<internalId>",
    "merchantId": "...",
    "externalOrderId": "<orderNumber teknos.id>",
    "courier": "...",
    "waybillId": "...",
    "status": "<ShipmentStatus>",
    "updatedAt": "<ISO string>"
  } | null,
  "tracking": <normalized Json> | null
}
```

Catat field mana yang bisa `null` — teknos.id harus handle null safety.

### 1.6 Identifikasi semua potential gap dan bug

Buat daftar LENGKAP berdasarkan kode yang kamu baca. Gunakan template ini:

```
**GAP-N: [judul singkat]**
Severity: BLOCKER | HIGH | MEDIUM | LOW
File: [lokasi kode di teknos-logistics]
Deskripsi: [apa masalahnya secara teknis]
Impact di teknos.id: [apa yang akan terjadi jika tidak ditangani]
Fix yang diperlukan: [di mana harus diperbaiki — teknos-logistics, teknos.id, atau keduanya]
```

Minimal cek gap-gap ini (tambahkan jika menemukan lainnya):

**GAP yang SUDAH diketahui dari sesi sebelumnya:**

- **OriginMapping gap:** `destination-resolution.service.ts` baris 37 meneruskan
  `origin.code` (`"origin_mojokerto_main"`) langsung ke semua adapter sebagai
  `origin_code`. JNE butuh `"MJK10008"`, SAP Express butuh district code berbeda.
  Model `OriginMapping` belum ada di schema. Fix ada di Sprint 12 teknos-logistics.

- **DestinationMapping kosong:** Tabel `DestinationMapping` ada di schema tapi
  belum ada data. Setiap panggilan `/v1/rates/resolve` untuk kurir nyata
  (JNE/SAP) akan return `DESTINATION_MAPPING_NOT_FOUND (422)` sampai Sprint 13
  selesai. Fix: import data dari `docs/Docs API JNE/Live doc/suport file/list_dest.xlsx`.

**GAP yang perlu kamu verifikasi dan konfirmasi:**

- **GAP-W1:** `relay-webhooks.ts` adalah script yang dijalankan manual — tidak ada
  scheduler/cron di dalam service. Jika tidak ada cron eksternal, webhook dari
  kurir TIDAK AKAN pernah sampai ke teknos.id. Periksa apakah ada mekanisme
  scheduling di `src/app.ts` atau `src/server.ts`.

- **GAP-W2:** `webhook-relay.service.ts` menggunakan `signWebhook(body, secret)`
  tapi `verifyWebhookSignature()` di `crypto.ts` menggunakan timing-safe equal.
  Apakah teknos.id sudah punya fungsi ini atau harus dibuat dari scratch?
  Cek `src/lib/` di teknos.id.

- **GAP-R1:** Rate limit `/v1/*` adalah 120 req/min. Jika checkout flow memanggil
  `/v1/rates/resolve` per customer di peak, apakah ini cukup?
  Hitung: berapa concurrent user yang bisa ditangani?

- **GAP-S1:** `ShipmentRequest.recipient` hanya ada `{name, phone, address}`.
  Tidak ada `city` atau `postal_code` di recipient. Apakah kurir JNE dan SAP
  Express butuh kota di field booking mereka?
  Baca `src/couriers/jne/jne.adapter.ts` dan `src/couriers/sap-express/sap-express.adapter.ts`
  untuk konfirmasi field yang dipass ke API kurir.

- **GAP-S2:** `ShipmentRequest.external_order_id` max 64 chars. Format orderNumber
  teknos.id adalah `TKN-YYYY-XXXXXX`. Verifikasi panjang maksimum — apakah ada
  risiko truncation?

- **GAP-S3:** Setelah booking berhasil, teknos.id harus simpan dua ID:
  - `shipment.id` (internal teknos-logistics ID) → untuk tracking endpoint
  - `shipment.waybillId` → untuk tampilan ke customer
  Cek apakah kolom `Order` di teknos.id schema sudah cukup untuk menyimpan
  kedua nilai ini. Lihat `prisma/schema.prisma` di teknos.id untuk field
  `logisticsProvider`, `logisticsOrderId`, dan tracking fields.

- **GAP-D1:** `dest_code` untuk `/v1/shipments` harus providerCode kurir
  (e.g. `"CGK10000"` untuk JNE), bukan kode human-readable.
  teknos.id saat ini menyimpan `Address.logisticsDestCode`. Setelah integrasi:
  - Saat `/v1/rates/resolve` return, response berisi `destination.mappings[].providerCode`
  - teknos.id harus simpan providerCode per kurir yang dipilih customer
  - Saat booking, kirim providerCode tersebut sebagai `dest_code`
  Konfirmasi: apakah `Address.logisticsDestCode` cukup untuk satu providerCode,
  atau perlu menyimpan per-kurir?

- **GAP-E1:** Error shape dari teknos-logistics:
  - HttpError: `{error: string, code: string}` — HTTP status varies
  - ZodError: `{error: "Invalid request", code: "VALIDATION_ERROR", issues: [...]}`
  - Internal: `{error: "Internal server error", code: "INTERNAL_ERROR"}` (500)
  Konfirmasi teknos.id HTTP client akan handle semua 3 shape ini dengan benar.

- **GAP-C1:** `RateCache` TTL — baca `src/repositories/rate-cache.repository.ts`
  untuk konfirmasi berapa lama cache berlaku. Jika TTL terlalu panjang, rate
  yang ditampilkan ke customer bisa stale.

- **GAP-F1:** `LOGISTICS_PROVIDER=mock` di env teknos-logistics tidak mem-disable
  adapter lain (JNE, SAP masih terdaftar di registry). Tapi `couriers` field
  di request menentukan mana yang dipanggil. Apakah ada guard agar request
  dengan `couriers: ['JNE']` tidak bisa dikirim saat `LOGISTICS_PROVIDER=mock`?
  Ini bisa menyebabkan JNE API dipanggil di staging environment.

---

## FASE 2 — Dokumentasi Temuan

Setelah menyelesaikan semua bacaan di Fase 1, buat dokumen berikut:

### 2.1 File: `docs/TEKNOS_ID_HANDOFF.md` (di teknos-logistics repo)

Ini diperlukan oleh `sprint6-readiness.ts`. Isi dengan:

```markdown
# teknos-logistics → teknos.id Integration Handoff

## Required Parent Environment
[env vars yang dibutuhkan di teknos.id]

## API Contract Summary
[tabel endpoint + request/response shape]

## Webhook Receiver Contract
[exact format yang teknos.id harus implement]

## Server-only HTTP Client Example
[contoh TypeScript untuk memanggil /v1/rates/resolve]

## Webhook Receiver Example
[contoh TypeScript untuk menerima relay webhook]

## Staging Cutover Checklist
[langkah-langkah untuk flip LOGISTICS_ENABLED=true]

## Rollback
[cara rollback ke src/lib/logistics/ jika gagal]
```

Isi semua section berdasarkan audit yang sudah kamu lakukan — bukan template kosong.

### 2.2 File: `docs/SPRINT_6_CONTRACT_RUNBOOK.md` (di teknos-logistics repo)

Ini juga diperlukan oleh `sprint6-readiness.ts`. Isi dengan:

```markdown
# Sprint 6 Contract Runbook

## Hard Boundary
[apa yang teknos-logistics lakukan vs apa yang teknos.id lakukan]

## Merchant API Contracts
[spec lengkap tiap endpoint]

## Outbound Merchant Relay Contract
[spec relay payload + signature verification]

## Parent Handoff
[langkah handoff ke developer teknos.id]

## Smoke Commands
[perintah untuk membuktikan setiap endpoint bekerja]

## Definition of Done
[kondisi yang harus dipenuhi sebelum Sprint 6 dianggap selesai]
```

### 2.3 Jalankan readiness script

```bash
cd C:\NEXT\teknos.id\teknos-logistics
npx tsx scripts/sprint6-readiness.ts
```

Semua check harus PASS sebelum lanjut ke Fase 3.

---

## FASE 3 — Konfigurasi Ulang teknos.id

Setelah sprint6-readiness green, mulai konfigurasi teknos.id.
**SEMUA perubahan di sini ada di repo `C:\NEXT\teknos.id\` bukan teknos-logistics.**

Cek dulu state teknos.id:
```bash
cd C:\NEXT\teknos.id
git status --short --branch
npm run typecheck
```

### 3.1 Tambah env vars baru ke `.env.example` dan `src/lib/env.ts`

Env vars yang perlu ditambah (belum ada di teknos.id):
```
LOGISTICS_API_URL=""           # URL teknos-logistics service
LOGISTICS_API_KEY=""           # Bearer token tlg_* dari admin teknos-logistics
LOGISTICS_WEBHOOK_SECRET=""    # Secret untuk verify x-teknos-signature
LOGISTICS_ENABLED="false"      # Feature flag — false selama rollout
```

Tambahkan ke Zod schema di `src/lib/env.ts`:
```typescript
LOGISTICS_API_URL: z.string().url().optional().or(z.literal('')).default(''),
LOGISTICS_API_KEY: z.string().optional().default(''),
LOGISTICS_WEBHOOK_SECRET: z.string().optional().default(''),
LOGISTICS_ENABLED: z.coerce.boolean().default(false),
```

Validasi: `npm run typecheck` exit 0

### 3.2 Buat HTTP client `src/lib/logistics-api/client.ts`

Client ini dipanggil HANYA dari server-side (Server Actions, route handlers).
Jangan export ke komponen client.

```typescript
// Pattern yang harus diikuti:
export class LogisticsApiClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  async getRates(params: RateResolveRequest): Promise<RateResolveResponse> {
    // POST /v1/rates/resolve
    // timeout 10 detik via AbortController
    // throw LogisticsApiError jika response.ok === false
    // parse response body, return typed result
  }

  async bookShipment(params: ShipmentRequest): Promise<ShipmentBookingResponse> {
    // POST /v1/shipments
    // timeout 30 detik (booking lebih lama)
    // idempotent — safe to retry dengan external_order_id yang sama
  }

  async getTracking(shipmentId: string): Promise<ShipmentTrackingResponse> {
    // GET /v1/shipments/:id/tracking
    // timeout 10 detik
  }
}

export class LogisticsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'LogisticsApiError'
  }
}
```

Aturan implementasi:
- Gunakan `serverEnv()` untuk baca `LOGISTICS_API_URL` dan `LOGISTICS_API_KEY`
- Timeout AbortController wajib setiap request
- Log error tapi jangan expose detail internal ke client
- Throw `LogisticsApiError` yang typed, bukan raw Error

Validasi: `npm run typecheck` exit 0

### 3.3 Buat webhook receiver `src/app/api/webhooks/logistics/route.ts`

Receiver ini menerima relay dari teknos-logistics.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/lib/env'
import { verifyWebhookSignature } from '@/lib/logistics-api/crypto'
// verifyWebhookSignature = port dari teknos-logistics utils/crypto.ts

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Baca raw body sebagai string (bukan json() dulu — harus sign body string asli)
  const rawBody = await req.text()

  // 2. Ambil signature dari header x-teknos-signature
  const signature = req.headers.get('x-teknos-signature') ?? ''

  // 3. Verifikasi HMAC SHA256 — WAJIB sebelum proses apapun
  const secret = serverEnv().LOGISTICS_WEBHOOK_SECRET
  if (!secret || !verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 4. Parse body SETELAH verifikasi
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 5. Proses berdasarkan shipment.externalOrderId → cocokkan ke Order.orderNumber
  // 6. Update Order status berdasarkan shipment.status
  // 7. Return 200 selalu — jangan return 5xx atau teknos-logistics akan retry

  return NextResponse.json({ ok: true })
}
```

KRITIS:
- Raw body harus dibaca SEBELUM parsing JSON karena signature dibuat dari raw string
- `verifyWebhookSignature` harus di-port persis sama dari `teknos-logistics/src/utils/crypto.ts`
- Return 200 bahkan jika Order tidak ditemukan (idempotency)
- Return 200 bahkan jika sudah diproses sebelumnya (idempotency)

Buat helper `src/lib/logistics-api/crypto.ts` yang port fungsi `verifyWebhookSignature`
dari teknos-logistics. Tidak boleh import langsung dari teknos-logistics — harus
duplikasi fungsi ini karena berbeda runtime.

Validasi: `npm run typecheck` exit 0

### 3.4 Buat adapter `src/lib/logistics-api/adapter.ts`

Adapter ini adalah drop-in replacement untuk `src/lib/logistics/` interface yang
sudah digunakan oleh `shipment.service.ts` dan `shipment.actions.ts` di teknos.id.

```typescript
// Implement interface yang sama dengan LogisticsProvider
// tapi call ke LogisticsApiClient
export class TeknosLogisticsAdapter implements LogisticsProvider {
  constructor(private client: LogisticsApiClient, private originId: string) {}

  async getRates(params: GetRatesParams): Promise<Rate[]> {
    if (!serverEnv().LOGISTICS_ENABLED) {
      throw new Error('teknos-logistics integration is disabled')
    }
    const result = await this.client.getRates({
      origin_id: this.originId,
      destination: params.destination,
      weight_grams: params.weightGrams,
      couriers: params.couriers,
    })
    return result.rates.map(toInternalRate)
  }
  // ... bookShipment, getTracking
}
```

### 3.5 Ganti provider aktif di shipment service

Di `src/server/services/shipment.service.ts` atau equivalent:

```typescript
// Sebelum:
const provider = getLogisticsProvider() // JNE/mock dari src/lib/logistics/

// Sesudah (feature-flagged):
const provider = serverEnv().LOGISTICS_ENABLED
  ? new TeknosLogisticsAdapter(logisticsApiClient, LOGISTICS_ORIGIN_ID)
  : getLogisticsProvider()
```

Ini adalah satu-satunya tempat perubahan runtime behavior.

### 3.6 Konfigurasi webhook endpoint di teknos-logistics admin

Setelah kode teknos.id deployed, daftarkan webhook endpoint:

```bash
# Di teknos-logistics
npx tsx scripts/seed-merchant.ts   # pastikan merchant teknos.id ada
# Gunakan admin panel teknos-logistics untuk tambah webhook endpoint:
# URL: https://v2.teknos.id/api/webhooks/logistics
# Buat secret yang kuat
# Simpan secret sebagai LOGISTICS_WEBHOOK_SECRET di Coolify teknos.id
```

### 3.7 Verifikasi end-to-end di staging

Jalankan checklist ini dengan LOGISTICS_ENABLED=false (shadow mode — log tapi jangan ubah order):

```
1. Deploy teknos.id dengan env vars baru (semua kosong kecuali URL dan key)
2. Test /api/webhooks/logistics dengan payload valid → harus return 200
3. Test /api/webhooks/logistics dengan signature salah → harus return 401
4. Flip LOGISTICS_ENABLED=true di staging env
5. Test checkout flow end-to-end:
   a. Pilih produk → cart → checkout
   b. Pilih alamat → /v1/rates/resolve harus return rates
   c. Pilih kurir → checkout → /v1/shipments harus return waybillId
   d. Admin booking panel → waybillId tampil di order detail
   e. Simulasi webhook dari JNE → Order status terupdate
6. Verifikasi rollback: flip LOGISTICS_ENABLED=false → kembali ke src/lib/logistics/
```

---

## FASE 4 — Laporan Akhir

Setelah semua fase selesai, buat file `docs/superpowers/plans/2026-06-20-integration-audit-report.md`
di repo teknos-logistics dengan isi:

```markdown
# Integration Audit Report — teknos-logistics → teknos.id

Date: [tanggal eksekusi]
Auditor: Claude Code

## Build Status
[hasil npm run typecheck / lint / build / test]

## sprint6-readiness
[hasil npx tsx scripts/sprint6-readiness.ts]

## Gap Inventory
[daftar semua GAP dengan severity dan status fix]

## API Contract (dikonfirmasi dari kode)
[tabel lengkap berisi request/response shape actual]

## Webhook Contract (dikonfirmasi dari kode)
[relay payload shape + signature format]

## Konfigurasi Ulang teknos.id — Progress
[checklist yang sudah dikerjakan vs yang masih pending]

## Risiko Residual
[gap yang belum bisa di-fix sebelum go-live dan mitigasinya]

## Rekomendasi Urutan Deploy
[urutan langkah yang aman untuk flip ke production]
```

---

## ATURAN WAJIB

- Selesaikan Fase 1 (audit baca-only) dulu sebelum menyentuh kode apapun
- Jangan edit file di teknos-logistics kecuali membuat 2 dokumen di Fase 2
- Semua kode baru di Fase 3 ada di `C:\NEXT\teknos.id\` bukan teknos-logistics
- Jangan commit secret, API key, atau credential apapun
- Jangan flip `LOGISTICS_ENABLED=true` di production tanpa persetujuan eksplisit user
- Setiap langkah harus `npm run typecheck` exit 0 sebelum lanjut
- Jika menemukan gap baru yang tidak ada di daftar di atas, dokumentasikan SEBELUM mencoba fix
- Laporkan ke user setelah Fase 1 selesai — minta konfirmasi sebelum lanjut ke Fase 3

---

## FILE REFERENSI UTAMA

**Di teknos-logistics:**
| File | Relevansi |
|---|---|
| `src/schemas/api.ts` | Request/response schema exact |
| `src/utils/crypto.ts` | Signature verification — harus di-port ke teknos.id |
| `src/services/webhook-relay.service.ts` | Relay payload shape + HMAC header |
| `src/services/shipment.service.ts` | Idempotency logic |
| `src/services/destination-resolution.service.ts` | OriginMapping gap |
| `src/app.ts` | Error handler shape |
| `prisma/schema.prisma` | Data model lengkap |
| `scripts/sprint6-readiness.ts` | Kondisi yang harus dipenuhi |

**Di teknos.id:**
| File | Relevansi |
|---|---|
| `src/lib/env.ts` | Tempat tambah env vars baru |
| `src/lib/logistics/index.ts` | Interface yang di-replace |
| `src/server/services/shipment.service.ts` | Tempat feature flag dimasukkan |
| `prisma/schema.prisma` | Cek field Order untuk simpan shipmentId + waybillId |
| `src/app/api/webhooks/xendit/route.ts` | Pola webhook receiver yang sudah ada — ikuti polanya |

---

## URUTAN EKSEKUSI

```
FASE 1 — Audit (baca-only)
  1.1 Build verification
  1.2 Baca API contract dari source
  1.3 Konfirmasi tabel endpoint
  1.4 Verifikasi webhook signature format
  1.5 Konfirmasi relay payload shape
  1.6 Inventarisasi semua gap
       ↓
[LAPOR ke user → minta konfirmasi lanjut]
       ↓
FASE 2 — Dokumentasi
  2.1 Buat TEKNOS_ID_HANDOFF.md
  2.2 Buat SPRINT_6_CONTRACT_RUNBOOK.md
  2.3 sprint6-readiness green
       ↓
FASE 3 — Konfigurasi teknos.id
  3.1 Env vars + env.ts
  3.2 HTTP client
  3.3 Webhook receiver + crypto port
  3.4 Adapter
  3.5 Feature flag di shipment service
  3.6 Webhook endpoint config
  3.7 Staging E2E checklist
       ↓
FASE 4 — Laporan akhir
```

Mulai dari Fase 1. Laporkan semua temuan gap sebelum menyentuh kode teknos.id.
