# SAP Express Full Integration — Implementation Plan

Date: 2026-06-20 (diupdate setelah sandbox testing)
Spec: `docs/superpowers/specs/2026-06-20-sap-express-integration-design.md`
Status: **API contract DIKONFIRMASI via sandbox 2026-06-20 — Task 1 selesai, mulai dari Task 2**

---

## Prasyarat Sebelum Mulai

1. **API contract sudah terkonfirmasi** — ada di spec dan `docs/implementation-notes.md` section "Sprint 11"
2. `npm run build` dan `npm run typecheck` harus exit 0 sebelum mulai
3. Tidak ada dirty file dari agent lain di `src/couriers/sap-express/`
4. Baca spec `2026-06-20-sap-express-integration-design.md` dan `implementation-notes.md` Sprint 11 section SEBELUM coding

---

## Task 1 — Research API Contract (SELESAI)

**Status: Dikonfirmasi via sandbox testing 2026-06-20 oleh Claude Code.**

Semua data sudah ada di:
- Spec: `docs/superpowers/specs/2026-06-20-sap-express-integration-design.md` (section 4-8)
- Notes: `docs/implementation-notes.md` section "Sprint 11 SAP Express — Sandbox Test Results"

Codex: **SKIP Task 1, langsung ke Task 2.**

---

## Task 2 — Definisikan Types (`sap-express.types.ts`)

**File yang disentuh:** `src/couriers/sap-express/sap-express.types.ts` (buat baru)

**Langkah:**
1. Buat file `sap-express.types.ts`
2. Definisikan interface berdasarkan API contract yang sudah dikonfirmasi di Task 1:
   - `SapTariffItem` — satu item layanan dari response tariff
   - `SapTariffResponse` — response lengkap dari endpoint tariff
   - `SapBookingResult` — response dari endpoint booking/AWB
   - `SapTrackEvent` — satu event tracking
   - `SapTrackResponse` — response lengkap dari endpoint tracking
3. Gunakan optional fields (`?`) untuk field yang tidak selalu ada
4. Pola: lihat `src/couriers/jne/jne.types.ts` sebagai referensi struktur

**Validasi:** `npm run typecheck` exit 0

---

## Task 3 — Tambahkan Env Vars

**File yang disentuh:**
- `src/config/env.ts`
- `.env.example`

**Langkah:**
1. Tambahkan semua `SAP_*` vars ke `envSchema` Zod di `src/config/env.ts` sebagai `optionalSecret`:
   ```typescript
   SAP_API_BASE_URL: optionalSecret,
   SAP_USERNAME: optionalSecret,
   SAP_API_KEY: optionalSecret,
   SAP_ORIGIN_CODE: optionalSecret,
   SAP_SHIPPER_NAME: optionalSecret,
   SAP_SHIPPER_ADDRESS: optionalSecret,
   SAP_SHIPPER_CITY: optionalSecret,
   SAP_SHIPPER_PHONE: optionalSecret,
   SAP_SHIPPER_ZIP: optionalSecret,
   SAP_WEBHOOK_TOKEN: optionalSecret,
   ```
   Tambahkan `SAP_MODE` jika SAP memiliki environment sandbox/production terpisah.
2. Tambahkan baris yang sama (dengan value kosong `""`) ke `.env.example`
3. Jika `LOGISTICS_PROVIDER` enum perlu diperluas: tambahkan `'sap_express'` ke enum list

**Validasi:** `npm run typecheck` exit 0

---

## Task 4 — Implementasikan HTTP Client (`sap-express.client.ts`)

**File yang disentuh:** `src/couriers/sap-express/sap-express.client.ts` (buat baru)

**Pola wajib diikuti dari `jne.client.ts`:**

```typescript
const DEFAULT_TIMEOUT_MS = 15_000

const SAP_BASE_KEYS = ['SAP_API_BASE_URL', 'SAP_USERNAME', 'SAP_API_KEY'] as const
const SAP_TARIFF_KEYS = [...SAP_BASE_KEYS, 'SAP_ORIGIN_CODE'] as const
const SAP_BOOKING_KEYS = [...SAP_TARIFF_KEYS, 'SAP_SHIPPER_NAME', ...] as const

export class SapExpressClient {
  constructor(private readonly env: Env, private readonly fetcher: typeof fetch = fetch) {}

  assertConfigured(required: readonly (keyof Env)[] = SAP_BOOKING_KEYS): void { ... }

  async tariff(params: { from: string; to: string; weightGrams: number }): Promise<SapTariffResponse> {
    this.assertConfigured(SAP_TARIFF_KEYS)
    // build request sesuai API SAP
    return this.request<SapTariffResponse>(..., { operation: 'tariff', meta: { ... } })
  }

  async bookShipment(params: { ... }): Promise<SapBookingResult> {
    this.assertConfigured()
    // build request sesuai API SAP
    return this.request<SapBookingResult>(..., { operation: 'bookShipment', meta: { ... } })
  }

  async track(waybillId: string): Promise<SapTrackResponse> {
    this.assertConfigured(SAP_BASE_KEYS)
    return this.request<SapTrackResponse>(..., { operation: 'track', meta: { waybillId: redact(waybillId) } })
  }

  private async request<T>(url: string, init: RequestInit, context: RequestContext): Promise<T> {
    // AbortController timeout 15s
    // console.warn('[SAP]', operation, durationMs)
    // throw HttpError(502, ...) untuk HTTP error dan network failure
    // jangan log credential atau payload sensitif
  }
}
```

**Aturan keamanan:**
- Jangan log API key, username, credential, atau alamat penerima lengkap
- Redact waybill ID di log (6 char + `***`)
- Timeout AbortController wajib di setiap request
- Throw `HttpError` yang bersih — jangan expose stack trace atau URL internal ke caller

**Validasi:** `npm run typecheck` exit 0

---

## Task 5 — Lengkapi Adapter (`sap-express.adapter.ts`)

**File yang disentuh:** `src/couriers/sap-express/sap-express.adapter.ts` (modifikasi)

**Langkah:**
1. Ubah konstruktor: `constructor(env: Env, fetcher?: typeof fetch)` + inisialisasi `SapExpressClient`
2. Implementasikan `getRates()`:
   - Panggil `this.client.tariff()`
   - Extract items dari response (handle berbagai struktur: root array, `data[]`, `rates[]`, dll)
   - Map ke `CourierRate[]`
   - Filter `rate.priceIdr > 0`
3. Implementasikan `bookShipment()`:
   - Panggil `this.client.bookShipment()`
   - Extract `waybillId` dari response
   - Throw `HttpError(502, 'SAP booking did not return waybill', 'SAP_BOOKING_INVALID_RESPONSE')` jika tidak ada
   - Return `BookShipmentResult`
4. Implementasikan `trackShipment()`:
   - Panggil `this.client.track(waybillId)`
   - Map history/events ke `NormalizedTrackingEvent[]` dengan `mapSapExpressStatus()`
5. Update `normalizeWebhook()`:
   - Verifikasi field names sesuai webhook SAP nyata
   - Update jika field names berbeda dari yang ada di skeleton

**Validasi:** `npm run typecheck` exit 0

---

## Task 6 — Update Status Capabilities

**File yang disentuh:** `src/couriers/capabilities.ts`

**Langkah:**
1. Ubah `SAP_EXPRESS` entry:
   - `implementationStatus: 'ACTIVE'`
   - `supportsRates: true`
   - `supportsBooking: true`
   - `supportsTracking: true`
   - `destinationCodeFormat`: isi dengan format kode tujuan SAP yang dikonfirmasi
   - `notes`: deskripsi faktual berdasarkan API SAP nyata

**Validasi:** `npm run typecheck` exit 0

---

## Task 7 — Daftarkan ke Provider Registry

**File yang disentuh:** lokasi inisialisasi `ProviderRegistry` (cek `app.ts` atau `server.ts`)

**Langkah:**
1. Temukan tempat `ProviderRegistry` diinisialisasi
2. Import `SapExpressAdapter`
3. Tambahkan `new SapExpressAdapter(env)` ke list provider

**Validasi:** `npm run typecheck && npm run build` exit 0

---

## Task 8 — Buat Webhook Handler SAP Express

**File yang disentuh:** `src/routes/webhooks/sap-express.ts` (buat baru atau tambah ke file webhooks yang ada)

**Langkah:**
1. Buat route `POST /webhooks/sap-express`
2. Validasi token: cek `SAP_WEBHOOK_TOKEN` (timing-safe compare seperti pola di handler JNE)
3. Panggil `sapAdapter.normalizeWebhook(rawPayload)`
4. Simpan ke `WebhookEvent` table dengan idempotency key unik
5. Enqueue ke relay worker
6. Return `204` setelah proses berhasil, `401` jika token salah

**Pola:** lihat handler webhook JNE yang sudah ada sebagai referensi

**Validasi:** `npm run typecheck && npm run build` exit 0

---

## Task 9 — Unit Tests

**File yang disentuh:** buat `src/couriers/sap-express/sap-express.normalizer.test.ts` dan `src/couriers/sap-express/sap-express.adapter.test.ts`

**Yang harus ditest:**

### `sap-express.normalizer.test.ts`
```typescript
// Semua status mapping — pastikan sesuai nilai API SAP nyata
test('DELIVERED mapping')
test('IN_TRANSIT mapping')
test('OUT_FOR_DELIVERY mapping')
test('RETURNED mapping')
test('FAILED mapping')
test('BOOKED mapping')
test('unknown string → IN_TRANSIT')
test('empty/undefined → IN_TRANSIT')
```

### `sap-express.adapter.test.ts`
```typescript
// Unit test dengan fetcher mock — tanpa network call
test('getRates: returns normalized CourierRate array')
test('getRates: filters out zero-price rates')
test('getRates: throws 503 if env not configured')
test('bookShipment: returns BookShipmentResult with waybillId')
test('bookShipment: throws 502 if response missing waybill')
test('trackShipment: returns NormalizedTrackingEvent array')
test('normalizeWebhook: returns event for valid payload')
test('normalizeWebhook: returns null for invalid payload')
```

**Pola fetcher mock:**
```typescript
const mockFetcher = async (_url: string, _init: RequestInit) => ({
  ok: true,
  status: 200,
  json: async () => ({ /* response SAP yang dimock */ }),
} as Response)

const adapter = new SapExpressAdapter(mockEnv, mockFetcher)
```

**Validasi:** `npm run test` exit 0, coverage > 80% untuk files yang baru dibuat

---

## Task 10 — Smoke Test dan Validasi Final

**Langkah:**
1. `npm run lint` — exit 0
2. `npm run typecheck` — exit 0
3. `npm run build` — exit 0
4. `npm run test` — semua pass
5. Jika credential sandbox tersedia:
   - Jalankan tariff smoke: cek ongkir dari origin ke satu tujuan
   - Catat hasil di `docs/implementation-notes.md`
   - Jangan jalankan booking nyata tanpa approval eksplisit dari user
6. Update `CLAUDE.md` Sprint Status: tambahkan entry SAP Express integration selesai

---

## Urutan Eksekusi

```
Task 1 (research API) → Task 2 (types) → Task 3 (env vars) → Task 4 (client)
→ Task 5 (adapter) → Task 6 (capabilities) → Task 7 (registry)
→ Task 8 (webhook) → Task 9 (tests) → Task 10 (final validation)
```

Jangan loncat task. Setiap task harus `typecheck` exit 0 sebelum lanjut.

---

## Larangan Selama Implementasi

- Jangan jalankan booking/resi SAP nyata tanpa approval user
- Jangan commit credential SAP ke tracked file
- Jangan edit file di luar `src/couriers/sap-express/`, `src/config/env.ts`, `.env.example`, dan routes webhook
- Jangan skip `assertConfigured()` — ini yang membuat error message jelas saat credential tidak ada
- Jangan ubah interface `LogisticsProvider` atau `RateParams`/`BookShipmentParams` — harus backward compatible
