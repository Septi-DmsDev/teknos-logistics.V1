# Teknos Logistics Roadmap

Date: 2026-06-18
Status: Active planning baseline
Source spec: `docs/superpowers/specs/2026-06-17-teknos-logistics-platform-design.md` in parent `teknos.id`

## Product Direction

`teknos-logistics` is a standalone logistics aggregator platform, not just a JNE adapter extraction. The platform must remain separated from `teknos.id` like the `teknos-omnichannel` nested-project pattern, with its own Git repository, deployment, database, and operational lifecycle.

Strategic direction update (2026-06-18): `teknos-logistics` should become a Biteship-like logistics platform for Teknos. `teknos.id` owns commerce; `teknos-logistics` owns logistics operations. Courier configuration, branch/store origins, service mapping, AWB/resi recap, tracking history, webhook logs, retry/dead-letter behavior, merchant relay, and logistics reporting should live here. Parent web apps should only consume a simple server-only merchant API and webhook contract.

## Execution Principles

- Keep `teknos.id` checkout and shipping flows unchanged until staging integration is proven.
- Keep `teknos.id` simple: store only shipment summary fields needed for order/customer UX, not logistics operations records.
- Keep store/branch/origin configuration and courier-specific operational data inside `teknos-logistics`.
- Build small vertical slices that can be validated independently.
- Use persistent database state for shipment lifecycle, tracking, webhook events, relay attempts, and idempotency.
- Keep mock provider usable for development and staging even when JNE credentials are unavailable.
- Treat API key auth, courier webhooks, merchant webhook relay, env/secrets, and Prisma migrations as security-sensitive surfaces.
- Never hardcode courier credentials or merchant API keys.
- Document decisions in repo docs, not only in chat.

## Sprint Plan

| Sprint | Theme | Primary Outcome | Status |
|---|---|---|---|
| Sprint 0 | Platform readiness | Repo, guardrails, Hono/Prisma/Docker bootstrap, build/lint/typecheck pass | Done |
| Sprint 1 | Database and seed MVP | Prisma migration applied, Teknos merchant seeded, local API key generated, mock rates/booking validated | Done |
| Sprint 2 | Core merchant API | Stable rates, booking, tracking endpoints with idempotent booking by merchant/order; smoke API passed | Done |
| Sprint 3 | JNE production adapter | Done - safe error mapping, per-operation config guard, timeout, redacted logging, and tariff-only JNE smoke passed with 7 rates | Done |
| Sprint 4 | Webhook ingress lifecycle | Done - migration applied, timing-safe token check, normalized event key idempotency, monotonic lifecycle, synthetic replay smoke passed | Done |
| Sprint 5 | Merchant webhook relay | Done - HMAC-signed outbound relay worker, retry/backoff/dead-letter behavior, unique relay queue index, local relay smoke passed | Done |
| Sprint 6 | `teknos.id` staging integration | In progress - OpenAPI contract, parent handoff, and `npm run sprint6:readiness` gate added; parent `teknos.id` remains read-only until separately approved | In Progress |
| Sprint 7 | Logistics admin config MVP | Done - Tasks 1-7 completed; admin config schema/routes/services/docs implemented, migration applied, full validation and `npm run smoke:admin-config` passed on 2026-06-19 | Done |
| Sprint 8 | Reliability and security hardening | Done - health/readiness, route rate limiting, persistent admin audit logs, audit visibility, cleanup utility, and runbook/readiness gate completed | Done |
| Sprint 9 | Admin Control Center minimal | Done - `/admin-ui`, dashboard, merchant/store/origin/courier config UI, read-only ops pages, smoke/readiness checks | Done |
| Sprint 10 | Multi-courier foundation | JNT/SAP skeletons, provider capability matrix, per-courier normalizers, service mapping | Planned |
| Sprint 11 | Reporting, billing, and analytics | Resi recap, volume/cost analytics, courier performance, invoices, B2B/SaaS commercialization foundation | Planned |

## Ownership Boundary

`teknos.id` should own:

- storefront, checkout, order, payment, catalog, customer UX,
- shipment summary fields needed for order display,
- server-only calls to `teknos-logistics`,
- webhook receiver endpoint and feature flag rollout.

`teknos-logistics` should own:

- courier credentials and provider configuration,
- store/branch/origin configuration,
- rate quoting, booking, AWB/resi creation, and resi recap,
- tracking history and normalized lifecycle,
- courier webhook ingestion and merchant webhook relay,
- retry/dead-letter/audit logs,
- logistics reporting, billing, and future courier-selection rules.

## Sprint 1 Definition of Done

- Prisma migration exists and applies cleanly to a local/staging Postgres database.
- Seed script creates the internal Teknos merchant without duplicate records.
- API key generation stores only SHA-256 hash and prefix; plaintext is shown once and never committed.
- `.env.example` remains placeholder-only.
- `npm run lint`, `npm run typecheck`, and `npm run build` pass.
- Documentation updated with migration/seed instructions.

## Cutover Policy

`teknos.id` must not switch production checkout/shipping to `teknos-logistics` until all are true:

1. Staging database migration and seed are complete.
2. Mock provider end-to-end flow is validated.
3. JNE staging/production credential behavior is validated without leaking secrets; tariff-only smoke passed on 2026-06-18, but real AWB booking still requires explicit operator approval.
4. Webhook ingress and merchant relay are idempotent.
5. `teknos.id` integration is behind a feature flag or config switch.
6. Rollback path to existing logistics flow is documented.

## Deferred Decisions

- JNE AWB creation: do not run `generatecnote` or create a real resi from Codex without explicit user approval and reporting first.
- Redis adoption: not required for initial MVP; revisit when retry worker/rate limiting/load requires it.
- Supabase: acceptable as managed Postgres for staging/production, but not required for local dev.
- Admin auth: JWT HttpOnly cookie planned for admin ops, not needed for Sprint 1.
- JNT/SAP real integrations: defer until JNE lifecycle and provider contract are stable.
