# Codex Session Brief — teknos-logistics Sprint 11B → 13

Date: 2026-06-20
Status: Siap dieksekusi Codex
Author: Claude Code architecture review

---

## Siapa Kamu dan Apa Ini

Kamu adalah Codex yang bekerja di repo `teknos-logistics` — platform agregator
logistik internal Teknos. Stack: Hono + Prisma + Node.js 22+ + TypeScript strict.
Repo ini adalah git repo TERPISAH, nested di `C:\NEXT\teknos.id\teknos-logistics\`.
Jangan edit file di luar folder ini kecuali diminta eksplisit.

Branch aktif: `feature/bootstrap-logistics-platform`
Commit terakhir: `798f341` — Supabase admin auth foundation + SAP Express scaffolding

Baca `CLAUDE.md` dan `docs/ROADMAP.md` sebagai orientasi pertama sebelum menyentuh
kode apapun.

---

## State Saat Ini — Sprint

| Sprint | Topik | Status |
|---|---|---|
| Sprint 0–10 | Foundation, JNE, webhook relay, admin config, admin UI, multi-courier | ✅ Done |
| Sprint 11A | Supabase Admin Auth Foundation | 🔄 Perlu diverifikasi |
| Sprint 11B | SAP Express full integration | 📋 Kamu kerjakan ini |
| Sprint 12 | OriginMapping per-kurir | 📋 Kamu kerjakan ini setelah 11B |
| Sprint 13 | Destination Mapping data import | 📋 Kamu kerjakan ini setelah 12 |
| Sprint 6 | teknos.id integration handoff | 📋 Final setelah semua siap |

---

## LANGKAH 0 — Verifikasi Dulu Sebelum Coding

Jalankan ini pertama, baca outputnya, pastikan semua exit 0:

```bash
git status --short --branch
npm run typecheck
npm run lint
npm run build
npm run test
npx tsx scripts/sprint11a-readiness.ts
```

Jika ada yang fail → perbaiki dulu, commit, baru lanjut ke Sprint 11B.
Jangan bawa error ke sprint berikutnya.

---

## LANGKAH 1 — Sprint 11B: SAP Express Full Integration

Baca SEBELUM coding:
- `docs/superpowers/specs/2026-06-20-sap-express-integration-design.md`
- `docs/superpowers/plans/2026-06-20-sap-express-integration.md`
- `docs/implementation-notes.md` (section "Sprint 11 SAP Express")

### File yang sudah selesai — JANGAN disentuh atau di-overwrite

```
src/couriers/sap-express/sap-express.types.ts      ✅ lengkap dari PDF + sandbox
src/couriers/sap-express/sap-express.normalizer.ts ✅ 17 status mapping confirmed
```

### File yang perlu dikerjakan

```
src/couriers/sap-express/sap-express.client.ts     ← buat baru
src/couriers/sap-express/sap-express.adapter.ts    ← masih skeleton 501, implementasikan
```

---

### Task 3 — Env Vars

File: `src/config/env.ts` dan `.env.example`

Tambahkan ke envSchema Zod (semua optional):

```typescript
SAP_API_BASE_URL: optionalSecret,
SAP_TRACKING_BASE_URL: optionalSecret,
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

Validasi: `npm run typecheck` exit 0

---

### Task 4 — HTTP Client (`sap-express.client.ts`)

Ikuti pola `src/couriers/jne/jne.client.ts`. Perbedaan kritis SAP vs JNE:

| Aspek | JNE | SAP Express |
|---|---|---|
| Auth | form body | header `api_key` |
| Content-Type | `application/x-www-form-urlencoded` | `application/json` (lowercase j) |
| Body format | form-urlencoded | JSON |
| Tracking host | sama dengan API | `SAP_TRACKING_BASE_URL ?? SAP_API_BASE_URL` |

Aturan keamanan:
- Timeout AbortController 15 detik wajib per request
- Jangan log API key, username, atau full alamat penerima
- Redact waybill di log: `waybillId.slice(0, 6) + '***'`
- Throw `HttpError` yang bersih, jangan expose URL internal

Endpoint:

```typescript
// Rates → POST /v2/master/shipment_cost
tariff(params: { from: string; to: string; weightGrams: number })

// Booking → POST /v2/shipment/pickup/create
bookShipment(params: BookParams)

// Tracking → GET /v2/shipment/tracking?awb_no={waybillId}
track(waybillId: string)
```

Field booking yang wajib ada (dikonfirmasi dari sandbox):

```json
{
  "reference_no": "<externalOrderId>",
  "service_type_code": "<serviceCode>",
  "shipper_name": "env.SAP_SHIPPER_NAME",
  "shipper_phone": "env.SAP_SHIPPER_PHONE",
  "shipper_address": "env.SAP_SHIPPER_ADDRESS",
  "shipper_city": "env.SAP_SHIPPER_CITY",
  "shipper_zip": "env.SAP_SHIPPER_ZIP",
  "receiver_name": "params.recipientName",
  "receiver_phone": "params.recipientPhone",
  "receiver_address": "params.recipientAddress",
  "receiver_city": "params.recipientCity",
  "receiver_zip": "params.recipientPostalCode",
  "destination_code": "params.destCode",
  "kilo": "Math.max(1, Math.ceil(params.weightGrams / 1000))",
  "pickup_contact": "env.SAP_SHIPPER_NAME",
  "item_name": "Paket",
  "total_cost": "params.goodsValueIdr"
}
```

Cancel endpoint — dokumentasi saja, JANGAN implementasikan:
- Field benar: `desc` + `reason_detail_code`
- BUKAN `description` atau `reason_code` (dikonfirmasi PDF hal. 20)

Validasi: `npm run typecheck` exit 0

---

### Task 5 — Adapter (`sap-express.adapter.ts`)

**getRates():**
```typescript
// priceIdr wajib Number() karena API bisa return string atau number
priceIdr: Number(s.total_cost)
// filter
.filter(r => r.priceIdr > 0)
```

**bookShipment():**
- AWB ada di `data.awb_no` (bukan `detail[0].cnote_no` seperti JNE)
- Throw `HttpError(502, 'SAP booking did not return waybill', 'SAP_BOOKING_INVALID_RESPONSE')` jika kosong

**trackShipment():**
- Response SAP adalah ARRAY semua historical events (bukan objek tunggal seperti JNE)
- Field status: `rowstate_name` — bisa ada trailing space, normalizer sudah handle `.trim()`
- Map semua events ke `NormalizedTrackingEvent[]`

**normalizeWebhook():**
- Ambil waybillId dari `cnote_no` atau `awb_no`
- Return null jika payload tidak valid

Validasi: `npm run typecheck` exit 0

---

### Task 6 — Update Capabilities

File: `src/couriers/capabilities.ts`

```typescript
SAP_EXPRESS: {
  implementationStatus: 'ACTIVE',
  supportsRates: true,
  supportsBooking: true,
  supportsTracking: true,
  supportsWebhook: true,
  destinationCodeFormat: 'SAP district code (contoh: JI1609)',
}
```

---

### Task 7 — Provider Registry

Temukan tempat `ProviderRegistry` diinisialisasi (cek `src/app.ts`).
Tambahkan `new SapExpressAdapter(env)`.

Validasi: `npm run typecheck && npm run build` exit 0

---

### Task 8 — Webhook Handler

Buat atau tambahkan route `POST /webhooks/sap-express`:

```
1. Baca SAP_WEBHOOK_TOKEN dari env
2. Timing-safe compare token dari request
3. Return 401 jika tidak match
4. Panggil sapAdapter.normalizeWebhook(rawPayload)
5. Simpan ke WebhookEvent dengan idempotency key unik
6. Enqueue ke relay worker
7. Return 204
```

Ikuti pola webhook JNE yang sudah ada.

Validasi: `npm run typecheck && npm run build` exit 0

---

### Task 9 — Unit Tests

Buat:
- `src/couriers/sap-express/sap-express.normalizer.test.ts`
- `src/couriers/sap-express/sap-express.adapter.test.ts`

Mock fetcher pattern:

```typescript
const mockFetcher = async (_url: string, _init: RequestInit) => ({
  ok: true,
  status: 200,
  json: async () => ({ /* SAP mock response */ }),
} as Response)
const adapter = new SapExpressAdapter(mockEnv, mockFetcher)
```

Test cases wajib:
- getRates: return CourierRate array
- getRates: filter zero-price
- getRates: Number() coercion untuk string cost
- getRates: throw jika env tidak dikonfigurasi
- bookShipment: return result dengan waybillId dari `data.awb_no`
- bookShipment: throw 502 jika awb_no kosong
- trackShipment: map array events ke NormalizedTrackingEvent[]
- normalizeWebhook: return event untuk payload valid
- normalizeWebhook: return null untuk payload invalid
- Semua 17 status mapping di normalizer
- trailing space di rowstate_name → di-trim dengan benar

Validasi: `npm run test` exit 0, coverage >80% untuk file baru.

---

### Task 10 — Final Sprint 11B Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run test
```

Semua harus exit 0. Update `CLAUDE.md` sprint status.
JANGAN jalankan booking nyata tanpa approval eksplisit dari user.

---

## LANGKAH 2 — Sprint 12: OriginMapping (BLOCKER rates nyata)

Detail lengkap: `docs/implementation-notes.md` §"Gap: Per-Courier Origin Code Resolution"
dan `docs/superpowers/specs/2026-06-20-sap-express-integration-design.md` §4b.

### Masalah

`DestinationResolutionService.resolveRates()` baris 37 meneruskan `origin.code`
(`"origin_mojokerto_main"`) langsung ke semua adapter sebagai `params.originCode`.
JNE butuh `"MJK10008"`, SAP Express butuh district code berbeda.
Tidak ada resolusi per-kurir untuk sisi asal. Ini menyebabkan rates gagal
untuk semua kurir nyata.

### Solusi

**1. Tambah model ke `prisma/schema.prisma`:**

```prisma
model OriginMapping {
  id           String      @id @default(cuid())
  merchantId   String
  originId     String
  courier      CourierCode
  providerCode String
  label        String?
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  merchant Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  origin   Origin   @relation(fields: [originId], references: [id], onDelete: Cascade)

  @@unique([originId, courier])
  @@index([merchantId, courier, isActive])
}
```

Tambahkan relasi balik `originMappings OriginMapping[]` di model `Origin` dan `Merchant`.

**2. Buat migration:**

```bash
npx prisma migrate dev --name add_origin_mapping
```

**3. Tambah method ke `src/repositories/destination-mapping.repository.ts`:**

```typescript
async resolveOriginCode(
  merchantId: string,
  originId: string,
  courier: CourierCode,
): Promise<string | null> {
  const mapping = await this.prisma.originMapping.findFirst({
    where: { originId, merchantId, courier, isActive: true },
    select: { providerCode: true },
  })
  return mapping?.providerCode ?? null
}
```

**4. Update `src/services/destination-resolution.service.ts`:**

Dalam `resolveRates()`, sebelum memanggil `rates.getRates()`, lookup per-kurir:

```typescript
const originCode = await this.mappings.resolveOriginCode(merchantId, origin.id, courier)
if (!originCode) {
  throw new HttpError(422, `Origin mapping not found for ${courier}`, 'ORIGIN_MAPPING_NOT_FOUND')
}
// gunakan originCode sebagai origin_code di getRates call
```

**5. Buat script `scripts/upsert-origin-mappings.ts` (idempotent):**

Origin Mojokerto ID: `cmqls4voj00001cv4dviz9f7l`

```typescript
// JNE Mojokerto
{ originId, courier: 'JNE', providerCode: 'MJK10008', label: 'JNE Mojokerto' }

// SAP Express — konfirmasi dari tim IT SAP dulu, seed placeholder
{ originId, courier: 'SAP_EXPRESS', providerCode: 'TBD_FROM_SAP_IT', label: 'SAP Mojokerto' }
```

**6. Tambah admin endpoint:**

`POST /admin/merchants/:merchantId/origins/:originId/mappings`

Agar operator bisa set providerCode per kurir dari admin UI.

Validasi: `npm run test && npm run build` exit 0

---

## LANGKAH 3 — Sprint 13: Destination Mapping Data Import

Sprint ini adalah import data, bukan coding fitur baru.

File data JNE sudah ada di repo:
`docs/Docs API JNE/Live doc/suport file/list_dest.xlsx`

Yang dikerjakan:

1. Buat script `scripts/import-jne-destinations.ts`:
   - Baca `list_dest.xlsx`
   - Upsert ke tabel `DestinationMapping` dengan fields:
     `courier: 'JNE', postalCode, city, province, district, providerCode`
   - Idempotent — aman dijalankan ulang
   - Log progress per 100 baris

2. Untuk SAP Express: data kode tujuan belum tersedia, tunggu dari tim IT SAP

3. Jalankan import, verifikasi minimal 1000 baris berhasil:
   ```bash
   npx tsx scripts/import-jne-destinations.ts
   ```

4. Smoke test setelah import:
   `POST /v1/rates/resolve` dengan alamat Mojokerto harus return rates JNE nyata
   (bukan `DESTINATION_MAPPING_NOT_FOUND`)

---

## ATURAN WAJIB

- Jangan jalankan booking/resi nyata (JNE generatecnote, SAP pickup create)
  tanpa approval eksplisit dari user
- Jangan commit credential, API key, atau secret apapun ke tracked file
- Jangan edit `sap-express.types.ts` atau `sap-express.normalizer.ts`
- Jangan ubah interface `LogisticsProvider`, `RateParams`, `BookShipmentParams`
- Setiap task harus `typecheck` exit 0 sebelum lanjut ke task berikutnya
- Jangan loncat task, kerjakan berurutan
- Jangan push ke origin tanpa konfirmasi user

---

## FILE REFERENSI UTAMA

| File | Kegunaan |
|---|---|
| `docs/superpowers/specs/2026-06-20-sap-express-integration-design.md` | Spec SAP Express lengkap |
| `docs/superpowers/plans/2026-06-20-sap-express-integration.md` | Task list SAP Express |
| `docs/implementation-notes.md` | API contract + gap notes |
| `src/couriers/jne/jne.adapter.ts` | Pola adapter yang diikuti |
| `src/couriers/jne/jne.client.ts` | Pola client yang diikuti |
| `src/services/destination-resolution.service.ts` | Service yang diupdate Sprint 12 |
| `src/repositories/destination-mapping.repository.ts` | Repo yang diextend Sprint 12 |
| `docs/ROADMAP.md` | Gambaran besar sprint dan ownership |

---

## URUTAN EKSEKUSI

```
LANGKAH 0 — Verifikasi build bersih + sprint11a-readiness
     ↓
LANGKAH 1 — Sprint 11B Tasks 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
     ↓
LANGKAH 2 — Sprint 12 OriginMapping (schema + seed + service update)
     ↓
LANGKAH 3 — Sprint 13 JNE destination data import
     ↓
Laporkan ke user: semua pass, siap Sprint 6 (teknos.id integration)
```

Mulai dari Langkah 0. Laporkan hasil setiap langkah sebelum lanjut ke berikutnya.
