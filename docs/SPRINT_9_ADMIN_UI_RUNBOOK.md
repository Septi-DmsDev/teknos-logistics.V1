# Sprint 9 Admin UI Runbook

Date: 2026-06-20
Status: Completed implementation; requires browser QA after deploy.

## Scope

Sprint 9 adds a minimal server-served Admin Control Center at `GET /admin-ui` inside `teknos-logistics`.

It covers:

- Dashboard health/readiness and recent operational lists.
- Merchant management, API key creation, and webhook endpoint management.
- Store and origin management per merchant.
- Courier service catalog and merchant assignment management.
- Read-only shipments, webhook relays, and audit logs visibility.

It does not add courier credential management, shipment retry buttons, JNE booking, `generatecnote`, or real AWB/resi creation actions.

## Routes

```text
GET /admin-ui
GET /admin-ui/assets/styles.css
GET /admin-ui/assets/app.js
```

The UI calls existing authenticated admin APIs under `/admin/*`. Admin token is entered in the browser and stored only in `sessionStorage` for the current browser session.

## Required Environment

- `DATABASE_URL` must point to the target Postgres/Supabase database.
- `ADMIN_JWT_SECRET` must be set server-side and entered manually into the UI token gate by an operator.
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

- Open `/admin-ui` after deploy.
- Enter valid admin token; invalid token should clear the session after a `401`.
- Confirm dashboard cards and recent lists load.
- Create/update a test merchant.
- Create an API key and confirm plaintext appears once only.
- Create a webhook endpoint and confirm the secret is not displayed after save.
- Create a store and origin; set one origin as default.
- Create/update a MOCK courier service and assign it to a merchant/origin.
- Confirm shipments, webhook relays, and audit logs pages are read-only.
- Confirm there is no JNE booking/resi/generatecnote action in the UI.

## Rollback

Sprint 9 has no database migration. If UI causes deploy issues:

1. Disable or remove `mountAdminUiRoutes(app)` in `src/app.ts`.
2. Keep existing `/admin/*`, `/v1/*`, and `/webhooks/*` APIs intact.
3. Redeploy and run `npm run smoke:admin-config` plus `npm run sprint8:readiness`.

No parent `teknos.id` rollback is needed because Sprint 9 does not modify the parent repo.

## Security Notes

- Do not commit admin tokens, API key plaintext, webhook secrets, courier credentials, or `.env*` files.
- Server responses rendered into HTML are escaped by browser-side helpers.
- Long audit/relay strings are visually truncated but still inspectable via `title` attributes.
- Audit logs intentionally do not store request bodies, tokens, API key plaintext, or webhook secrets.