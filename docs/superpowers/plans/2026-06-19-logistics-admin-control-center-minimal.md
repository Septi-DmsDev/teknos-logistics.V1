# Logistics Admin Control Center Minimal — Implementation Plan

**Tanggal:** 2026-06-19
**Spec:** `docs/superpowers/specs/2026-06-19-logistics-admin-control-center-minimal-design.md`
**Status:** Draft

---

## Scope Summary

- Membangun Admin Control Center minimal di dalam `teknos-logistics`, bukan di parent `teknos.id`.
- Menyediakan web UI internal untuk dashboard, merchant, API key, webhook endpoint, store/origin, courier service, shipment, webhook relay, dan audit logs.
- Menggunakan admin API yang sudah ada dari Sprint 7-8; tidak menambah real JNE booking/resi action.
- Menjaga security boundary: tidak expose secrets, API key hash, webhook secret, courier credential, atau raw internal errors.
- Menambahkan smoke/readiness UI agar deploy bisa diverifikasi tanpa browser manual yang berat.

## Architecture Decision

Sprint 9 menggunakan **minimal server-served admin UI** dari Hono, bukan Next.js/React framework baru.

Alasan:

- Repo saat ini adalah Node.js + Hono API service, bukan frontend app.
- Admin UI Sprint 9 adalah operational MVP, bukan produk UI final.
- Menambah framework besar sekarang akan memperbesar surface build/deploy tanpa kebutuhan mendesak.
- UI cukup berupa HTML/CSS/vanilla TypeScript/JavaScript yang memanggil existing `/admin/*` JSON endpoints.

Target struktur:

```text
src/admin-ui/
  html.ts
  styles.ts
  script.ts
src/routes/admin-ui.ts
scripts/smoke-admin-ui.ts
docs/SPRINT_9_ADMIN_UI_RUNBOOK.md
```

Route UI:

```text
GET /admin-ui
GET /admin-ui/assets/styles.css
GET /admin-ui/assets/app.js
```

Catatan penting: existing admin API memakai `/admin/*` dan dilindungi `adminAuth`. Agar tidak bentrok dengan middleware `app.use('/admin/*', adminAuth)`, UI shell memakai prefix `/admin-ui`.

## Task Breakdown

### Task 1: Add Admin UI Shell Route

**Files:**
- `[NEW] src/routes/admin-ui.ts` — Hono route untuk serve HTML/CSS/JS admin UI.
- `[NEW] src/admin-ui/html.ts` — HTML shell untuk Admin Control Center.
- `[NEW] src/admin-ui/styles.ts` — CSS minimal operational layout.
- `[NEW] src/admin-ui/script.ts` — browser script awal dengan bootstrap UI.
- `[MODIFY] src/app.ts` — mount `mountAdminUiRoutes(app)` sebelum API route setup.

**Detail:**
- Tambahkan route `GET /admin-ui` untuk HTML shell.
- Tambahkan route `GET /admin-ui/assets/styles.css` dengan content-type `text/css`.
- Tambahkan route `GET /admin-ui/assets/app.js` dengan content-type `application/javascript`.
- HTML shell harus memiliki:
  - root element app,
  - token login panel,
  - sidebar/nav,
  - content area,
  - notification/status area.
- CSS harus minimal tapi usable:
  - responsive-ish layout,
  - table styling,
  - form controls,
  - alert/error states,
  - status badges.
- JS awal hanya menampilkan layout dan token gate; business logic detail masuk task berikutnya.
- Jangan menaruh token di HTML server-side.
- Jangan expose env server ke browser.

**Validation:**
```bash
npm run lint
npm run typecheck
npm run build
```

**Codex Agent:** typescript-reviewer optional setelah Task 1.
**Depends on:** none
**Suggested commit:** `feat(admin-ui): add control center shell`

---

### Task 2: Add Admin UI Client Foundation

**Files:**
- `[MODIFY] src/admin-ui/script.ts` — tambah state management, router, API client, token handling, render helpers.
- `[MODIFY] src/admin-ui/styles.ts` — tambah styling untuk forms, tables, cards, filters, loading/error state.

**Detail:**
- Implement browser-side state:
  - `adminToken`,
  - `currentRoute`,
  - `selectedMerchantId`,
  - `loading`,
  - `lastError`,
  - `lastSuccess`.
- Token handling MVP:
  - input token di login panel,
  - simpan di `sessionStorage` untuk convenience,
  - clear token saat logout atau response `401`,
  - token tidak pernah ditulis ke URL/log UI.
- API client helper:
  - `apiGet(path, query?)`,
  - `apiJson(method, path, body)`,
  - otomatis inject `Authorization: Bearer <token>`,
  - sanitize error display agar tidak render stack/raw object besar.
- Router/hash navigation:
  - `#/dashboard`,
  - `#/merchants`,
  - `#/merchant/:id`,
  - `#/stores-origins`,
  - `#/courier-services`,
  - `#/shipments`,
  - `#/webhook-relays`,
  - `#/audit-logs`.
- Render helpers:
  - `renderTable`,
  - `renderForm`,
  - `renderBadge`,
  - `formatDate`,
  - `escapeHtml`,
  - `showNotice`.
- Semua user-provided/server-provided string harus escaped sebelum masuk HTML.

**Validation:**
```bash
npm run lint
npm run typecheck
npm run build
```

**Codex Agent:** security-reviewer optional karena token handling dan XSS surface.
**Depends on:** Task 1
**Suggested commit:** `feat(admin-ui): add client foundation`

---

### Task 3: Implement Dashboard Page

**Files:**
- `[MODIFY] src/admin-ui/script.ts` — render dashboard dan fetch snapshot.
- `[MODIFY] src/admin-ui/styles.ts` — dashboard cards/status UI.

**Detail:**
- Dashboard fetches:
  - `GET /health` without admin token,
  - `GET /ready` without admin token,
  - `GET /admin/merchants?limit=5`,
  - `GET /admin/shipments?limit=5`,
  - `GET /admin/webhook-relays?limit=5`,
  - `GET /admin/audit-logs?limit=5`.
- Display:
  - health/readiness status cards,
  - recent merchants count/list,
  - recent shipments count/list,
  - recent relays count/list,
  - recent audit logs count/list,
  - quick links to each page.
- If readiness fails, dashboard should show DB/dependency unavailable without crashing entire UI.
- Avoid dedicated stats endpoint in Sprint 9 unless existing list endpoints are insufficient.

**Validation:**
```bash
npm run lint
npm run typecheck
npm run build
```

**Manual QA:**
- Open `/admin-ui`.
- Enter admin token.
- Confirm dashboard cards load.
- Confirm invalid token clears session on `401`.

**Codex Agent:** none required.
**Depends on:** Task 2
**Suggested commit:** `feat(admin-ui): add dashboard overview`

---

### Task 4: Implement Merchant Management UI

**Files:**
- `[MODIFY] src/admin-ui/script.ts` — merchant list/detail/API key/webhook endpoint UI.
- `[MODIFY] src/admin-ui/styles.ts` — merchant form/table layout.

**Detail:**
- Merchant list:
  - search input,
  - active filter,
  - pagination limit/offset controls,
  - table columns: slug, name, active, created/updated, actions.
- Merchant create form:
  - slug,
  - name,
  - is active.
- Merchant update form:
  - name,
  - is active.
- Merchant detail:
  - basic merchant info,
  - API key list,
  - API key create form,
  - API key deactivate/update action,
  - webhook endpoint list,
  - webhook endpoint create/update forms.
- API key plaintext behavior:
  - show plaintext only from create response,
  - place in one-time highlighted box,
  - include copy button if simple to implement,
  - never persist plaintext in UI state longer than current page lifecycle.
- Webhook endpoint secret behavior:
  - input secret only for create/update,
  - never display existing secret.
- Use existing endpoints:
  - `/admin/merchants`,
  - `/admin/merchants/:merchantId/api-keys`,
  - `/admin/api-keys/:apiKeyId`,
  - `/admin/merchants/:merchantId/webhook-endpoints`,
  - `/admin/webhook-endpoints/:endpointId`.

**Validation:**
```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:admin-config
```

**Manual QA:**
- Create synthetic merchant from UI.
- Create API key and verify plaintext appears once.
- Refresh merchant detail and verify plaintext is gone.
- Create webhook endpoint with HTTPS URL and secret.
- Confirm endpoint list does not show secret.

**Codex Agent:** security-reviewer recommended after this task.
**Depends on:** Task 3
**Suggested commit:** `feat(admin-ui): add merchant management`

---

### Task 5: Implement Store and Origin UI

**Files:**
- `[MODIFY] src/admin-ui/script.ts` — stores/origins page.
- `[MODIFY] src/admin-ui/styles.ts` — forms/table/status badges.

**Detail:**
- Page starts with merchant selector/search.
- Store list by selected merchant:
  - `GET /admin/merchants/:merchantId/stores`.
- Store create/update:
  - slug,
  - name,
  - active.
- Origin list by selected merchant and optional store:
  - `GET /admin/merchants/:merchantId/origins`,
  - optional `store_id` filter.
- Origin create/update:
  - store id,
  - code,
  - name,
  - address,
  - city,
  - province,
  - postal code,
  - phone,
  - is default,
  - active.
- Show default origin badge.
- Rely on backend transaction rule for default origin uniqueness.
- Do not add direct DB or client-side-only enforcement beyond helpful UI validation.

**Validation:**
```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:admin-config
```

**Manual QA:**
- Create store from UI.
- Create origin from UI.
- Mark origin default and confirm previous default changes via refreshed list.

**Codex Agent:** none required.
**Depends on:** Task 4
**Suggested commit:** `feat(admin-ui): add store origin management`

---

### Task 6: Implement Courier Service and Assignment UI

**Files:**
- `[MODIFY] src/admin-ui/script.ts` — courier service catalog and assignment page.
- `[MODIFY] src/admin-ui/styles.ts` — service/assignment UI.

**Detail:**
- Courier service catalog:
  - list with filters courier/status,
  - create/update service code/name/status/metadata.
- Metadata MVP:
  - textarea JSON input,
  - validate JSON client-side before submit,
  - show friendly validation error.
- Merchant courier assignment:
  - select merchant,
  - select courier service,
  - optional origin,
  - active/inactive status,
  - submit via `PUT /admin/merchants/:merchantId/courier-services/:serviceId`.
- Show existing merchant assignments:
  - service courier/code/name,
  - origin summary,
  - status,
  - created/updated.
- Do not add courier credentials UI in Sprint 9.

**Validation:**
```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:admin-config
```

**Manual QA:**
- Create/update MOCK courier service from UI.
- Assign service to merchant/origin from UI.
- Confirm assignment list refreshes.

**Codex Agent:** security-reviewer optional because JSON metadata is input surface.
**Depends on:** Task 5
**Suggested commit:** `feat(admin-ui): add courier service management`

---

### Task 7: Implement Read-Only Operations Pages

**Files:**
- `[MODIFY] src/admin-ui/script.ts` — shipments, webhook relays, audit logs pages.
- `[MODIFY] src/admin-ui/styles.ts` — read-only table/filter UI.

**Detail:**
- Shipments page:
  - filters: merchant id, status, courier, external order id, waybill id,
  - table: merchant, courier, status, waybill, service, origin/dest, weight, rate, booked/delivered/created/updated, counts.
- Webhook relays page:
  - filters: merchant id, endpoint id, event id, status,
  - table: status, attempt count, next retry, last error, endpoint URL, event summary, shipment summary.
- Audit logs page:
  - filters: method, path, status min/max,
  - table: method, path, status, duration, request id, IP, user agent, created time.
- Read-only only:
  - no retry button,
  - no shipment mutation,
  - no JNE booking/resi action.
- Long strings should truncate visually but remain inspectable via title/expanded text.

**Validation:**
```bash
npm run lint
npm run typecheck
npm run build
```

**Manual QA:**
- Confirm all three pages load with real/smoke data.
- Confirm filters update query results.
- Confirm no secret-like fields are displayed.

**Codex Agent:** security-reviewer recommended because audit/relay pages can accidentally expose sensitive data.
**Depends on:** Task 6
**Suggested commit:** `feat(admin-ui): add operations visibility pages`

---

### Task 8: Add Admin UI Smoke and Readiness Checks

**Files:**
- `[NEW] scripts/smoke-admin-ui.ts` — smoke test for admin UI shell and core API-backed pages.
- `[MODIFY] package.json` — add `smoke:admin-ui` and `sprint9:readiness` if separate from smoke.
- `[NEW] scripts/sprint9-readiness.ts` — static readiness check for UI route/assets/spec/runbook if needed.
- `[MODIFY] docs/SPRINT_9_ADMIN_UI_RUNBOOK.md` — runbook created in Task 9, or create here if preferred.

**Detail:**
- `smoke-admin-ui.ts` should:
  - load local env,
  - set fallback `ADMIN_JWT_SECRET` only for local smoke if missing,
  - import `createApp`,
  - request `/admin-ui`, `/admin-ui/assets/styles.css`, `/admin-ui/assets/app.js`,
  - verify content types/status codes,
  - request `/health` and `/ready`,
  - request at least `/admin/merchants?limit=1` and `/admin/audit-logs?limit=1` with admin token.
- Smoke must not call JNE and must not create real AWB/resi.
- If DB tunnel is unavailable, smoke should fail clearly with DB/auth message.
- `sprint9:readiness` can be static-only if smoke already covers runtime.

**Validation:**
```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:admin-ui
```

**Codex Agent:** none required.
**Depends on:** Task 7
**Suggested commit:** `chore(admin-ui): add control center smoke`

---

### Task 9: Documentation and Operational Runbook

**Files:**
- `[NEW] docs/SPRINT_9_ADMIN_UI_RUNBOOK.md` — how to run, validate, deploy, and rollback Admin Control Center.
- `[MODIFY] CLAUDE.md` — Sprint 9 status, UI route, forbidden actions reminder.
- `[MODIFY] AGENTS.md` — current coordination note and validation command updates.
- `[MODIFY] docs/ROADMAP.md` — Sprint 9 status and Sprint 10 next direction.
- `[MODIFY] docs/implementation-notes.md` — implementation notes for admin UI architecture.
- `[MODIFY] docs/TEKNOS_ID_HANDOFF.md` — reiterate parent still consumes simple contract, not admin UI.

**Detail:**
- Document UI route: `/admin-ui`.
- Document required admin token behavior.
- Document validation commands:
  - `npm run lint`,
  - `npm run typecheck`,
  - `npm run build`,
  - `npm run smoke:admin-ui`,
  - `npm run smoke:admin-config`,
  - `npm run sprint8:readiness`,
  - `npm run sprint9:readiness` if added.
- Document manual QA checklist.
- Document rollback:
  - remove/disable UI route,
  - keep admin API intact,
  - no DB rollback needed if Sprint 9 has no migration.
- Update docs concisely and avoid contradictory historical notes.

**Validation:**
```bash
git diff --check
gitleaks protect --staged --no-banner
```

**Codex Agent:** reviewer optional for docs consistency.
**Depends on:** Task 8
**Suggested commit:** `docs(admin-ui): document sprint 9 control center`

---

## File Manifest (Complete)

| Action | File | Description |
|---|---|---|
| NEW | `src/routes/admin-ui.ts` | Hono routes serving Admin Control Center HTML/CSS/JS |
| NEW | `src/admin-ui/html.ts` | HTML shell for admin UI |
| NEW | `src/admin-ui/styles.ts` | CSS for admin UI layout/forms/tables |
| NEW | `src/admin-ui/script.ts` | Browser-side app script, router, API client, page renderers |
| MODIFY | `src/app.ts` | Mount admin UI routes |
| NEW | `scripts/smoke-admin-ui.ts` | Runtime smoke for UI shell/assets/admin API access |
| NEW | `scripts/sprint9-readiness.ts` | Optional static readiness gate for Sprint 9 artifacts |
| MODIFY | `package.json` | Add `smoke:admin-ui` and optional `sprint9:readiness` scripts |
| NEW | `docs/SPRINT_9_ADMIN_UI_RUNBOOK.md` | Operational runbook for Admin Control Center |
| MODIFY | `CLAUDE.md` | Sprint 9 status and admin UI notes |
| MODIFY | `AGENTS.md` | Coordination note and validation guidance |
| MODIFY | `docs/ROADMAP.md` | Sprint 9 progress/done and Sprint 10 next |
| MODIFY | `docs/implementation-notes.md` | Admin UI architecture and validation notes |
| MODIFY | `docs/TEKNOS_ID_HANDOFF.md` | Parent boundary reminder |

## Shared-File Risks

- `src/app.ts` — shared route mounting; avoid concurrent edits with API/webhook work.
- `package.json` — shared scripts; avoid overwriting security/smoke commands.
- `CLAUDE.md`, `AGENTS.md`, `docs/ROADMAP.md`, `docs/implementation-notes.md` — shared docs-as-code.
- `src/admin-ui/script.ts` — likely large file risk; keep functions modular and avoid unrelated refactors.
- Parent `C:\NEXT\teknos.id` — explicitly read-only; do not edit parent project for Sprint 9.

## Validation Plan

### Automated

Run progressively after relevant tasks:

```bash
npm run lint
npm run typecheck
npm run build
npm run contract:check
npm run sprint8:readiness
npm run smoke:admin-config
npm run smoke:admin-ui
npm run sprint9:readiness
```

Security scan before commit/push:

```bash
gitleaks protect --staged --no-banner
```

Optional when installed/time permits:

```bash
npm run security:code
npm run security:fs
npm run security:npm
```

### Manual QA

- [ ] Open `/admin-ui`.
- [ ] Enter valid admin token.
- [ ] Dashboard loads health/readiness and recent lists.
- [ ] Invalid token returns to login/token screen.
- [ ] Merchant can be created/updated.
- [ ] API key can be created and plaintext appears once only.
- [ ] Webhook endpoint can be created without exposing saved secret.
- [ ] Store and origin can be created/updated.
- [ ] One default origin behavior is visible after refresh.
- [ ] Courier service can be created/updated.
- [ ] Merchant courier service assignment can be created/updated.
- [ ] Shipments page loads read-only.
- [ ] Webhook relays page loads read-only.
- [ ] Audit logs page loads read-only.
- [ ] No UI action can create real JNE AWB/resi.
- [ ] No secret/hash/courier credential appears in UI.

## Security Review Checklist

- [ ] Verify admin token is never put in URL, logs, docs, or committed files.
- [ ] Verify all server/API responses rendered into HTML are escaped.
- [ ] Verify API key plaintext is displayed only immediately after creation.
- [ ] Verify webhook secret is accepted as input but never displayed after save.
- [ ] Verify read-only pages do not add mutation buttons for shipment/relay/JNE booking.
- [ ] Dispatch `security-reviewer` after Task 4 and Task 7 if multi-agent is available.
- [ ] Dispatch `typescript-reviewer` or reviewer after Task 8 before marking implementation done.

## Codex Multi-Agent Notes

Potential split if explicit multi-agent work is requested:

- **Worker A:** Task 1-3 admin UI shell/foundation/dashboard.
- **Worker B:** Task 4-6 config forms and mutation pages.
- **Worker C:** Task 7-9 read-only ops pages, smoke, docs.

Write scopes must stay disjoint if parallelized:

- Worker A owns `src/routes/admin-ui.ts`, `src/admin-ui/html.ts`, base `styles.ts`, base `script.ts`.
- Worker B owns merchant/store/courier sections inside `script.ts`; coordinate because `script.ts` is shared.
- Worker C owns smoke scripts/docs and read-only ops sections.

Because `src/admin-ui/script.ts` is shared, sequential implementation is safer unless the file is split into modules first.

## Rollback Notes

- Sprint 9 should not require a database migration.
- If UI breaks deploy, remove or disable `mountAdminUiRoutes(app)` in `src/app.ts` while keeping admin API routes intact.
- If one page is unsafe, hide its navigation entry and leave backend endpoints untouched.
- If token handling is flawed, disable UI route until fixed; do not weaken admin API auth.
- No parent `teknos.id` rollback is needed because Sprint 9 does not modify parent.

## Definition of Done

Sprint 9 is done when:

- `/admin-ui` loads successfully.
- Admin token gate works.
- Dashboard loads health/readiness and recent operational lists.
- Merchant, store/origin, courier service management pages work against existing admin API.
- Shipment, webhook relay, and audit log pages load read-only.
- Smoke/readiness command passes.
- Docs reflect implementation and validation.
- No secret/hash/courier credential is exposed.
- No real JNE AWB/resi creation action exists.

## Next Step

Plan tersimpan di: `docs/superpowers/plans/2026-06-19-logistics-admin-control-center-minimal.md`

Setelah kamu approve plan ini, implementasi dimulai dari Task 1: Add Admin UI Shell Route.

