# Logistics Admin Config MVP — Design Spec

**Tanggal:** 2026-06-18
**Status:** Draft
**Author:** Agent + User

---

## 1. Overview

Sprint 7 mengubah arah `teknos-logistics` dari sekadar API adapter menjadi fondasi platform logistik mirip Biteship untuk Teknos. Fitur ini membangun Admin Config MVP agar konfigurasi merchant, toko/cabang/origin, courier service, API key, webhook endpoint, dan shipment visibility berada di `teknos-logistics`, bukan di parent `teknos.id`.

Prinsip utama: `teknos.id` mengelola commerce; `teknos-logistics` mengelola operasional logistik. Parent web hanya menerima kontrak sederhana berupa API URL/key, feature flag, rates, shipment summary, tracking status, dan webhook update.

## 2. Goals & Non-Goals

### Goals
- Menyediakan data model untuk merchant, store/branch, origin, courier service configuration, dan aturan service yang aktif.
- Menyediakan admin API internal untuk membaca/mengelola merchant, store/branch/origin, API key, webhook endpoint, dan courier service configuration.
- Menjaga semua credential/config courier tetap server-side di `teknos-logistics`.
- Menyediakan shipment/relay visibility read-only untuk operasional awal.
- Menyiapkan fondasi dashboard admin web pada sprint berikutnya tanpa memindahkan logic ke `teknos.id`.

### Non-Goals
- Membangun UI dashboard penuh — Sprint 7 fokus API/config foundation; UI bisa menyusul setelah kontrak stabil.
- Mengubah parent `teknos.id` — parent tetap read-only dan future integration task terpisah.
- Membuat real JNE AWB/resi dari Codex — tetap membutuhkan approval eksplisit operator.
- Billing/invoice merchant — masuk Sprint 10.
- Multi-courier production penuh untuk JNT/SAP — Sprint 7 hanya menyiapkan config model dan service catalog foundation.
- Menyimpan credential courier mentah di response API — tidak boleh ditampilkan ke client/admin response.

## 3. User Stories

- Sebagai operator logistics, saya ingin membuat merchant dan API key agar aplikasi seperti `teknos.id` bisa memakai layanan logistik tanpa menyimpan credential courier.
- Sebagai operator logistics, saya ingin mengatur toko/cabang/origin agar ongkir dan booking memakai titik asal yang benar.
- Sebagai operator logistics, saya ingin mengaktifkan/menonaktifkan layanan courier per merchant atau origin agar checkout hanya menampilkan service yang valid.
- Sebagai operator logistics, saya ingin melihat shipment dan relay attempts agar bisa memantau lifecycle pengiriman dan masalah webhook.
- Sebagai developer parent app, saya ingin hanya memakai API key dan kontrak sederhana agar parent tidak perlu tahu detail JNE/JNT/SAP.

## 4. Technical Design

### 4.1 Data Model

Perubahan schema yang diusulkan:

```prisma
enum CourierServiceStatus {
  ACTIVE
  INACTIVE
}

model Merchant {
  // existing fields
  stores Store[]
  courierServices MerchantCourierService[]
}

model Store {
  id         String   @id @default(cuid())
  merchantId String
  slug       String
  name       String
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  merchant Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  origins  Origin[]

  @@unique([merchantId, slug])
  @@index([merchantId, isActive])
}

model Origin {
  id          String   @id @default(cuid())
  merchantId  String
  storeId     String?
  code        String
  name        String
  address     String?
  city        String?
  province    String?
  postalCode  String?
  phone       String?
  isDefault   Boolean  @default(false)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  merchant Merchant @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  store    Store?   @relation(fields: [storeId], references: [id], onDelete: SetNull)

  @@unique([merchantId, code])
  @@index([merchantId, isActive])
  @@index([storeId, isActive])
}

model CourierService {
  id          String               @id @default(cuid())
  courier     CourierCode
  serviceCode String
  serviceName String
  status      CourierServiceStatus @default(ACTIVE)
  metadata    Json?
  createdAt   DateTime             @default(now())
  updatedAt   DateTime             @updatedAt

  merchants MerchantCourierService[]

  @@unique([courier, serviceCode])
  @@index([courier, status])
}

model MerchantCourierService {
  id               String               @id @default(cuid())
  merchantId       String
  courierServiceId String
  originId         String?
  status           CourierServiceStatus @default(ACTIVE)
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  merchant       Merchant       @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  courierService CourierService @relation(fields: [courierServiceId], references: [id], onDelete: Cascade)
  origin         Origin?        @relation(fields: [originId], references: [id], onDelete: Cascade)

  @@unique([merchantId, courierServiceId, originId])
  @@index([merchantId, status])
}
```

Catatan migrasi:
- `Origin.isDefault` perlu invariant satu default aktif per merchant; Prisma tidak bisa partial unique lintas semua DB secara portable, jadi enforce di service transaction.
- Credential courier tetap lewat env/server config untuk MVP, bukan tabel credential editable.

### 4.2 API / Route Contract

Admin API internal menggunakan namespace `/admin/*` dan auth admin server-side.

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/admin/merchants` | Admin JWT | Query `status?` | `{ merchants: MerchantAdminDto[] }` |
| POST | `/admin/merchants` | Admin JWT | `{ slug, name }` | `{ merchant }` |
| GET | `/admin/merchants/:merchantId/api-keys` | Admin JWT | - | `{ apiKeys }` tanpa hash/plaintext |
| POST | `/admin/merchants/:merchantId/api-keys` | Admin JWT | `{ label?, expiresAt? }` | `{ apiKey, plaintext }` plaintext tampil sekali |
| GET | `/admin/merchants/:merchantId/webhook-endpoints` | Admin JWT | - | `{ endpoints }` tanpa secret |
| POST | `/admin/merchants/:merchantId/webhook-endpoints` | Admin JWT | `{ url, secret }` | `{ endpoint }` secret tidak dikembalikan |
| GET | `/admin/merchants/:merchantId/stores` | Admin JWT | - | `{ stores }` |
| POST | `/admin/merchants/:merchantId/stores` | Admin JWT | `{ slug, name }` | `{ store }` |
| GET | `/admin/merchants/:merchantId/origins` | Admin JWT | Query `storeId?` | `{ origins }` |
| POST | `/admin/merchants/:merchantId/origins` | Admin JWT | origin fields | `{ origin }` |
| PATCH | `/admin/origins/:originId` | Admin JWT | partial origin fields | `{ origin }` |
| GET | `/admin/courier-services` | Admin JWT | Query `courier?` | `{ services }` |
| POST | `/admin/courier-services` | Admin JWT | `{ courier, serviceCode, serviceName, metadata? }` | `{ service }` |
| PATCH | `/admin/courier-services/:id` | Admin JWT | `{ status?, serviceName?, metadata? }` | `{ service }` |
| GET | `/admin/merchants/:merchantId/courier-services` | Admin JWT | - | `{ services }` |
| PUT | `/admin/merchants/:merchantId/courier-services/:serviceId` | Admin JWT | `{ originId?, status }` | `{ service }` |
| GET | `/admin/shipments` | Admin JWT | filters | `{ shipments, pageInfo }` |
| GET | `/admin/webhook-relays` | Admin JWT | filters | `{ attempts, pageInfo }` |

Public merchant API `/v1/*` tetap sama untuk Sprint 7, tetapi service config akan menjadi dasar filtering rates pada sprint lanjutan.

### 4.3 Business Logic

- Admin endpoints wajib dilindungi `ADMIN_JWT_SECRET`; tidak ada mutation admin tanpa auth.
- API key creation tetap menyimpan hash SHA-256 dan prefix; plaintext dikembalikan sekali.
- Webhook endpoint secret boleh diterima dari admin, tetapi tidak pernah dikembalikan dalam response.
- Store/branch adalah grouping operasional; origin adalah titik asal pengiriman yang dipakai rates/booking.
- Satu merchant boleh punya banyak store dan origin.
- Default origin per merchant harus dijaga oleh transaction service.
- Courier service catalog global mendefinisikan layanan yang didukung platform.
- Merchant courier service menentukan layanan mana yang aktif per merchant dan opsional per origin.
- Shipment visibility admin read-only untuk Sprint 7; mutation shipment lifecycle tetap lewat booking/webhook service.
- Parent `teknos.id` tidak menerima config detail ini; parent hanya consume merchant API contract.

### 4.4 UI / UX

Tidak ada UI dashboard penuh di scope Sprint 7. Namun API dirancang untuk dashboard berikut:

- Merchant list/detail.
- API key list/create/revoke.
- Webhook endpoint list/create/disable.
- Store/branch list.
- Origin list and default origin management.
- Courier service catalog.
- Merchant-enabled services.
- Shipment and relay attempt visibility.

## 5. Security Considerations

- [ ] Admin auth wajib untuk semua `/admin/*` endpoints.
- [ ] Semua input admin divalidasi Zod sebelum repository/service.
- [ ] Secret/API key/hash tidak pernah muncul di logs atau response kecuali plaintext API key sekali saat create.
- [ ] DB writes hanya lewat repository layer.
- [ ] Admin mutation tidak boleh memakai GET.
- [ ] URL webhook endpoint divalidasi; production sebaiknya hanya `https://` kecuali local dev.
- [ ] Shipment visibility harus menghindari PII berlebihan; recipient address/phone perlu dipertimbangkan apakah tampil di list atau detail saja.
- [ ] Audit log belum masuk Sprint 7 penuh; minimal created/updated metadata tersedia.
- [ ] Tidak membuat real JNE AWB/resi selama implementasi/config testing tanpa approval.

## 6. Testing Strategy

- **Unit tests:** utility admin auth, DTO mapping, default-origin transaction rule, API key hashing/prefix behavior.
- **Integration tests:** admin merchant/store/origin/courier service CRUD dengan app fetch dan DB test/staging.
- **Smoke tests:** admin config smoke non-JNE untuk create merchant/store/origin/service assignment dan list visibility.
- **Manual QA:** jalankan admin flow di staging dengan mock provider; verifikasi parent handoff tetap simple.

## 7. Migration & Rollback

- Migration menambah tabel baru; tidak mengubah data shipment existing secara destruktif.
- Rollback production memakai forward migration untuk disable fitur/admin routes jika perlu.
- Jika migration gagal, hentikan Sprint 7 dan jangan lanjut ke endpoint admin.
- Feature flag/env admin dapat menonaktifkan admin API bila diperlukan.

## 8. Open Questions

- [ ] Apakah admin auth cukup JWT HttpOnly/API Bearer internal untuk MVP, atau perlu integrasi user admin sejak awal?
- [ ] Apakah origin code akan memakai kode JNE langsung atau abstraction internal yang dipetakan per courier?
- [ ] Apakah store/branch dimiliki merchant tunggal saja, atau nanti perlu company/group di atas merchant?
- [ ] Apakah webhook endpoint secret perlu rotate flow di Sprint 7 atau cukup create/disable?
- [ ] Apakah shipment admin list boleh menampilkan recipient phone/address atau perlu masking?

## 9. Dependencies

- Tidak ada package baru yang direncanakan untuk Sprint 7.
- Prisma migration baru dibutuhkan.
- Supabase/Postgres credential dan tunnel harus valid sebelum migration/smoke DB.
- JNE credential tidak dibutuhkan untuk Sprint 7 admin config MVP jika memakai mock/non-mutating flows.

---

## Referensi

- `docs/ROADMAP.md`
- `docs/SPRINT_6_CONTRACT_RUNBOOK.md`
- `docs/TEKNOS_ID_HANDOFF.md`
- `CLAUDE.md` — Commerce vs Logistics Ownership
