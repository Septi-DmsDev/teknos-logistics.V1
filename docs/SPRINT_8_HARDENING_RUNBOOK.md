# Sprint 8 Hardening Runbook

Date: 2026-06-19
Status: In progress hardening gate for `teknos-logistics`

## Scope

Sprint 8 hardens reliability and security before admin UI expansion or parent `teknos.id` integration work. Parent `teknos.id` remains read-only.

## Implemented Controls

- `GET /health`: lightweight process health check.
- `GET /ready`: database-backed readiness check.
- In-memory rate limiting for `/admin/*`, `/v1/*`, and `/webhooks/*`.
- Persistent admin mutation audit logs in `AdminAuditLog`.
- Admin audit list endpoint: `GET /admin/audit-logs`.
- Audit retention utility: `npm run audit:cleanup -- --days 90 --dry-run`.

## Environment Variables

`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_PUBLIC_MAX`, and `RATE_LIMIT_ADMIN_MAX` are server-only runtime knobs. Set max values to `0` only for controlled local testing.

Optional audit cleanup env: `ADMIN_AUDIT_RETENTION_DAYS` defaults to 90 when the cleanup script is run without `--days`.

## Validation Gate

Run before deploy or push:

```bash
npx prisma migrate status
npm run lint
npm run typecheck
npm run build
npm run contract:check
npm run sprint8:readiness
npm run smoke:admin-config
npm run audit:cleanup -- --days 90 --dry-run
gitleaks protect --no-banner
```

Security tools may also be run when installed and time permits:

```bash
npm run security:code
npm run security:fs
npm run security:npm
```

## Rollback Notes

- Rate limits can be disabled for controlled emergency testing by setting `RATE_LIMIT_PUBLIC_MAX=0` and/or `RATE_LIMIT_ADMIN_MAX=0`; do not leave disabled in production.
- If audit persistence fails, admin mutation requests still proceed and a sanitized console error is emitted.
- Do not drop `AdminAuditLog` as rollback in production; deploy a forward migration after retention/export review if the table must change.

## Follow-up

- Replace in-memory rate limiting with Redis/shared storage when running multiple app instances.
- Add persistent audit retention job scheduling in the deployment platform.
- Add operator UI for audit log filtering after core hardening is stable.
