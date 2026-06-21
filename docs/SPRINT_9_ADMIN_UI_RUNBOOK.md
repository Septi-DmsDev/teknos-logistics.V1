# Sprint 9 Admin UI Runbook

Date: 2026-06-20
Status: Completed implementation; login/setup UX refreshed 2026-06-21 and requires browser QA after deploy.

## Scope

Sprint 9 adds a minimal server-served Admin Control Center at `GET /admin-ui` inside `teknos-logistics`.

It covers:

- Dashboard health/readiness and recent operational lists.
- Merchant management, API key creation, and webhook endpoint management.
- Store and origin management per merchant.
- Courier service catalog and merchant assignment management.
- Search-assisted provider origin selection for origin mapping after the provider origin catalog is imported.
- Read-only shipments, webhook relays, and audit logs visibility.

It does not add courier credential management, shipment retry buttons, JNE booking, `generatecnote`, or real AWB/resi creation actions.

## Routes

```text
GET /admin-ui
GET /admin-ui/login
GET /admin-ui/assets/styles.css
GET /admin-ui/assets/app.js
```

The UI calls existing authenticated admin APIs under `/admin/*`. `/admin-ui/login` is an operator-friendly alias for the same Admin Control Center shell. Admin token or Supabase session token is entered in the browser and stored only in `sessionStorage` for the current browser session.

After successful login, the default first route is `#/setup` so a fresh database can be configured manually in this order: merchant, origin pickup, origin mapping, destination mapping, API key, webhook endpoint, then parent `.env.local` values.

## Required Environment

- `DATABASE_URL` must point to the target Postgres/Supabase database.
- Static-token mode: `ADMIN_JWT_SECRET` must be set server-side and entered manually into the UI token gate by an operator.
- Supabase mode: configure `ADMIN_AUTH_PROVIDER=supabase`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`; the server still validates active admin operators before allowing `/admin/*` access.
- No `NEXT_PUBLIC_` or client-visible env is required.

## Validation Gate

Run before deploy or before claiming Sprint 9 complete:

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke:admin-ui
npm run smoke:admin-config
npm run sprint8:readiness
npm run sprint9:readiness
```

Notes:

- `smoke:admin-ui` is read-oriented and checks `/admin-ui`, assets, `/health`, `/ready`, `/admin/merchants?limit=1`, and `/admin/audit-logs?limit=1`.
- `smoke:admin-config` creates smoke merchant/store/origin/courier assignment records in the configured DB; run only against an intended staging/dev database.
- Neither command calls JNE booking nor creates real AWB/resi.

## Manual QA Checklist

- Open `/admin-ui/login` or `/admin-ui` after deploy.
- Enter valid admin token; invalid token should clear the session after a `401`.
- Confirm unauthenticated users see the full login page without sidebar navigation.
- Confirm successful login lands on the guided `Setup` page.
- Confirm dashboard cards and recent lists load.
- Create/update a test merchant.
- Create an API key and confirm plaintext appears once only.
- Create a webhook endpoint and confirm the secret is not displayed after save.
- Create a store and origin; set one origin as default.
- Search JNE provider origin by code/name in the Origin mapping form and select a result to fill `Provider origin code` and `Label`.
- Create/update a MOCK courier service and assign it to a merchant/origin.
- Confirm shipments, webhook relays, and audit logs pages are read-only.
- Confirm there is no JNE booking/resi/generatecnote action in the UI.

## Rollback

Sprint 9 has no database migration. If UI causes deploy issues:

1. Disable or remove `mountAdminUiRoutes(app)` in `src/app.ts`.
2. Keep existing `/admin/*`, `/v1/*`, and `/webhooks/*` APIs intact.
3. Redeploy and run `npm run smoke:admin-config` plus `npm run sprint8:readiness`.

No parent `teknos.id` rollback is needed because Sprint 9 does not modify the parent repo.

## Provider Origin Lookup

Added 2026-06-21: Admin UI Origin mapping now calls `GET /admin/provider-origins` for a search-assisted provider origin picker. The field remains manually editable, so operators can continue setup before the catalog is imported.

JNE origin catalog import:

```bash
npm run import:jne:origins
npm run import:jne:origins:apply
```

The current JNE `list_origin.xls` support file contains `Origin code` and `Origin name` only. More granular province/city/district/postal fields are supported in the table for future provider files, but they are not present in that JNE origin source today.

## Security Notes

- Do not commit admin tokens, API key plaintext, webhook secrets, courier credentials, or `.env*` files.
- Server responses rendered into HTML are escaped by browser-side helpers.
- Long audit/relay strings are visually truncated but still inspectable via `title` attributes.
- Audit logs intentionally do not store request bodies, tokens, API key plaintext, or webhook secrets.
