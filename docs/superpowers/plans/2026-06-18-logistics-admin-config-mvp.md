# Logistics Admin Config MVP — Implementation Plan

**Tanggal:** 2026-06-18
**Spec:** `docs/superpowers/specs/2026-06-18-logistics-admin-config-mvp-design.md`
**Status:** Done - implemented, migrated, validated, and documented on 2026-06-19

---

## Scope Summary

- Menambahkan fondasi data model untuk merchant store/branch, origin, courier service catalog, dan merchant service assignment.
- Menambahkan admin API internal yang aman untuk konfigurasi merchant, API key, webhook endpoint, store/origin, courier service, shipment visibility, dan relay visibility.
- Menjaga parent `teknos.id` tetap simple/read-only dari sisi sprint ini; semua operasi logistik berada di `teknos-logistics`.
- Menambahkan smoke/readiness command Sprint 7 yang non-JNE dan tidak membuat AWB/resi nyata.

## Task Breakdown

### Task 1: Add Admin Config Schema Migration

**Files:**
- `[MODIFY] prisma/schema.prisma` — tambah enum/model `Store`, `Origin`, `CourierService`, `MerchantCourierService`, relation ke `Merchant`.
- `[NEW] prisma/migrations/YYYYMMDDHHMMSS_add_admin_config_models/migration.sql` — migration tabel/index baru.
- `[MODIFY] docs/implementation-notes.md` — catat migration dan status deploy.
- `[MODIFY] CLAUDE.md` — catat migration di status/keputusan arsitektur.
- `[MODIFY] AGENTS.md` — catat koordinasi DB/tunnel/migration.

**Detail:**
- Tambahkan schema sesuai spec tanpa mengubah tabel shipment existing secara destruktif.
- Pastikan `@@unique` untuk `[merchantId, slug]`, `[merchantId, code]`, `[courier, serviceCode]`, dan `[merchantId, courierServiceId, originId]`.
- Jangan simpan credential courier di model baru.
- Buat migration dengan Prisma; jangan edit migration yang sudah deployed.

**Validation:**
```bash
npx prisma validate
npx prisma generate
npm run typecheck
```

**Codex Agent:** database-reviewer setelah schema siap.
**Depends on:** none
**Suggested commit:** `feat(admin): add logistics config schema`

---

### Task 2: Add Admin Auth and DTO Schemas

**Files:**
- `[NEW] src/middleware/admin-auth.ts` — middleware Bearer/JWT admin MVP berbasis `ADMIN_JWT_SECRET`.
- `[NEW] src/schemas/admin.ts` — Zod schemas untuk merchant, store, origin, courier service, API key, webhook endpoint, list filters.
- `[MODIFY] src/config/env.ts` — pastikan admin secret requirement untuk production jelas.
- `[MODIFY] src/utils/http-error.ts` — gunakan error sanitization existing bila perlu tanpa membocorkan internals.
- `[MODIFY] docs/SECURITY_REVIEW_PROMPTS.md` — tambahkan prompt review admin auth jika relevan.

**Detail:**
- Semua `/admin/*` harus reject jika secret kosong pada production.
- Validasi input URL webhook; untuk production prefer `https://`.
- Jangan return secret/hash dari schema response.
- Jika JWT belum matang, MVP boleh pakai `Authorization: Bearer <ADMIN_JWT_SECRET>` sebagai internal admin token sementara dan terdokumentasi sebagai deferred hardening.

**Validation:**
```bash
npm run lint
npm run typecheck
```

**Codex Agent:** security-reviewer untuk auth/admin surface.
**Depends on:** Task 1 dapat paralel secara terbatas, tetapi final compile setelah Task 1.
**Suggested commit:** `feat(admin): add admin auth schemas`

---

### Task 3: Add Admin Repositories

**Files:**
- `[NEW] src/repositories/admin-config.repository.ts` — CRUD merchant/store/origin/courier service/assignment.
- `[MODIFY] src/repositories/merchant.repository.ts` — tambahkan admin-safe list/create/api-key helpers jika belum cukup.
- `[MODIFY] src/repositories/webhook.repository.ts` — tambahkan admin list endpoint helpers untuk webhook endpoints/relay attempts.
- `[MODIFY] src/repositories/shipment.repository.ts` — tambahkan admin shipment list/detail read-only helpers.

**Detail:**
- Semua Prisma access tetap di repository layer.
- Implement default origin update dalam transaction agar satu merchant tidak punya default ganda.
- Select fields harus aman: jangan select `keyHash`, webhook `secret`, atau raw secret-like values untuk list responses.
- Pagination limit default dan max limit wajib.

**Validation:**
```bash
npm run lint
npm run typecheck
```

**Codex Agent:** database-reviewer setelah repository queries siap.
**Depends on:** Task 1
**Suggested commit:** `feat(admin): add config repositories`

---

### Task 4: Add Admin Services

**Files:**
- `[NEW] src/services/admin-config.service.ts` — business rules merchant/store/origin/service assignment.
- `[NEW] src/services/admin-api-key.service.ts` — create/list/revoke API key admin flow dengan plaintext once.
- `[NEW] src/services/admin-visibility.service.ts` — shipment/relay read-only DTO mapping.
- `[MODIFY] src/utils/crypto.ts` — reuse/generate API key helpers bila perlu.

**Detail:**
- Centralize DTO mapping agar route tidak expose internal fields.
- API key create harus menyimpan hash dan prefix; plaintext hanya dikembalikan pada create.
- Webhook endpoint create harus menerima secret tetapi response tidak mengembalikan secret.
- Shipment/relay visibility harus mask atau omit PII untuk list; detail endpoint bisa ditentukan terpisah jika diperlukan.

**Validation:**
```bash
npm run lint
npm run typecheck
```

**Codex Agent:** typescript-reviewer setelah services selesai.
**Depends on:** Task 2, Task 3
**Suggested commit:** `feat(admin): add config services`

---

### Task 5: Mount Admin Routes

**Files:**
- `[NEW] src/routes/admin/merchants.ts` — merchant, API key, webhook endpoint routes.
- `[NEW] src/routes/admin/stores.ts` — store/origin routes.
- `[NEW] src/routes/admin/courier-services.ts` — service catalog and merchant assignment routes.
- `[NEW] src/routes/admin/visibility.ts` — shipment and relay visibility routes.
- `[MODIFY] src/app.ts` — instantiate admin repositories/services dan mount `/admin/*` behind admin auth.
- `[MODIFY] src/contracts/openapi.ts` — optional: document admin API or add separate admin tag if scope remains manageable.

**Detail:**
- Use Zod parse on every request body/query.
- Use correct HTTP status: 201 create, 200 update/list, 401 auth, 404 not found, 409 conflict where appropriate.
- No DB mutation in GET.
- Keep admin routes internal; do not affect `/v1/*` merchant contract.

**Validation:**
```bash
npm run contract:check
npm run lint
npm run typecheck
npm run build
```

**Codex Agent:** security-reviewer + typescript-reviewer.
**Depends on:** Task 4
**Suggested commit:** `feat(admin): expose config routes`

---

### Task 6: Add Admin Config Smoke Script

**Files:**
- `[NEW] scripts/smoke-admin-config.ts` — non-JNE smoke create/list merchant store/origin/courier service assignment.
- `[MODIFY] package.json` — add `smoke:admin-config`.
- `[MODIFY] .env.example` — document placeholder admin token if needed, no real secrets.
- `[MODIFY] docs/SPRINT_7_ADMIN_CONFIG_PLAN.md` or implementation notes — smoke usage.

**Detail:**
- Smoke script must be non-mutating toward external courier and must not create real AWB/resi.
- It may write staging DB config rows; use timestamped slugs and safe cleanup or idempotent upsert.
- Do not print secrets/API key plaintext unless the script is explicitly for key creation; prefer not creating API keys in smoke unless needed.

**Validation:**
```bash
npm run smoke:admin-config
npm run lint
npm run typecheck
```

**Runtime note (2026-06-19):** `npm run smoke:admin-config` passed after `localhost:5433` pointed to Supabase DB `10.0.8.12:5432` and migration `20260618103000_add_admin_config_models` was applied. The script writes synthetic admin config rows only; it does not call JNE or create AWB/resi.

**Codex Agent:** none required unless DB errors appear.
**Depends on:** Task 5
**Suggested commit:** `chore(admin): add config smoke script`

---

### Task 7: Update Operational Docs and Roadmap

**Status (2026-06-19):** Done. `CLAUDE.md`, `AGENTS.md`, `docs/ROADMAP.md`, `docs/TEKNOS_ID_HANDOFF.md`, and `docs/implementation-notes.md` now record Sprint 7 completion, parent read-only boundary, tunnel/migration status, and validation evidence.

**Files:**
- `[MODIFY] CLAUDE.md` — Sprint 7 status, env/admin rules, built features.
- `[MODIFY] AGENTS.md` — coordination note for active Sprint 7 and shared-file risks.
- `[MODIFY] docs/ROADMAP.md` — Sprint 7 Done/In Progress state and next Sprint 8 dependencies.
- `[MODIFY] docs/TEKNOS_ID_HANDOFF.md` — clarify parent still consumes simplified contract.
- `[MODIFY] docs/implementation-notes.md` — migration/smoke notes.

**Detail:**
- Record migration name/date and whether applied to staging.
- Keep documentation concise, dated, and operational.
- Explicitly state parent `teknos.id` remains read-only.

**Validation:**
```bash
git diff --check
gitleaks protect --staged --no-banner
```

**Codex Agent:** reviewer optional for docs consistency.
**Depends on:** Task 1-6
**Suggested commit:** `docs(admin): document sprint 7 config mvp`

---

## File Manifest (Complete)

| Action | File | Description |
|---|---|---|
| MODIFY | `prisma/schema.prisma` | Add logistics admin config models and relations |
| NEW | `prisma/migrations/YYYYMMDDHHMMSS_add_admin_config_models/migration.sql` | Add new DB tables/indexes |
| NEW | `src/middleware/admin-auth.ts` | Admin auth middleware |
| NEW | `src/schemas/admin.ts` | Zod schemas for admin API |
| NEW | `src/repositories/admin-config.repository.ts` | Config repository layer |
| MODIFY | `src/repositories/merchant.repository.ts` | Admin merchant/API key helpers |
| MODIFY | `src/repositories/webhook.repository.ts` | Admin endpoint/relay list helpers |
| MODIFY | `src/repositories/shipment.repository.ts` | Admin shipment visibility helpers |
| NEW | `src/services/admin-config.service.ts` | Config business logic |
| NEW | `src/services/admin-api-key.service.ts` | API key admin flow |
| NEW | `src/services/admin-visibility.service.ts` | Visibility DTO mapping |
| MODIFY | `src/utils/crypto.ts` | Reuse/generate API key helpers if needed |
| NEW | `src/routes/admin/merchants.ts` | Admin merchant routes |
| NEW | `src/routes/admin/stores.ts` | Admin store/origin routes |
| NEW | `src/routes/admin/courier-services.ts` | Admin service catalog routes |
| NEW | `src/routes/admin/visibility.ts` | Admin shipment/relay routes |
| MODIFY | `src/app.ts` | Mount admin routes/services |
| MODIFY | `src/contracts/openapi.ts` | Optional admin contract update |
| NEW | `scripts/smoke-admin-config.ts` | Admin config smoke script |
| MODIFY | `package.json` | Add smoke script |
| MODIFY | `.env.example` | Placeholder admin config notes if needed |
| MODIFY | `CLAUDE.md` | Sprint/architecture/env docs |
| MODIFY | `AGENTS.md` | Coordination notes |
| MODIFY | `docs/ROADMAP.md` | Sprint status and roadmap |
| MODIFY | `docs/TEKNOS_ID_HANDOFF.md` | Parent simplified contract note |
| MODIFY | `docs/implementation-notes.md` | Migration/smoke notes |

## Shared-File Risks

- `prisma/schema.prisma` — high coordination risk; migration and repository work depend on it.
- `src/app.ts` — shared route mounting; avoid concurrent edits with webhook/API work.
- `src/contracts/openapi.ts` — coordinate if Sprint 6 contract changes continue.
- `CLAUDE.md`, `AGENTS.md`, `docs/ROADMAP.md` — docs-as-code shared by every sprint.
- Parent `C:\NEXT\teknos.id` — explicitly read-only and must not be modified in Sprint 7.

## Validation Plan

### Automated

```bash
npx prisma validate
npx prisma generate
npm run contract:check
npm run sprint6:readiness
npm run lint
npm run typecheck
npm run build
npm run smoke:admin-config
```

### Manual QA

- [ ] Create merchant/store/origin in staging admin API.
- [ ] Set one default origin and confirm older default is unset.
- [ ] Create courier service catalog entry and enable it for merchant/origin.
- [ ] List shipments and relay attempts without exposing secrets.
- [ ] Confirm parent handoff remains simple and no parent code changed.

## Security Review Checklist

- [ ] Dispatch `security-reviewer` after Task 2 and Task 5 because admin auth and mutations are sensitive.
  - Path agent: `~/.codex/agents/security-reviewer.md`
- [ ] Dispatch `database-reviewer` after Task 1 and Task 3 because schema/repository queries change.
  - Path agent: `~/.codex/agents/database-reviewer.md`
- [ ] Dispatch `typescript-reviewer` after Task 5 before marking implementation done.
  - Path agent: `~/.codex/agents/typescript-reviewer.md`
- [ ] Run staged secret scan before every commit touching env/docs/config.

## Codex Multi-Agent Notes

Task yang cocok untuk multi-agent Codex jika user mengizinkan explicit parallel agent work:

- **database-reviewer** — review schema and repository safety.
- **security-reviewer** — review admin auth, API key, webhook endpoint secret handling.
- **typescript-reviewer** — review route/service DTO correctness.

Do not spawn agents unless the user explicitly requests multi-agent/delegation in the active turn.

## Rollback Notes

- Migration adds new tables only; existing merchant/shipment data should remain intact.
- If admin routes fail in production, disable route mounting via env/feature flag or revert app deploy while leaving added tables unused.
- Do not drop new tables as rollback in production; use forward migration after data review.
- Parent `teknos.id` remains unaffected because no parent code changes are part of this plan.

## Next Step

Plan tersimpan di: `docs/superpowers/plans/2026-06-18-logistics-admin-config-mvp.md`

Setelah kamu approve plan ini, implementasi dimulai dari Task 1: schema migration.
