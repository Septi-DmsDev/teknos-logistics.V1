# Logistics Admin Control Center Minimal — Design Spec

Date: 2026-06-19
Status: Draft for user review
Project: `teknos-logistics`

## 1. Context

`teknos-logistics` is now a standalone logistics platform for Teknos. The platform owns logistics operations, while `teknos.id` remains focused on commerce, checkout, order, payment, catalog, and customer UX.

Sprints 0-8 completed the backend foundation: merchant API, JNE/mock provider, webhook lifecycle, relay worker, admin config API, audit logs, rate limiting, health/readiness, and operational runbooks. The next bottleneck is usability: operators cannot yet manage or inspect the platform through a web UI.

## 2. Product Decision

Sprint 9 builds a minimal Admin Control Center inside `teknos-logistics`.

This does not change the ownership boundary:

- `teknos-logistics` is the source of truth for logistics operations.
- `teknos.id` must not rebuild logistics admin/config/recap modules.
- `teknos.id` should later consume only simple logistics API results and webhook updates.

## 3. Goals

- Provide an internal web UI for core logistics operations.
- Reuse existing admin APIs and backend services from Sprints 7-8.
- Make merchant, origin, courier service, shipment, webhook relay, and audit data visible.
- Keep UI minimal, operational, and safe; avoid advanced UI polish until workflows are proven.
- Preserve all current security boundaries: no secret exposure, no real JNE booking/resi creation from the UI.

## 4. Non-Goals

Sprint 9 will not build:

- Multi-courier JNT/SAP adapters.
- Real RBAC or multi-user admin accounts.
- Billing, invoice, or cost ledger.
- Advanced charts/reporting.
- Manual real courier booking or JNE `generatecnote` operation.
- Parent `teknos.id` integration or code changes.
- Complex design system or pixel-perfect UI.

## 5. Users

### Internal Logistics Operator

Needs to inspect and configure logistics data safely:

- See platform health/status.
- Manage merchants and core merchant config.
- Manage stores/origins.
- Manage courier services and merchant assignments.
- Inspect shipments and webhook relays.
- Inspect admin audit logs.

### Developer/Ops Admin

Needs quick operational verification after deploy:

- Open the app and verify dashboard loads.
- Confirm DB-backed readiness status.
- Confirm smoke data is visible.
- Confirm audit logs are visible without exposing secrets.

## 6. Information Architecture

Sprint 9 admin UI should expose these pages:

```text
/admin
/admin/merchants
/admin/merchants/:merchantId
/admin/merchants/:merchantId/stores
/admin/merchants/:merchantId/origins
/admin/courier-services
/admin/merchant-courier-services
/admin/shipments
/admin/webhook-relays
/admin/audit-logs
```

### Navigation

Primary sidebar/navigation:

- Dashboard
- Merchants
- Stores & Origins
- Courier Services
- Shipments
- Webhook Relays
- Audit Logs

## 7. Page Requirements

### 7.1 Dashboard

Purpose: quick operational overview.

Must show:

- Service name and environment hint.
- Health/readiness status.
- Counts or recent snapshots where available:
  - merchants,
  - shipments,
  - webhook relay attempts,
  - latest audit logs.
- Quick links to core admin pages.

Acceptable MVP: dashboard may fetch existing list endpoints with small limits rather than requiring a dedicated stats endpoint.

### 7.2 Merchants

Must support:

- List merchants with search and active filter.
- Create merchant.
- Edit merchant name/status.
- Open merchant detail.
- List API keys without exposing hashes/secrets.
- Create API key and display plaintext once only.
- Revoke/deactivate API key.
- List webhook endpoints.
- Create/update webhook endpoint without exposing secret after save.

### 7.3 Stores & Origins

Must support:

- List stores by merchant.
- Create/update store.
- List origins by merchant and optional store.
- Create/update origin.
- Mark one default origin per merchant using existing backend rules.

### 7.4 Courier Services

Must support:

- List courier service catalog.
- Create/update courier service catalog entries.
- Filter by courier/status.
- List merchant courier assignments.
- Enable/update merchant courier service assignment by merchant/origin.

### 7.5 Shipments

Must support read-only inspection:

- List shipments with filters from existing admin API:
  - merchant,
  - courier,
  - status,
  - external order id,
  - waybill id.
- Show core fields:
  - merchant,
  - courier,
  - status,
  - waybill,
  - service,
  - origin/destination,
  - timestamps,
  - counts for tracking/events.

No real booking action in Sprint 9.

### 7.6 Webhook Relays

Must support read-only inspection:

- List relay attempts.
- Filter by merchant, endpoint, event, status.
- Show status, attempt count, next retry, last error, endpoint URL, related event/shipment summary.

No manual retry in Sprint 9.

### 7.7 Audit Logs

Must support read-only inspection:

- List sanitized admin audit logs from `GET /admin/audit-logs`.
- Filter by method, path, and status range.
- Show method, path, status, duration, request id, IP, user agent, created time.

No request body or secret should ever be shown.

## 8. Authentication Approach

Sprint 9 uses the existing `ADMIN_JWT_SECRET` bearer-token MVP.

Recommended UI approach:

- Admin token input screen for local/staging usage.
- Store token in memory or session storage for MVP.
- Never put token in URL.
- Never log token.
- Every admin API request sends `Authorization: Bearer <token>`.
- If request returns 401, clear token and show login/token screen.

Future Sprint 15 should replace this with proper admin session/RBAC.

## 9. Frontend Architecture

Because the current app is a Hono API service, Sprint 9 should use a minimal server-served admin UI rather than adding a large frontend framework immediately.

Recommended implementation:

- Static admin HTML/CSS/JS served by Hono from internal source files.
- A small admin API client in browser JavaScript.
- Use existing `/admin/*` JSON endpoints.
- Keep components simple and file boundaries clear.

Proposed files:

```text
src/admin-ui/index.html.ts
src/admin-ui/styles.css.ts
src/admin-ui/app.js.ts
src/routes/admin-ui.ts
```

Alternative acceptable structure: static files under `public/admin` if the repo already supports static serving. Current repo does not require a new framework for Sprint 9.

## 10. Security Requirements

- Do not expose server-only env values to browser.
- Do not expose API key hashes, webhook secrets, courier credentials, or raw internal errors.
- Plaintext merchant API key may be shown only immediately after create, matching backend behavior.
- Admin token must never be stored in tracked files or logs.
- All mutations continue to go through existing server-side Zod validation.
- Admin audit logs must continue to record mutations.
- UI must not add any direct database access.
- UI must not call JNE `generatecnote` or create real AWB/resi.

## 11. API Dependencies

Sprint 9 depends on existing endpoints:

- `GET /health`
- `GET /ready`
- `GET /admin/merchants`
- `POST /admin/merchants`
- `PATCH /admin/merchants/:merchantId`
- `GET /admin/merchants/:merchantId/api-keys`
- `POST /admin/merchants/:merchantId/api-keys`
- `PATCH /admin/api-keys/:apiKeyId`
- `GET /admin/merchants/:merchantId/webhook-endpoints`
- `POST /admin/merchants/:merchantId/webhook-endpoints`
- `PATCH /admin/webhook-endpoints/:endpointId`
- `GET /admin/merchants/:merchantId/stores`
- `POST /admin/merchants/:merchantId/stores`
- `PATCH /admin/stores/:storeId`
- `GET /admin/merchants/:merchantId/origins`
- `POST /admin/merchants/:merchantId/origins`
- `PATCH /admin/origins/:originId`
- `GET /admin/courier-services`
- `POST /admin/courier-services`
- `PATCH /admin/courier-services/:serviceId`
- `GET /admin/merchants/:merchantId/courier-services`
- `PUT /admin/merchants/:merchantId/courier-services/:serviceId`
- `GET /admin/shipments`
- `GET /admin/webhook-relays`
- `GET /admin/audit-logs`

If a route is missing or mismatched, Sprint 9 should fix the backend route rather than adding client-side hacks.

## 12. Validation Plan

Automated validation:

```bash
npm run lint
npm run typecheck
npm run build
npm run contract:check
npm run sprint8:readiness
npm run smoke:admin-config
```

Manual UI validation:

- Open `/admin`.
- Enter admin token.
- Confirm dashboard loads.
- Create one synthetic merchant/store/origin using UI.
- Create/update one mock courier service using UI.
- Confirm shipment, relay, and audit pages load.
- Confirm no secret/hash appears in UI.
- Confirm no JNE booking/resi action exists.

## 13. Rollback Plan

- If UI fails, disable or remove admin UI route while keeping existing admin API intact.
- No schema migration is required for Sprint 9 if existing endpoints are sufficient.
- If a UI mutation path has a bug, keep page read-only until fixed.

## 14. Open Decisions

These are intentionally deferred unless the user decides otherwise:

- Whether admin token is stored in memory only or session storage for convenience.
- Whether Sprint 9 should include polished visual design or only functional layout.
- Whether to add a dedicated dashboard stats endpoint or compute overview from existing list endpoints.

## 15. Recommended Sprint 9 Scope

Recommended scope is a functional internal control center:

- Token login screen.
- Sidebar layout.
- Dashboard.
- Merchants page.
- Merchant detail with API keys/webhook endpoints.
- Stores/origins page.
- Courier services and assignments page.
- Read-only shipments page.
- Read-only webhook relays page.
- Read-only audit logs page.

This is enough to operate the current backend and prepare for Sprint 10 multi-courier foundation.
